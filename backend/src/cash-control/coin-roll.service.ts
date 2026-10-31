import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

const DETAIL_INCLUDE = {
  employee: { select: { id: true, name: true } },
  lines: true,
};

function parseBusinessDate(dateStr: string): Date {
  if (!dateStr) throw new BadRequestException('businessDate is required');
  return new Date(`${dateStr}T00:00:00.000Z`);
}

@Injectable()
export class CoinRollService {
  constructor(private prisma: PrismaService) {}

  async getByDate(dateStr: string) {
    const businessDate = parseBusinessDate(dateStr);
    return this.prisma.coinRollCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
  }

  async createOrGet(dto: { businessDate: string; employeeId: string }, createdByUserId?: string) {
    const businessDate = parseBusinessDate(dto.businessDate);

    const existing = await this.prisma.coinRollCount.findUnique({ where: { businessDate }, include: DETAIL_INCLUDE });
    if (existing) {
      if (existing.status === 'SUBMITTED') {
        throw new ConflictException('A coin roll count has already been submitted for this date');
      }
      return existing;
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.coinRollCount.create({
      data: { businessDate, employeeId: dto.employeeId, createdByUserId },
      include: DETAIL_INCLUDE,
    });
  }

  private async requireDraft(id: string) {
    const count = await this.prisma.coinRollCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('Coin roll count not found');
    if (count.status !== 'DRAFT') throw new BadRequestException('Coin roll count is already submitted and can no longer be edited');
    return count;
  }

  async patch(id: string, dto: { lines?: { denomination: number; coinsPerRoll: number; rollQuantity: number }[]; employeeId?: string }) {
    await this.requireDraft(id);

    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) throw new NotFoundException('Employee not found');
    }

    let totalAmount: number | undefined;
    if (dto.lines) {
      await this.prisma.coinRollLine.deleteMany({ where: { coinRollCountId: id } });
      totalAmount = round2(dto.lines.reduce((sum, l) => sum + round2(l.denomination * l.coinsPerRoll * l.rollQuantity), 0));
      if (dto.lines.length) {
        await this.prisma.coinRollLine.createMany({
          data: dto.lines.map((l) => ({
            coinRollCountId: id,
            denomination: l.denomination,
            coinsPerRoll: l.coinsPerRoll,
            rollQuantity: l.rollQuantity,
            subtotal: round2(l.denomination * l.coinsPerRoll * l.rollQuantity),
          })),
        });
      }
    }

    return this.prisma.coinRollCount.update({
      where: { id },
      data: {
        ...(totalAmount !== undefined && { totalAmount }),
        ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
      },
      include: DETAIL_INCLUDE,
    });
  }

  async sign(id: string, dto: { signatureImage: string }) {
    await this.requireDraft(id);
    if (!dto.signatureImage) throw new BadRequestException('signatureImage is required');

    return this.prisma.coinRollCount.update({
      where: { id },
      data: { signatureImage: dto.signatureImage, signedAt: new Date(), status: 'SUBMITTED' },
      include: DETAIL_INCLUDE,
    });
  }

  async list(filters: { from?: string; to?: string }) {
    const where: any = {};
    if (filters.from || filters.to) {
      where.businessDate = {};
      if (filters.from) where.businessDate.gte = parseBusinessDate(filters.from);
      if (filters.to) where.businessDate.lte = parseBusinessDate(filters.to);
    }
    return this.prisma.coinRollCount.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { businessDate: 'desc' },
    });
  }

  async getById(id: string) {
    const count = await this.prisma.coinRollCount.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!count) throw new NotFoundException('Coin roll count not found');
    return count;
  }

  async remove(id: string) {
    const count = await this.prisma.coinRollCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('Coin roll count not found');
    await this.prisma.coinRollCount.delete({ where: { id } });
    return { deleted: true };
  }
}
