import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductionBatchService {
  constructor(private prisma: PrismaService) {}

  async findAll(planId?: string) {
    return this.prisma.productionBatch.findMany({
      where: planId ? { planId } : {},
      include: {
        ingredientUsages: true,
        plan: { select: { id: true, planDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const b = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: { ingredientUsages: true, plan: true },
    });
    if (!b) throw new NotFoundException('Batch not found');
    return b;
  }

  async create(dto: any) {
    return this.prisma.productionBatch.create({
      data: {
        ...dto,
        batchNumber: dto.batchNumber || `BATCH-${Date.now()}`,
      },
    });
  }

  async startBatch(id: string) {
    const batch = await this.findOne(id);
    if (batch.status !== 'PLANNED') throw new BadRequestException('Batch must be in PLANNED status');
    return this.prisma.productionBatch.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async completeBatch(id: string, dto: { actualQty: number; wastageQty?: number; notes?: string; ingredientUsages?: Array<{ ingredientId: string; plannedQty: number; actualQty: number }> }) {
    const batch = await this.findOne(id);
    if (batch.status !== 'IN_PROGRESS') throw new BadRequestException('Batch must be in IN_PROGRESS status');

    const yieldPercent = dto.wastageQty
      ? ((dto.actualQty / (dto.actualQty + dto.wastageQty)) * 100)
      : 100;

    return this.prisma.$transaction(async (tx) => {
      // Update batch
      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualQty: dto.actualQty,
          wastageQty: dto.wastageQty || 0,
          yieldPercent,
          completedAt: new Date(),
          notes: dto.notes,
        },
      });

      // Record ingredient usages and deduct stock
      if (dto.ingredientUsages?.length) {
        for (const usage of dto.ingredientUsages) {
          await tx.ingredientUsage.create({
            data: {
              batchId: id,
              ingredientId: usage.ingredientId,
              plannedQty: usage.plannedQty,
              actualQty: usage.actualQty,
            },
          });
          await tx.ingredient.update({
            where: { id: usage.ingredientId },
            data: { currentStock: { decrement: usage.actualQty } },
          });
          await tx.stockTransaction.create({
            data: {
              ingredientId: usage.ingredientId,
              type: 'PRODUCTION_USE',
              quantity: usage.actualQty,
              referenceId: id,
              referenceType: 'PRODUCTION_BATCH',
              notes: `Used in batch ${batch.batchNumber}`,
            },
          });
        }
      }

      // Create storage record for finished goods
      if (batch.productId && dto.actualQty > 0) {
        await tx.storageRecord.create({
          data: {
            productId: batch.productId,
            batchNumber: batch.batchNumber,
            quantity: dto.actualQty,
            productionDate: new Date(),
          },
        });
      }

      return updated;
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.productionBatch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const batch = await this.findOne(id);
    if (batch.status === 'IN_PROGRESS') throw new BadRequestException('Cannot delete in-progress batch');
    await this.prisma.ingredientUsage.deleteMany({ where: { batchId: id } });
    return this.prisma.productionBatch.delete({ where: { id } });
  }
}
