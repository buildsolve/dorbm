import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JournalService } from '../journal/journal.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService, private journal: JournalService) {}

  async findAll(filters?: { ingredientId?: string; type?: string; from?: Date; to?: Date }) {
    const where: any = {};
    if (filters?.ingredientId) where.ingredientId = filters.ingredientId;
    if (filters?.type) where.type = filters.type;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    return this.prisma.stockTransaction.findMany({
      where,
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.stockTransaction.findUnique({
      where: { id },
      include: { ingredient: true, supplier: true },
    });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  async stockIn(dto: { ingredientId: string; quantity: number; unitCost?: number; batchNumber?: string; expiryDate?: string; supplierId?: string; notes?: string }) {
    const ing = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ing) throw new NotFoundException('Ingredient not found');
    if (dto.quantity <= 0) throw new BadRequestException('Quantity must be positive');

    const [tx] = await this.prisma.$transaction([
      this.prisma.stockTransaction.create({
        data: {
          ingredientId: dto.ingredientId,
          type: 'STOCK_IN',
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          batchNumber: dto.batchNumber,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          supplierId: dto.supplierId,
          notes: dto.notes,
        },
        include: { ingredient: true },
      }),
      this.prisma.ingredient.update({
        where: { id: dto.ingredientId },
        data: { currentStock: { increment: dto.quantity } },
      }),
    ]);
    this.journal.log({
      status: 'ING',
      productName: ing.name,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      notes: `Zutaten eingelagert: ${ing.name} (${dto.quantity} ${ing.unit})`,
      refType: 'STOCK_TRANSACTION',
      refId: tx.id,
    }).catch(() => {});
    return tx;
  }

  async stockOut(dto: { ingredientId: string; quantity: number; notes?: string; referenceId?: string; referenceType?: string }) {
    const ing = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ing) throw new NotFoundException('Ingredient not found');
    if (Number(ing.currentStock) < dto.quantity) throw new BadRequestException('Insufficient stock');

    const [tx] = await this.prisma.$transaction([
      this.prisma.stockTransaction.create({
        data: {
          ingredientId: dto.ingredientId,
          type: 'STOCK_OUT',
          quantity: dto.quantity,
          notes: dto.notes,
          referenceId: dto.referenceId,
          referenceType: dto.referenceType,
        },
        include: { ingredient: true },
      }),
      this.prisma.ingredient.update({
        where: { id: dto.ingredientId },
        data: { currentStock: { decrement: dto.quantity } },
      }),
    ]);
    return tx;
  }

  async recordWastage(dto: { ingredientId: string; quantity: number; notes?: string; type?: 'WASTAGE' | 'SPOILAGE' }) {
    const ing = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ing) throw new NotFoundException('Ingredient not found');

    const txType = dto.type === 'SPOILAGE' ? 'SPOILAGE' : 'WASTAGE';
    const [tx] = await this.prisma.$transaction([
      this.prisma.stockTransaction.create({
        data: { ingredientId: dto.ingredientId, type: txType, quantity: dto.quantity, notes: dto.notes },
        include: { ingredient: true },
      }),
      this.prisma.ingredient.update({
        where: { id: dto.ingredientId },
        data: { currentStock: { decrement: dto.quantity } },
      }),
    ]);
    return tx;
  }

  async getLowStockAlerts() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, currentStock: true, reorderLevel: true, unit: true },
    });
    return ingredients.filter(i => Number(i.currentStock) <= Number(i.reorderLevel));
  }
}
