import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CashControlSettingsService } from './cash-control-settings.service';
import { CashDepositsService } from './cash-deposits.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

const DETAIL_INCLUDE = {
  employee: { select: { id: true, name: true } },
  denominationCounts: true,
  withdrawals: { orderBy: { takenAt: 'asc' as const } },
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

  async getByDate(dateStr: string) {
    const businessDate = parseBusinessDate(dateStr);
    return this.prisma.cashCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
  }

  async createOrGet(dto: { businessDate: string; employeeId: string }, createdByUserId?: string) {
    const businessDate = parseBusinessDate(dto.businessDate);

    const existing = await this.prisma.cashCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
    if (existing) {
      if (existing.status === 'SUBMITTED') {
        throw new ConflictException('A cash count has already been submitted for this date');
      }
      return existing;
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const previous = await this.prisma.cashCount.findFirst({
      where: { businessDate: { lt: businessDate }, status: 'SUBMITTED' },
      orderBy: { businessDate: 'desc' },
    });
    const settings = await this.settingsService.get();
    // Deposits (Einzahlungen) can happen right after a count is signed, or days later — either
    // way, only deposits made *after* the last verified count's sign-off reduce today's float.
    const depositsSince = await this.depositsService.totalSince(previous ? previous.signedAt : null);
    const openingBalance = round2((previous ? previous.countedAmount : settings.initialOpeningBalance) - depositsSince);

    return this.prisma.cashCount.create({
      data: {
        businessDate,
        employeeId: dto.employeeId,
        openingBalance,
        expectedAmount: openingBalance,
        createdByUserId,
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

  private async recomputeAndSave(id: string, extra: { posCashSales?: number; countedAmount?: number; reason?: string; employeeId?: string } = {}) {
    const count = await this.prisma.cashCount.findUnique({ where: { id }, include: { withdrawals: true } });
    if (!count) throw new NotFoundException('Cash count not found');

    const posCashSales = extra.posCashSales !== undefined ? round2(Number(extra.posCashSales)) : count.posCashSales;
    const countedAmount = extra.countedAmount !== undefined ? round2(Number(extra.countedAmount)) : count.countedAmount;
    const withdrawalsTotal = round2(count.withdrawals.reduce((sum, w) => sum + w.amount, 0));
    const expectedAmount = round2(count.openingBalance + posCashSales - withdrawalsTotal);
    const difference = round2(countedAmount - expectedAmount);

    return this.prisma.cashCount.update({
      where: { id },
      data: {
        posCashSales,
        countedAmount,
        withdrawalsTotal,
        expectedAmount,
        difference,
        ...(extra.reason !== undefined && { reason: extra.reason }),
        ...(extra.employeeId !== undefined && { employeeId: extra.employeeId }),
      },
      include: DETAIL_INCLUDE,
    });
  }

  async patch(id: string, dto: { posCashSales?: number; denominationCounts?: { denomination: number; kind: string; quantity: number }[]; reason?: string; employeeId?: string }) {
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

    return this.recomputeAndSave(id, { posCashSales: dto.posCashSales, countedAmount, reason: dto.reason, employeeId: dto.employeeId });
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
    const count = await this.requireDraft(id);
    if (!dto.signatureImage) throw new BadRequestException('signatureImage is required');

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
    return count;
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
