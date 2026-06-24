import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductionPlanService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { status?: string; from?: string; to?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.planDate = {};
      if (filters.from) where.planDate.gte = new Date(filters.from);
      if (filters.to) where.planDate.lte = new Date(filters.to);
    }
    const plans = await this.prisma.productionPlan.findMany({
      where,
      include: {
        lines: {
          include: { product: { select: { id: true, name: true, code: true } } },
        },
        _count: { select: { batches: true } },
      },
      orderBy: { planDate: 'desc' },
    });

    // Enrich each plan with completion % from linked WeeklyPlan tasks
    const weekNumbers = [...new Set(plans.map(p => p.weekNumber).filter(Boolean))] as number[];
    const weeklyPlans = weekNumbers.length > 0
      ? await this.prisma.weeklyPlan.findMany({
          where: { weekNumber: { in: weekNumbers } },
          include: { tasks: { select: { estimatedMinutes: true, status: true } } },
        })
      : [];
    const weeklyByWeek = new Map(weeklyPlans.map(w => [w.weekNumber, w]));

    return plans.map(plan => {
      const weekly = plan.weekNumber ? weeklyByWeek.get(plan.weekNumber) : undefined;
      let completionPct = null;
      if (weekly && weekly.tasks.length > 0) {
        const total = weekly.tasks.reduce((s, t) => s + Number(t.estimatedMinutes ?? 0), 0);
        const done = weekly.tasks
          .filter(t => t.status === 'DONE')
          .reduce((s, t) => s + Number(t.estimatedMinutes ?? 0), 0);
        completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
      }
      return { ...plan, completionPct, weeklyStatus: weekly?.status ?? null };
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.productionPlan.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            product: {
              include: {
                recipe: {
                  include: {
                    components: {
                      include: { ingredient: { select: { id: true, name: true, unit: true, currentStock: true, unitCost: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        batches: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!plan) throw new NotFoundException('Production plan not found');
    return plan;
  }

  async create(dto: { planDate: string; weekNumber?: number; notes?: string; lines?: Array<{ productId: string; plannedQuantity: number; notes?: string }> }) {
    const { lines, ...planData } = dto;
    return this.prisma.productionPlan.create({
      data: {
        ...planData,
        planDate: new Date(planData.planDate),
        lines: lines ? { create: lines } : undefined,
      },
      include: {
        lines: { include: { product: true } },
      },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { lines, ...planData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (lines !== undefined) {
        await tx.productionPlanLine.deleteMany({ where: { planId: id } });
        if (lines.length > 0) {
          await tx.productionPlanLine.createMany({ data: lines.map((l: any) => ({ ...l, planId: id })) });
        }
      }
      return tx.productionPlan.update({
        where: { id },
        data: planData,
        include: { lines: { include: { product: true } } },
      });
    });
  }

  async confirm(id: string) {
    const plan = await this.findOne(id);
    if (plan.status !== 'DRAFT') throw new BadRequestException('Only DRAFT plans can be confirmed');

    // Calculate required ingredients and check availability
    const requirements = await this.calculateIngredients(plan);
    const shortages = requirements.filter(r => r.available < r.required);

    await this.prisma.productionPlan.update({ where: { id }, data: { status: 'CONFIRMED' } });
    return { message: 'Plan confirmed', requirements, shortages };
  }

  async calculateIngredients(plan: any) {
    const ingredientMap = new Map<string, { id: string; name: string; unit: string; required: number; available: number }>();

    for (const line of plan.lines) {
      const recipe = line.product?.recipe;
      if (!recipe) continue;

      const qty = Number(line.plannedQuantity);
      const yieldQty = Number(recipe.yield) || 1;
      const multiplier = qty / yieldQty;

      for (const comp of recipe.components) {
        const ingredientId = comp.ingredient.id;
        const required = Number(comp.quantity) * multiplier;
        const existing = ingredientMap.get(ingredientId);

        if (existing) {
          existing.required += required;
        } else {
          ingredientMap.set(ingredientId, {
            id: ingredientId,
            name: comp.ingredient.name,
            unit: comp.ingredient.unit,
            required,
            available: Number(comp.ingredient.currentStock),
          });
        }
      }
    }

    return Array.from(ingredientMap.values());
  }

  async getPickList(id: string) {
    const plan = await this.findOne(id);
    return this.calculateIngredients(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    if (plan.status === 'IN_PROGRESS') throw new BadRequestException('Cannot delete in-progress plan');
    await this.prisma.productionPlanLine.deleteMany({ where: { planId: id } });
    return this.prisma.productionPlan.delete({ where: { id } });
  }
}
