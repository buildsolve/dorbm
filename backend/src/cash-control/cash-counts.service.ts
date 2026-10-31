import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CashControlSettingsService } from './cash-control-settings.service';
import { CashDepositsService } from './cash-deposits.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

const DETAIL_INCLUDE = {
  employee: { select: { id: true, name: true } },
  denominationCounts: true,
  withdrawals: { orderBy: { takenAt: 'asc' as const } },
  coinRollLines: true,
};

function parseBusinessDate(dateStr: string): Date {
  if (!dateStr) throw new BadRequestException('businessDate is required');
  return new Date(`${dateStr}T00:00:00.000Z`);
}

@Injectable()
export class CashCountsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: CashControlSettingsService,
    private depositsService: CashDepositsService,
  ) {}

  /**
   * Deposits (Einzahlungen) can happen before a count exists, while it's still an open draft,
   * or after it's signed — so expectedAmount is always computed live against whatever deposits
   * have landed since the baseline (the prior submitted count's signedAt), not frozen at creation.
   */
  private async computeLive(count: {
    openingBalance: number;
    openingBalanceSince: Date | null;
    posCashSales: number;
    countedAmount: number;
    withdrawals: { amount: number }[];
  }) {
    const withdrawalsTotal = round2(count.withdrawals.reduce((sum, w) => sum + w.amount, 0));
    const depositsTotal = await this.depositsService.totalSince(count.openingBalanceSince);
    const expectedAmount = round2(count.openingBalance + count.posCashSales - withdrawalsTotal - depositsTotal);
    const difference = round2(expectedAmount - count.countedAmount);
    return { withdrawalsTotal, depositsTotal, expectedAmount, difference };
  }

  /** Recomputes a DRAFT's live totals and persists them if anything changed. No-op for SUBMITTED. */
  private async syncLive(count: any) {
    if (count.status !== 'DRAFT') return count;
    const live = await this.computeLive(count);
    if (
      live.withdrawalsTotal === count.withdrawalsTotal &&
      live.depositsTotal === count.depositsTotal &&
      live.expectedAmount === count.expectedAmount &&
      live.difference === count.difference
    ) {
      return count;
    }
    return this.prisma.cashCount.update({ where: { id: count.id }, data: live, include: DETAIL_INCLUDE });
  }

  async getByDate(dateStr: string) {
    const businessDate = parseBusinessDate(dateStr);
    const count = await this.prisma.cashCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
    if (!count) return null;
    return this.syncLive(count);
  }

  async createOrGet(dto: { businessDate: string; employeeId: string }, createdByUserId?: string) {
    const businessDate = parseBusinessDate(dto.businessDate);

    const existing = await this.prisma.cashCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
    if (existing) {
      if (existing.status === 'SUBMITTED') {
        throw new ConflictException('A cash count has already been submitted for this date');
      }
      return this.syncLive(existing);
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const previous = await this.prisma.cashCount.findFirst({
      where: { businessDate: { lt: businessDate }, status: 'SUBMITTED' },
      orderBy: { businessDate: 'desc' },
    });
    const settings = await this.settingsService.get();
    const openingBalance = previous ? previous.countedAmount : settings.initialOpeningBalance;
    const openingBalanceSince = previous ? previous.signedAt : null;

    const live = await this.computeLive({ openingBalance, openingBalanceSince, posCashSales: 0, countedAmount: 0, withdrawals: [] });

    return this.prisma.cashCount.create({
      data: {
        businessDate,
        employeeId: dto.employeeId,
        openingBalance,
        openingBalanceSince,
        createdByUserId,
        ...live,
      },
      include: DETAIL_INCLUDE,
    });
  }

  private async requireDraft(id: string) {
    const count = await this.prisma.cashCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('Cash count not found');
    if (count.status !== 'DRAFT') throw new BadRequestException('Cash count is already submitted and can no longer be edited');
    return count;
  }

  private async recomputeAndSave(id: string, extra: { posCashSales?: number; countedAmount?: number; reason?: string; employeeId?: string; coinRollTotal?: number } = {}) {
    const count = await this.prisma.cashCount.findUnique({ where: { id }, include: { withdrawals: true } });
    if (!count) throw new NotFoundException('Cash count not found');

    const posCashSales = extra.posCashSales !== undefined ? round2(Number(extra.posCashSales)) : count.posCashSales;
    const countedAmount = extra.countedAmount !== undefined ? round2(Number(extra.countedAmount)) : count.countedAmount;
    const live = await this.computeLive({ ...count, posCashSales, countedAmount });

    return this.prisma.cashCount.update({
      where: { id },
      data: {
        posCashSales,
        countedAmount,
        ...live,
        ...(extra.reason !== undefined && { reason: extra.reason }),
        ...(extra.employeeId !== undefined && { employeeId: extra.employeeId }),
        ...(extra.coinRollTotal !== undefined && { coinRollTotal: extra.coinRollTotal }),
      },
      include: DETAIL_INCLUDE,
    });
  }

  async patch(id: string, dto: {
    posCashSales?: number;
    denominationCounts?: { denomination: number; kind: string; quantity: number }[];
    coinRollLines?: { denomination: number; coinsPerRoll: number; rollQuantity: number }[];
    reason?: string;
    employeeId?: string;
  }) {
    await this.requireDraft(id);

    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) throw new NotFoundException('Employee not found');
    }

    let countedAmount: number | undefined;
    if (dto.denominationCounts) {
      await this.prisma.denominationCount.deleteMany({ where: { cashCountId: id } });
      countedAmount = round2(
        dto.denominationCounts.reduce((sum, d) => sum + round2(d.denomination * d.quantity), 0),
      );
      if (dto.denominationCounts.length) {
        await this.prisma.denominationCount.createMany({
          data: dto.denominationCounts.map((d) => ({
            cashCountId: id,
            denomination: d.denomination,
            kind: d.kind,
            quantity: d.quantity,
            subtotal: round2(d.denomination * d.quantity),
          })),
        });
      }
    }

    let coinRollTotal: number | undefined;
    if (dto.coinRollLines) {
      await this.prisma.coinRollLine.deleteMany({ where: { cashCountId: id } });
      coinRollTotal = round2(
        dto.coinRollLines.reduce((sum, r) => sum + round2(r.denomination * r.coinsPerRoll * r.rollQuantity), 0),
      );
      if (dto.coinRollLines.length) {
        await this.prisma.coinRollLine.createMany({
          data: dto.coinRollLines.map((r) => ({
            cashCountId: id,
            denomination: r.denomination,
            coinsPerRoll: r.coinsPerRoll,
            rollQuantity: r.rollQuantity,
            subtotal: round2(r.denomination * r.coinsPerRoll * r.rollQuantity),
          })),
        });
      }
    }

    return this.recomputeAndSave(id, { posCashSales: dto.posCashSales, countedAmount, reason: dto.reason, employeeId: dto.employeeId, coinRollTotal });
  }

  async addWithdrawal(id: string, dto: { amount: number; purpose: string }) {
    await this.requireDraft(id);
    if (!dto.purpose?.trim()) throw new BadRequestException('purpose is required for a withdrawal');
    await this.prisma.cashWithdrawal.create({
      data: { cashCountId: id, amount: round2(Number(dto.amount)), purpose: dto.purpose.trim() },
    });
    return this.recomputeAndSave(id);
  }

  async removeWithdrawal(id: string, withdrawalId: string) {
    await this.requireDraft(id);
    const withdrawal = await this.prisma.cashWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.cashCountId !== id) throw new NotFoundException('Withdrawal not found');
    await this.prisma.cashWithdrawal.delete({ where: { id: withdrawalId } });
    return this.recomputeAndSave(id);
  }

  async sign(id: string, dto: { signatureImage: string }) {
    await this.requireDraft(id);
    if (!dto.signatureImage) throw new BadRequestException('signatureImage is required');

    // Re-sync first — a deposit may have landed since the last save/patch.
    const fresh = await this.prisma.cashCount.findUnique({ where: { id }, include: { withdrawals: true } });
    const count = await this.syncLive(fresh);

    const settings = await this.settingsService.get();
    const isDiscrepant = Math.abs(count.difference) > settings.discrepancyThreshold;
    if (isDiscrepant && !count.reason?.trim()) {
      throw new BadRequestException('A reason is required for the Kassendifferenz before signing');
    }

    return this.prisma.cashCount.update({
      where: { id },
      data: { signatureImage: dto.signatureImage, signedAt: new Date(), status: 'SUBMITTED' },
      include: DETAIL_INCLUDE,
    });
  }

  async list(filters: { from?: string; to?: string; status?: string }) {
    const where: any = {};
    if (filters.from || filters.to) {
      where.businessDate = {};
      if (filters.from) where.businessDate.gte = parseBusinessDate(filters.from);
      if (filters.to) where.businessDate.lte = parseBusinessDate(filters.to);
    }
    if (filters.status) where.status = filters.status;
    return this.prisma.cashCount.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { businessDate: 'desc' },
    });
  }

  async getById(id: string) {
    const count = await this.prisma.cashCount.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!count) throw new NotFoundException('Cash count not found');
    return this.syncLive(count);
  }

  async remove(id: string) {
    const count = await this.prisma.cashCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('Cash count not found');
    await this.prisma.cashCount.delete({ where: { id } });
    return { deleted: true };
  }

  async summary(filters: { from?: string; to?: string }) {
    const counts = await this.list(filters);
    const submitted = counts.filter((c) => c.status === 'SUBMITTED');
    const avgAbsDifference = submitted.length
      ? round2(submitted.reduce((sum, c) => sum + Math.abs(c.difference), 0) / submitted.length)
      : 0;
    return {
      counts: counts.map((c) => ({
        id: c.id,
        businessDate: c.businessDate,
        employee: c.employee,
        expectedAmount: c.expectedAmount,
        countedAmount: c.countedAmount,
        difference: c.difference,
        status: c.status,
      })),
      totalSubmitted: submitted.length,
      avgAbsDifference,
    };
  }
}
