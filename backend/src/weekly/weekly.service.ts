import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JournalService } from '../journal/journal.service';
import { startOfISOWeek, addDays, getISOWeek, getYear } from 'date-fns';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

@Injectable()
export class WeeklyService {
  constructor(private prisma: PrismaService, private journal: JournalService) {}

  // ─── RECIPE STAGES ──────────────────────────────────────────────────────────

  async getStages(recipeId: string) {
    return this.prisma.recipeStage.findMany({
      where: { recipeId },
      orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async upsertStages(recipeId: string, stages: any[]) {
    await this.prisma.recipeStage.deleteMany({ where: { recipeId } });
    if (!stages.length) return [];
    return this.prisma.recipeStage.createMany({
      data: stages.map((s, i) => ({
        recipeId,
        sortOrder: i,
        name: s.name,
        stageType: s.stageType ?? 'PREP',
        labourTimeMinutes: Number(s.labourTimeMinutes ?? 0),
        bakingTimeMinutes: Number(s.bakingTimeMinutes ?? 0),
        dayOffset: Number(s.dayOffset ?? 0),
        notes: s.notes ?? null,
      })),
    });
  }

  // ─── WEEKLY PLANS ────────────────────────────────────────────────────────────

  async listPlans() {
    const plans = await this.prisma.weeklyPlan.findMany({
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: { _count: { select: { tasks: true } } },
    });
    return plans;
  }

  async getPlan(id: string) {
    const plan = await this.prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            product: { select: { id: true, name: true, code: true, recipe: { select: { stages: { orderBy: { sortOrder: 'asc' } } } } } },
            recipeStage: true,
          },
          orderBy: [{ plannedDay: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });
    if (!plan) throw new NotFoundException('Weekly plan not found');
    return plan;
  }

  async createPlan(dto: { year: number; weekNumber: number; notes?: string }) {
    const existing = await this.prisma.weeklyPlan.findUnique({
      where: { year_weekNumber: { year: dto.year, weekNumber: dto.weekNumber } },
    });
    if (existing) throw new ConflictException(`Week ${dto.weekNumber}/${dto.year} already exists`);

    const weekStart = startOfISOWeek(new Date(dto.year, 0, 1 + (dto.weekNumber - 1) * 7));
    return this.prisma.weeklyPlan.create({
      data: { year: dto.year, weekNumber: dto.weekNumber, weekStart, notes: dto.notes },
    });
  }

  async updatePlan(id: string, dto: any) {
    await this.prisma.weeklyPlan.findUniqueOrThrow({ where: { id } });
    return this.prisma.weeklyPlan.update({ where: { id }, data: { notes: dto.notes, status: dto.status } });
  }

  async deletePlan(id: string) {
    await this.prisma.weeklyPlan.findUniqueOrThrow({ where: { id } });
    return this.prisma.weeklyPlan.delete({ where: { id } });
  }

  async completePlan(id: string) {
    const plan = await this.prisma.weeklyPlan.findUniqueOrThrow({
      where: { id },
      include: { tasks: { select: { productId: true, quantity: true } } },
    });
    const updated = await this.prisma.weeklyPlan.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // Find any existing ProductionPlan for this week (any status)
    const existing = await this.prisma.productionPlan.findFirst({
      where: { weekNumber: plan.weekNumber },
    });

    if (!existing) {
      // No plan yet — create one from the weekly tasks
      const totals = new Map<string, number>();
      for (const t of plan.tasks) {
        totals.set(t.productId, (totals.get(t.productId) ?? 0) + Number(t.quantity));
      }
      const lines = Array.from(totals.entries()).map(([productId, qty]) => ({
        productId,
        plannedQuantity: qty,
      }));
      await this.prisma.productionPlan.create({
        data: {
          planDate: plan.weekStart,
          weekNumber: plan.weekNumber,
          notes: `Auto-generated from Wochenplanung KW ${plan.weekNumber}/${plan.year}`,
          status: 'CONFIRMED',
          lines: lines.length > 0 ? { create: lines } : undefined,
        },
      });
    } else if (existing.status === 'DRAFT') {
      // Existing DRAFT → confirm it
      await this.prisma.productionPlan.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED' },
      });
    }

    return updated;
  }

  // ─── AUTO-GENERATE tasks from product list ────────────────────────────────

  async generateTasks(planId: string, entries: Array<{ productId: string; quantity: number; deliveryDay: string }>) {
    const plan = await this.getPlan(planId);
    const generated: any[] = [];

    for (const entry of entries) {
      const product = await this.prisma.product.findUnique({
        where: { id: entry.productId },
        include: { recipe: { include: { stages: { orderBy: { sortOrder: 'asc' } } } } },
      });
      if (!product) continue;

      const stages = product.recipe?.stages ?? [];
      const deliveryDayIdx = DAYS.indexOf(entry.deliveryDay);
      if (deliveryDayIdx < 0) continue;

      if (stages.length === 0) {
        // No stages — create one generic task on the delivery day
        generated.push({
          weeklyPlanId: planId,
          productId: entry.productId,
          recipeStageId: null,
          plannedDay: entry.deliveryDay,
          quantity: entry.quantity,
          estimatedMinutes: Number(product.recipe?.labourTimeMinutes ?? 0),
          status: 'PLANNED',
          sortOrder: 0,
        });
      } else {
        for (const [i, stage] of stages.entries()) {
          const taskDayIdx = Math.max(0, deliveryDayIdx + Number(stage.dayOffset));
          const taskDay = DAYS[Math.min(taskDayIdx, DAYS.length - 1)];
          generated.push({
            weeklyPlanId: planId,
            productId: entry.productId,
            recipeStageId: stage.id,
            plannedDay: taskDay,
            quantity: entry.quantity,
            estimatedMinutes: Number(stage.labourTimeMinutes),
            status: 'PLANNED',
            sortOrder: i,
          });
        }
      }
    }

    await this.prisma.weeklyTask.createMany({ data: generated });
    await this._syncProductionPlan(plan, entries);
    // Journal: PLN for each unique product entry
    for (const entry of entries) {
      const product = await this.prisma.product.findUnique({ where: { id: entry.productId }, select: { id: true, name: true } });
      if (product) {
        this.journal.log({
          status: 'PLN',
          productId: product.id,
          productName: product.name,
          quantity: entry.quantity,
          notes: `Wochenplanung KW ${plan.weekNumber}/${plan.year} – Lieferung ${entry.deliveryDay}`,
          refType: 'WEEKLY_TASK',
        }).catch(() => {});
      }
    }
    return this.getPlan(planId);
  }

  // Upsert a ProductionPlan for the week, replacing its lines with the new entries
  private async _syncProductionPlan(
    plan: any,
    entries: Array<{ productId: string; quantity: number; deliveryDay: string }>,
  ) {
    // Aggregate total quantity per product across all delivery days
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.productId, (totals.get(e.productId) ?? 0) + Number(e.quantity));
    }

    // Find or create the ProductionPlan for this calendar week
    const existing = await this.prisma.productionPlan.findFirst({
      where: { weekNumber: plan.weekNumber, planDate: { gte: plan.weekStart } },
    });

    const lines = Array.from(totals.entries()).map(([productId, qty]) => ({
      productId,
      plannedQuantity: qty,
    }));

    if (existing) {
      // Refresh lines: delete old, insert new
      await this.prisma.productionPlanLine.deleteMany({ where: { planId: existing.id } });
      await this.prisma.productionPlanLine.createMany({
        data: lines.map(l => ({ ...l, planId: existing.id })),
      });
    } else {
      await this.prisma.productionPlan.create({
        data: {
          planDate: plan.weekStart,
          weekNumber: plan.weekNumber,
          notes: `Auto-generated from Wochenplanung KW ${plan.weekNumber}/${plan.year}`,
          status: 'DRAFT',
          lines: { create: lines },
        },
      });
    }
  }

  // ─── TASK CRUD ────────────────────────────────────────────────────────────

  async addTask(planId: string, dto: any) {
    const task = await this.prisma.weeklyTask.create({
      data: {
        weeklyPlanId: planId,
        taskType: dto.taskType ?? 'PRODUCTION',
        productId: dto.productId ?? null,
        recipeStageId: dto.recipeStageId ?? null,
        plannedDay: dto.plannedDay,
        quantity: Number(dto.quantity ?? 1),
        assignedTo: dto.assignedTo ?? null,
        estimatedMinutes: Number(dto.estimatedMinutes ?? 0),
        cashAmount: Number(dto.cashAmount ?? 0),
        notes: dto.notes ?? null,
        status: 'PLANNED',
        sortOrder: Number(dto.sortOrder ?? 0),
      },
      include: { product: true, recipeStage: true },
    });
    if (task.product) {
      this.journal.log({
        status: 'PLN',
        productId: task.product.id,
        productName: task.product.name,
        quantity: Number(task.quantity),
        performedBy: task.assignedTo ?? undefined,
        notes: `Geplant für ${task.plannedDay}${task.recipeStage ? ' – ' + task.recipeStage.name : ''}`,
        refType: 'WEEKLY_TASK',
        refId: task.id,
      }).catch(() => {});
    }
    return task;
  }

  async updateTask(taskId: string, dto: any) {
    const completedAt = dto.status === 'DONE' ? new Date() : undefined;
    const task = await this.prisma.weeklyTask.update({
      where: { id: taskId },
      data: {
        plannedDay: dto.plannedDay,
        quantity: dto.quantity !== undefined ? Number(dto.quantity) : undefined,
        assignedTo: dto.assignedTo,
        estimatedMinutes: dto.estimatedMinutes !== undefined ? Number(dto.estimatedMinutes) : undefined,
        cashAmount: dto.cashAmount !== undefined ? Number(dto.cashAmount) : undefined,
        notes: dto.notes,
        status: dto.status,
        sortOrder: dto.sortOrder !== undefined ? Number(dto.sortOrder) : undefined,
        ...(completedAt ? { completedAt } : {}),
      },
      include: { product: true, recipeStage: true },
    });
    if (task.product && dto.status) {
      const statusMap: Record<string, 'BCK' | 'BRT'> = {
        IN_PROGRESS: 'BCK',
        DONE: 'BRT',
      };
      const journalStatus = statusMap[dto.status];
      if (journalStatus) {
        const label = journalStatus === 'BCK' ? 'In Bearbeitung' : 'Fertig gebacken';
        this.journal.log({
          status: journalStatus,
          productId: task.product.id,
          productName: task.product.name,
          quantity: Number(task.quantity),
          performedBy: task.assignedTo ?? dto.assignedTo ?? undefined,
          notes: `${label}${task.recipeStage ? ' – ' + task.recipeStage.name : ''}`,
          refType: 'WEEKLY_TASK',
          refId: task.id,
        }).catch(() => {});
      }
    }
    return task;
  }

  async deleteTask(taskId: string) {
    return this.prisma.weeklyTask.delete({ where: { id: taskId } });
  }

  async clearTasks(planId: string) {
    return this.prisma.weeklyTask.deleteMany({ where: { weeklyPlanId: planId } });
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────

  summary(plan: any) {
    const byDay: Record<string, { totalMinutes: number; tasks: number; byKonditor: Record<string, number> }> = {};
    for (const day of DAYS) byDay[day] = { totalMinutes: 0, tasks: 0, byKonditor: {} };

    for (const t of plan.tasks ?? []) {
      const d = byDay[t.plannedDay];
      if (!d) continue;
      d.totalMinutes += Number(t.estimatedMinutes ?? 0);
      d.tasks++;
      if (t.assignedTo) {
        d.byKonditor[t.assignedTo] = (d.byKonditor[t.assignedTo] ?? 0) + Number(t.estimatedMinutes ?? 0);
      }
    }
    return byDay;
  }
}
