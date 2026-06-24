import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.ingredient.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const ing = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        supplier: true,
        stockTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!ing) throw new NotFoundException('Ingredient not found');
    return ing;
  }

  async create(dto: any) {
    const exists = await this.prisma.ingredient.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Ingredient code already exists');
    return this.prisma.ingredient.create({ data: dto, include: { supplier: true } });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.ingredient.update({ where: { id }, data: dto, include: { supplier: true } });
  }

  async remove(id: string) {
    const ing = await this.findOne(id);
    const inRecipes = await this.prisma.recipeComponent.count({ where: { ingredientId: id } });
    if (inRecipes > 0) {
      // Soft delete if referenced
      return this.prisma.ingredient.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.ingredient.delete({ where: { id } });
  }

  async getValuation() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unit: true, currentStock: true, unitCost: true },
    });
    const total = ingredients.reduce((sum, i) => sum + Number(i.currentStock) * Number(i.unitCost), 0);
    return { ingredients, totalValue: total };
  }
}
