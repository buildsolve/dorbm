import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const recipes = await this.prisma.recipe.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        components: {
          include: { ingredient: { select: { id: true, name: true, unit: true, unitCost: true } } },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    return recipes.map(r => ({ ...r, totalMaterialCost: this.calcMaterialCost(r.components) }));
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        components: {
          include: { ingredient: { select: { id: true, name: true, unit: true, unitCost: true, isActive: true } } },
        },
        products: { select: { id: true, name: true, code: true } },
        recipeVersions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    const totalMaterialCost = this.calcMaterialCost(recipe.components);
    return { ...recipe, totalMaterialCost };
  }

  private calcMaterialCost(components: any[]) {
    return components.reduce((sum, c) => sum + Number(c.quantity) * Number(c.ingredient?.unitCost || 0), 0);
  }

  async create(dto: { code: string; name: string; description?: string; yield: number; yieldUnit?: string; laborCost?: number; overheadCost?: number; components?: Array<{ ingredientId: string; quantity: number; notes?: string }> }) {
    const exists = await this.prisma.recipe.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Recipe code already exists');

    const { components, ...recipeData } = dto;
    const recipe = await this.prisma.recipe.create({
      data: {
        ...recipeData,
        components: components ? { create: components } : undefined,
      },
      include: {
        components: { include: { ingredient: true } },
      },
    });
    await this.saveVersion(recipe.id, recipe.version, recipe);
    return recipe;
  }

  async update(id: string, dto: any) {
    const existing = await this.findOne(id);
    const { components, products, recipeVersions, _count, totalMaterialCost, ...recipeData } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (components !== undefined) {
        await tx.recipeComponent.deleteMany({ where: { recipeId: id } });
        if (components.length > 0) {
          const rows = components.map((c: any) => ({
            ingredientId: c.ingredientId,
            quantity: c.quantity,
            notes: c.notes ?? null,
            recipeId: id,
          }));
          await tx.recipeComponent.createMany({ data: rows });
        }
      }
      return tx.recipe.update({
        where: { id },
        data: { ...recipeData, version: { increment: 1 } },
        include: { components: { include: { ingredient: true } } },
      });
    });

    await this.saveVersion(id, updated.version, updated);
    return updated;
  }

  private async saveVersion(recipeId: string, version: number, snapshot: any) {
    await this.prisma.recipeVersion.create({
      data: { recipeId, version, snapshot: JSON.stringify(snapshot) },
    });
  }

  async remove(id: string) {
    const recipe = await this.findOne(id);
    const inProducts = await this.prisma.product.count({ where: { recipeId: id } });
    if (inProducts > 0) {
      return this.prisma.recipe.update({ where: { id }, data: { isActive: false } });
    }
    await this.prisma.recipeComponent.deleteMany({ where: { recipeId: id } });
    return this.prisma.recipe.delete({ where: { id } });
  }

  async getVersionHistory(id: string) {
    await this.findOne(id);
    return this.prisma.recipeVersion.findMany({
      where: { recipeId: id },
      orderBy: { version: 'desc' },
    });
  }

  static readonly LABOUR_RATE_PER_HOUR = 20; // €/hr — skilled Konditor rate

  async calculateCost(id: string) {
    const recipe = await this.findOne(id);
    const materialCost = recipe.totalMaterialCost;
    // Labour cost: prefer time-based if labourTimeMinutes is set, else fall back to legacy laborCost field
    const labourTimeMinutes = Number(recipe.labourTimeMinutes || 0);
    const laborCost = labourTimeMinutes > 0
      ? (labourTimeMinutes / 60) * RecipeService.LABOUR_RATE_PER_HOUR
      : Number(recipe.laborCost);
    const overheadCost = Number(recipe.overheadCost);
    const totalCost = materialCost + laborCost + overheadCost;
    return {
      materialCost,
      laborCost,
      labourTimeMinutes,
      bakingTimeMinutes: Number(recipe.bakingTimeMinutes || 0),
      overheadCost,
      totalCost,
      costPerUnit: totalCost / Number(recipe.yield),
      labourRatePerHour: RecipeService.LABOUR_RATE_PER_HOUR,
    };
  }
}
