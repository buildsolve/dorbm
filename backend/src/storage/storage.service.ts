import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JournalService } from '../journal/journal.service';

@Injectable()
export class StorageService {
  constructor(private prisma: PrismaService, private journal: JournalService) {}

  async findAll(filters?: { productId?: string; locationId?: string; includeExpired?: boolean }) {
    const where: any = { isActive: true };
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.locationId) where.locationId = filters.locationId;
    if (!filters?.includeExpired) {
      where.OR = [{ expiryDate: null }, { expiryDate: { gte: new Date() } }];
    }
    return this.prisma.storageRecord.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true, shelfLifeDays: true } },
        location: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { productionDate: 'asc' }],
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.storageRecord.findUnique({
      where: { id },
      include: {
        product: true,
        location: true,
        movements: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!r) throw new NotFoundException('Storage record not found');
    return r;
  }

  async create(dto: any) {
    const locationId = dto.locationId && dto.locationId !== '' ? dto.locationId : undefined;
    const weeklyTaskId = dto.weeklyTaskId && dto.weeklyTaskId !== '' ? dto.weeklyTaskId : undefined;
    const unitCost = dto.unitCost != null && !isNaN(Number(dto.unitCost)) ? Number(dto.unitCost) : undefined;
    const record = await this.prisma.storageRecord.create({
      data: {
        ...dto,
        locationId,
        weeklyTaskId,
        unitCost,
        productionDate: dto.productionDate ? new Date(dto.productionDate) : new Date(),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
      include: { product: true, location: true },
    });
    this.journal.log({
      status: 'ELG',
      productId: record.productId,
      productName: record.product?.name,
      batchNumber: record.batchNumber,
      quantity: Number(record.quantity),
      notes: `Eingelagert${record.location ? ' in ' + record.location.name : ''}`,
      refType: 'STORAGE_RECORD',
      refId: record.id,
    }).catch(() => {});
    return record;
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { product, location, movements, id: _id, createdAt, updatedAt, isActive, reservedQty, ...rest } = dto;
    const locationId = rest.locationId && rest.locationId !== '' ? rest.locationId : null;
    const unitCost = rest.unitCost != null && !isNaN(Number(rest.unitCost)) ? Number(rest.unitCost) : undefined;
    return this.prisma.storageRecord.update({
      where: { id },
      data: {
        ...rest,
        locationId,
        unitCost,
        productionDate: rest.productionDate ? new Date(rest.productionDate) : undefined,
        expiryDate: rest.expiryDate ? new Date(rest.expiryDate) : null,
      },
      include: { product: true, location: true },
    });
  }

  async recordMovement(id: string, dto: { type: string; quantity: number; notes?: string; referenceId?: string }) {
    const record = await this.findOne(id);
    if (dto.type === 'OUT' || dto.type === 'TRANSFER') {
      const available = Number(record.quantity) - Number(record.reservedQty);
      if (dto.quantity > available) throw new BadRequestException('Insufficient available stock');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.storageMovement.create({
        data: {
          storageRecordId: id,
          type: dto.type as any,
          quantity: dto.quantity,
          notes: dto.notes,
          referenceId: dto.referenceId,
        },
      });

      const delta = dto.type === 'IN' ? dto.quantity : -dto.quantity;
      const updated = await tx.storageRecord.update({
        where: { id },
        data: { quantity: { increment: delta } },
        include: { product: true },
      });

      if (Number(updated.quantity) <= 0) {
        await tx.storageRecord.update({ where: { id }, data: { isActive: false } });
      }

      return updated;
    }).then(updated => {
      if (dto.type === 'OUT' && dto.notes === 'Verkauft') {
        this.journal.log({
          status: 'VKF',
          productId: updated.productId,
          productName: updated.product?.name,
          batchNumber: record.batchNumber,
          quantity: dto.quantity,
          notes: `Verkauft: ${dto.quantity} Stk`,
          refType: 'STORAGE_MOVEMENT',
          refId: id,
        }).catch(() => {});
      }
      return updated;
    });
  }

  async getFIFOStock(productId: string) {
    return this.prisma.storageRecord.findMany({
      where: {
        productId,
        isActive: true,
        quantity: { gt: 0 },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
      orderBy: [{ expiryDate: 'asc' }, { productionDate: 'asc' }],
      include: { location: true },
    });
  }

  async getExpiringStock(days = 3) {
    const cutoff = new Date(Date.now() + days * 86400000);
    return this.prisma.storageRecord.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      include: {
        product: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getStockSummary() {
    const records = await this.prisma.storageRecord.findMany({
      where: { isActive: true, quantity: { gt: 0 } },
      include: { product: { select: { id: true, name: true, code: true } } },
    });

    const summary = new Map<string, { productId: string; name: string; code: string; totalQty: number; batches: number }>();
    for (const r of records) {
      const key = r.productId;
      const existing = summary.get(key);
      if (existing) {
        existing.totalQty += Number(r.quantity);
        existing.batches++;
      } else {
        summary.set(key, {
          productId: r.productId,
          name: r.product.name,
          code: r.product.code,
          totalQty: Number(r.quantity),
          batches: 1,
        });
      }
    }

    return Array.from(summary.values());
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.storageRecord.update({ where: { id }, data: { isActive: false } });
  }
}
