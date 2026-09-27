import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CashDepositsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { amount: number; note?: string; depositedAt?: string }, createdByUserId?: string) {
    if (!dto.amount || dto.amount <= 0) throw new BadRequestException('amount must be positive');
    return this.prisma.cashDeposit.create({
      data: {
        amount: round2(Number(dto.amount)),
        note: dto.note?.trim() || null,
        depositedAt: dto.depositedAt ? new Date(dto.depositedAt) : undefined,
        createdByUserId,
      },
    });
  }

  async list(filters: { from?: string; to?: string } = {}) {
    const where: any = {};
    if (filters.from || filters.to) {
      where.depositedAt = {};
      if (filters.from) where.depositedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
      // depositedAt carries a real time-of-day, so "to" must cover the whole calendar day.
      if (filters.to) where.depositedAt.lt = new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 86400000);
    }
    return this.prisma.cashDeposit.findMany({ where, orderBy: { depositedAt: 'desc' } });
  }

  async remove(id: string) {
    const deposit = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    await this.prisma.cashDeposit.delete({ where: { id } });
    return { deleted: true };
  }

  /** Sum of deposits recorded after the given timestamp (or all-time if none given). */
  async totalSince(since: Date | null) {
    const result = await this.prisma.cashDeposit.aggregate({
      _sum: { amount: true },
      where: since ? { depositedAt: { gt: since } } : undefined,
    });
    return round2(result._sum.amount || 0);
  }
}
