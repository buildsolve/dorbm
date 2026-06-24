import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TraceService {
  constructor(private prisma: PrismaService) {}

  async getBatchTrace(storageRecordId: string) {
    const record = await this.prisma.storageRecord.findUnique({
      where: { id: storageRecordId },
      include: {
        product: {
          include: {
            recipe: {
              include: {
                components: {
                  include: { ingredient: { select: { id: true, name: true, unit: true } } },
                },
                stages: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        location: { select: { id: true, name: true, code: true } },
        weeklyTask: {
          include: {
            weeklyPlan: { select: { year: true, weekNumber: true, weekStart: true } },
            recipeStage: { select: { id: true, name: true, stageType: true } },
          },
        },
        movements: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!record) throw new NotFoundException('Storage record not found');

    const task = record.weeklyTask as any;
    const product = record.product as any;
    const recipe = product?.recipe;

    // Build timeline events
    const events: {
      step: string;
      label: string;
      sublabel?: string;
      at: string | null;
      who?: string;
      details?: any[];
      status: 'done' | 'pending';
    }[] = [];

    // 1. Zutaten (ingredients from recipe)
    const ingredients = (recipe?.components ?? []).map((c: any) => ({
      name: c.ingredient.name,
      quantity: Number(c.quantity),
      unit: c.ingredient.unit,
    }));
    events.push({
      step: 'ingredients',
      label: 'Zutaten bereitgestellt',
      sublabel: recipe ? `Rezept: ${recipe.name}` : 'Kein Rezept verknüpft',
      at: task?.weeklyPlan?.weekStart ?? record.productionDate?.toISOString() ?? null,
      details: ingredients,
      status: 'done',
    });

    // 2. Production stages from recipe (Boden, Dekoration etc.)
    const stages: any[] = recipe?.stages ?? [];
    if (task) {
      // If we have a linked task, show all stages for the recipe as timeline steps
      for (const stage of stages) {
        const isThisStage = task.recipeStageId === stage.id;
        events.push({
          step: `stage_${stage.id}`,
          label: stage.name,
          sublabel: stage.stageType,
          at: isThisStage ? (task.completedAt?.toISOString() ?? task.updatedAt?.toISOString() ?? null) : null,
          who: isThisStage ? task.assignedTo ?? undefined : undefined,
          status: isThisStage ? 'done' : 'pending',
        });
      }

      // If no stage linked (direct production task), show generic baking step
      if (stages.length === 0) {
        events.push({
          step: 'production',
          label: 'Produktion abgeschlossen',
          sublabel: task.weeklyPlan
            ? `KW ${task.weeklyPlan.weekNumber} ${task.weeklyPlan.year} · ${task.plannedDay}`
            : task.plannedDay,
          at: task.completedAt?.toISOString() ?? task.updatedAt?.toISOString() ?? null,
          who: task.assignedTo ?? undefined,
          details: [{ quantity: Number(task.quantity), estimatedMinutes: task.estimatedMinutes }],
          status: 'done',
        });
      }
    } else {
      // No task linked — show inferred production event
      events.push({
        step: 'production',
        label: 'Produktion',
        sublabel: 'Kein Produktionsauftrag verknüpft',
        at: record.productionDate?.toISOString() ?? null,
        status: record.productionDate ? 'done' : 'pending',
      });
    }

    // 3. Einlagerung
    events.push({
      step: 'storage',
      label: 'Eingelagert',
      sublabel: record.location?.name ?? 'Kein Lagerort',
      at: record.createdAt.toISOString(),
      details: [
        { quantity: Number(record.quantity), batchNumber: record.batchNumber },
        ...(record.expiryDate ? [{ expiryDate: record.expiryDate.toISOString() }] : []),
      ],
      status: 'done',
    });

    // 4. Movements (sold, transfers etc.)
    for (const m of record.movements as any[]) {
      const label = m.type === 'OUT'
        ? 'Verkauft'
        : m.type === 'IN' ? 'Zugang' : m.type === 'TRANSFER' ? 'Umgelagert' : 'Buchung';
      events.push({
        step: `movement_${m.id}`,
        label,
        sublabel: m.notes ?? undefined,
        at: m.createdAt.toISOString(),
        details: [{ quantity: Number(m.quantity), type: m.type }],
        status: 'done',
      });
    }

    return {
      id: record.id,
      batchNumber: record.batchNumber,
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
      },
      recipe: recipe ? { id: recipe.id, name: recipe.name } : null,
      currentQty: Number(record.quantity),
      isActive: record.isActive,
      events,
    };
  }

  async getBatchesForProduct(productId: string) {
    return this.prisma.storageRecord.findMany({
      where: { productId },
      include: {
        location: { select: { name: true } },
        movements: { select: { type: true, quantity: true, createdAt: true, notes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
