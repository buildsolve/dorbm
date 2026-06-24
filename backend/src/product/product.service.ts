import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { categoryId?: string; isActive?: boolean; includeInactive?: boolean }) {
    const where: any = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (!filters?.includeInactive) {
      where.isActive = filters?.isActive !== undefined ? filters.isActive : true;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        recipe: {
          select: {
            id: true,
            name: true,
            laborCost: true,
            overheadCost: true,
            yield: true,
            labourTimeMinutes: true,
            bakingTimeMinutes: true,
            components: {
              include: { ingredient: { select: { unitCost: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map(p => ({ ...p, ...this.calcEconomics(p) }));
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        recipe: {
          include: {
            components: {
              include: { ingredient: { select: { id: true, name: true, unit: true, unitCost: true } } },
            },
          },
        },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    return { ...p, ...this.calcEconomics(p) };
  }

  static readonly LABOUR_RATE_PER_HOUR = 20; // €/hr — skilled Konditor rate

  private calcEconomics(p: any) {
    let materialCost = 0;
    const recipeYield = Number(p.recipe?.yield || 1);
    if (p.recipe?.components) {
      materialCost = p.recipe.components.reduce(
        (sum: number, c: any) => sum + Number(c.quantity) * Number(c.ingredient?.unitCost || 0), 0
      );
      if (recipeYield > 1) materialCost = materialCost / recipeYield;
    }
    // Labour cost: time-based if recipe has labourTimeMinutes, else use product.laborCost legacy field
    const labourTimeMinutes = Number(p.recipe?.labourTimeMinutes || 0);
    const laborCostPerUnit = labourTimeMinutes > 0
      ? (labourTimeMinutes / 60) * ProductService.LABOUR_RATE_PER_HOUR / recipeYield
      : Number(p.laborCost || 0);
    const totalCost = materialCost + laborCostPerUnit + Number(p.overheadCost) + Number(p.packagingCost);
    const contributionMargin = Number(p.sellingPrice) - totalCost;
    const marginPercent = Number(p.sellingPrice) > 0 ? (contributionMargin / Number(p.sellingPrice)) * 100 : 0;
    return {
      materialCost,
      laborCostPerUnit,
      totalCost,
      contributionMargin,
      marginPercent: Math.round(marginPercent * 100) / 100,
    };
  }

  async create(dto: any) {
    const exists = await this.prisma.product.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Product code already exists');
    return this.prisma.product.create({
      data: dto,
      include: { category: true, recipe: true },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    // Strip nested relation objects — only keep scalar/FK fields
    const { recipe, category, essoCostModel, materialCost, laborCostPerUnit, totalCost, contributionMargin, marginPercent, ...data } = dto;
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, recipe: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const inProduction = await this.prisma.productionPlanLine.count({ where: { productId: id } });
    const inStorage = await this.prisma.storageRecord.count({ where: { productId: id, isActive: true } });
    if (inProduction > 0 || inStorage > 0) {
      return this.prisma.product.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.product.delete({ where: { id } });
  }

  async getTopByMargin(limit = 10) {
    const products = await this.findAll({});
    return products
      .sort((a, b) => b.contributionMargin - a.contributionMargin)
      .slice(0, limit);
  }
}
