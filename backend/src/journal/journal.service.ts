import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type JournalStatus = 'ING' | 'PLN' | 'BCK' | 'BRT' | 'ELG' | 'VKF';

export interface JournalLogDto {
  status: JournalStatus;
  productId?: string;
  productName?: string;
  batchNumber?: string;
  quantity?: number;
  performedBy?: string;
  notes?: string;
  refType?: string;
  refId?: string;
}

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async log(dto: JournalLogDto) {
    return this.prisma.businessJournalEntry.create({ data: dto });
  }

  async findAll(params: {
    status?: string;
    productId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.productId) where.productId = params.productId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const entries = await this.prisma.businessJournalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 200,
    });

    const statusOrder: JournalStatus[] = ['ING', 'PLN', 'BCK', 'BRT', 'ELG', 'VKF'];
    const counts: Record<string, number> = {};
    for (const s of statusOrder) counts[s] = 0;
    for (const e of entries) {
      if (counts[e.status] !== undefined) counts[e.status]++;
    }

    return { entries, counts };
  }
}
