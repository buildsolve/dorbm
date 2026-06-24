import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      ingredientCount,
      recipeCount,
      productCount,
      activePlans,
      stockRecords,
      lowStockIngredients,
      expiringStock,
    ] = await Promise.all([
      this.prisma.ingredient.count({ where: { isActive: true } }),
      this.prisma.recipe.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productionPlan.count({ where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
      this.prisma.storageRecord.findMany({ where: { isActive: true, quantity: { gt: 0 } } }),
      this.prisma.ingredient.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentStock: true, reorderLevel: true, unit: true },
      }),
      this.prisma.storageRecord.count({
        where: {
          isActive: true,
          expiryDate: { lte: new Date(Date.now() + 3 * 86400000), gte: new Date() },
        },
      }),
    ]);

    const inventoryValue = await this.getInventoryValue();
    const lowStock = lowStockIngredients.filter(i => Number(i.currentStock) <= Number(i.reorderLevel));
    const finishedGoodsValue = stockRecords.reduce((sum, r) => sum + Number(r.quantity) * Number(r.unitCost || 0), 0);

    return {
      counts: { ingredients: ingredientCount, recipes: recipeCount, products: productCount, activePlans },
      inventory: { totalValue: inventoryValue, lowStockCount: lowStock.length, lowStockItems: lowStock.slice(0, 5) },
      finishedGoods: { totalValue: finishedGoodsValue, expiringCount: expiringStock },
    };
  }

  async getInventoryValue() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      select: { currentStock: true, unitCost: true },
    });
    return ingredients.reduce((sum, i) => sum + Number(i.currentStock) * Number(i.unitCost), 0);
  }

  async getProductionEfficiency() {
    const batches = await this.prisma.productionBatch.findMany({
      where: { status: 'COMPLETED' },
      select: {
        batchNumber: true,
        plannedQty: true,
        actualQty: true,
        wastageQty: true,
        yieldPercent: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 30,
    });

    const avgYield = batches.length
      ? batches.reduce((sum, b) => sum + Number(b.yieldPercent || 0), 0) / batches.length
      : 0;

    const totalPlanned = batches.reduce((sum, b) => sum + Number(b.plannedQty), 0);
    const totalActual = batches.reduce((sum, b) => sum + Number(b.actualQty || 0), 0);
    const totalWastage = batches.reduce((sum, b) => sum + Number(b.wastageQty || 0), 0);

    return { batches, avgYield: Math.round(avgYield * 100) / 100, totalPlanned, totalActual, totalWastage };
  }

  async getTopProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        recipe: {
          include: {
            components: { include: { ingredient: { select: { unitCost: true } } } },
          },
        },
        category: { select: { name: true } },
      },
    });

    return products
      .map(p => {
        let materialCost = 0;
        if (p.recipe?.components) {
          materialCost = p.recipe.components.reduce(
            (sum, c) => sum + Number(c.quantity) * Number(c.ingredient?.unitCost || 0), 0
          );
          if (Number(p.recipe.yield) > 1) materialCost /= Number(p.recipe.yield);
        }
        const totalCost = materialCost + Number(p.laborCost) + Number(p.overheadCost) + Number(p.packagingCost);
        const margin = Number(p.sellingPrice) - totalCost;
        const marginPct = Number(p.sellingPrice) > 0 ? (margin / Number(p.sellingPrice)) * 100 : 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category?.name,
          sellingPrice: Number(p.sellingPrice),
          totalCost,
          margin,
          marginPct: Math.round(marginPct * 10) / 10,
        };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }

  async getStockMovementTrend(days = 30) {
    const from = new Date(Date.now() - days * 86400000);
    const transactions = await this.prisma.stockTransaction.findMany({
      where: { createdAt: { gte: from } },
      include: { ingredient: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const byDay = new Map<string, { date: string; stockIn: number; stockOut: number; wastage: number }>();
    for (const tx of transactions) {
      const day = tx.createdAt.toISOString().split('T')[0];
      if (!byDay.has(day)) byDay.set(day, { date: day, stockIn: 0, stockOut: 0, wastage: 0 });
      const entry = byDay.get(day)!;
      if (tx.type === 'STOCK_IN') entry.stockIn += Number(tx.quantity);
      else if (tx.type === 'STOCK_OUT' || tx.type === 'PRODUCTION_USE') entry.stockOut += Number(tx.quantity);
      else if (tx.type === 'WASTAGE' || tx.type === 'SPOILAGE') entry.wastage += Number(tx.quantity);
    }

    return Array.from(byDay.values());
  }

  async getCOGS(from?: string, to?: string) {
    const where: any = { type: 'PRODUCTION_USE' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const usages = await this.prisma.stockTransaction.findMany({
      where,
      include: { ingredient: { select: { unitCost: true, name: true } } },
    });

    const cogs = usages.reduce(
      (sum, u) => sum + Number(u.quantity) * Number(u.ingredient.unitCost),
      0
    );

    return { cogs, usages: usages.length, breakdown: usages };
  }

  async getLabourEfficiency(weeks = 8) {
    // Build a series of ISO weeks going back `weeks` weeks
    const results: Array<{
      week: string; weekLabel: string;
      labourHours: number;
      unitsProduced: number;
      valueProduced: number;
    }> = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + 1 - i * 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const jan1 = new Date(monday.getFullYear(), 0, 1);
      const kw = Math.ceil(((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);

      // Labour hours from weekly tasks in this range
      const [weeklyPlan, batches] = await Promise.all([
        this.prisma.weeklyPlan.findFirst({
          where: { weekStart: { gte: monday, lte: sunday } },
          include: { tasks: { select: { estimatedMinutes: true } } },
        }),
        this.prisma.productionBatch.findMany({
          where: { status: 'COMPLETED', completedAt: { gte: monday, lte: sunday } },
          select: { actualQty: true, plannedQty: true, productId: true },
        }),
      ]);

      // Resolve selling prices for each unique productId in this week's batches
      const productIds = [...new Set(batches.map(b => b.productId).filter(Boolean))] as string[];
      const products = productIds.length > 0
        ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sellingPrice: true } })
        : [];
      const priceMap = new Map(products.map(p => [p.id, Number(p.sellingPrice)]));

      const labourMinutes = weeklyPlan?.tasks.reduce((s, t) => s + Number(t.estimatedMinutes ?? 0), 0) ?? 0;
      const unitsProduced = batches.reduce((s, b) => s + Number(b.actualQty ?? b.plannedQty ?? 0), 0);
      const valueProduced = batches.reduce((s, b) => s + Number(b.actualQty ?? 0) * (b.productId ? (priceMap.get(b.productId) ?? 0) : 0), 0);

      results.push({
        week: `KW ${kw}`,
        weekLabel: monday.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
        labourHours: Math.round((labourMinutes / 60) * 10) / 10,
        unitsProduced,
        valueProduced: Math.round(valueProduced * 100) / 100,
      });
    }

    return results;
  }

  async getInventoryImpact(window: 'week' | 'month' | 'year' = 'month') {
    // Project ingredient consumption from open weekly-planning tasks
    // within the selected horizon, exploded through each product's recipe.
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekFilter: any = { gte: monday };
    if (window === 'week') weekFilter.lt = new Date(monday.getTime() + 7 * 86400000);
    else if (window === 'month') weekFilter.lt = new Date(monday.getTime() + 28 * 86400000);

    const tasks = await this.prisma.weeklyTask.findMany({
      where: {
        status: { notIn: ['DONE', 'CANCELLED'] },
        weeklyPlan: { weekStart: weekFilter },
      },
      include: {
        weeklyPlan: { select: { year: true, weekNumber: true } },
        product: {
          select: {
            id: true, name: true,
            recipe: {
              select: {
                yield: true,
                components: {
                  select: {
                    quantity: true,
                    ingredient: { select: { id: true, name: true, unit: true, currentStock: true, unitCost: true, reorderLevel: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    type Row = {
      id: string; name: string; unit: string;
      currentStock: number; unitCost: number; reorderLevel: number;
      demand: number;
    };
    const byIngredient = new Map<string, Row>();
    const weekSet = new Set<string>();
    const productSet = new Set<string>();
    let tasksWithoutRecipe = 0;

    for (const task of tasks) {
      const recipe = task.product?.recipe;
      if (!recipe || !recipe.components.length || Number(recipe.yield) <= 0) {
        tasksWithoutRecipe++;
        continue;
      }
      weekSet.add(`KW ${task.weeklyPlan.weekNumber}`);
      productSet.add(task.product.id);
      const batches = Number(task.quantity) / Number(recipe.yield);
      for (const comp of recipe.components) {
        const ing = comp.ingredient;
        const demand = Number(comp.quantity) * batches;
        const row = byIngredient.get(ing.id) ?? {
          id: ing.id, name: ing.name, unit: ing.unit,
          currentStock: Number(ing.currentStock), unitCost: Number(ing.unitCost),
          reorderLevel: Number(ing.reorderLevel), demand: 0,
        };
        row.demand += demand;
        byIngredient.set(ing.id, row);
      }
    }

    const items = [...byIngredient.values()]
      .map(r => {
        const remaining = r.currentStock - r.demand;
        return {
          id: r.id, name: r.name, unit: r.unit,
          currentStock: Math.round(r.currentStock * 100) / 100,
          demand: Math.round(r.demand * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          consumptionPct: r.currentStock > 0 ? Math.round(Math.min(100, (r.demand / r.currentStock) * 100)) : 100,
          demandValue: Math.round(r.demand * r.unitCost * 100) / 100,
          shortage: remaining < 0,
          belowReorder: remaining >= 0 && remaining <= r.reorderLevel,
        };
      })
      .sort((a, b) => b.demandValue - a.demandValue);

    const currentInventoryValue = await this.getInventoryValue();
    const totalDemandValue = items.reduce((s, i) => s + i.demandValue, 0);

    return {
      window,
      weeks: [...weekSet].sort((a, b) => Number(a.replace('KW ', '')) - Number(b.replace('KW ', ''))),
      productsPlanned: productSet.size,
      tasksConsidered: tasks.length - tasksWithoutRecipe,
      tasksWithoutRecipe,
      totals: {
        demandValue: Math.round(totalDemandValue * 100) / 100,
        currentInventoryValue: Math.round(currentInventoryValue * 100) / 100,
        reductionPct: currentInventoryValue > 0 ? Math.round((totalDemandValue / currentInventoryValue) * 1000) / 10 : 0,
        ingredientsAffected: items.length,
        shortages: items.filter(i => i.shortage).length,
      },
      items,
    };
  }

  async getOperationsKpis(window: 'week' | 'month' | 'year' = 'week') {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = window === 'week'
      ? new Date(monday.getTime() + 6 * 86400000 + 86399999)
      : window === 'month'
        ? new Date(monday.getTime() + 28 * 86400000 - 1)
        : new Date(monday.getFullYear(), 11, 31, 23, 59, 59, 999);

    const taskInclude = {
      product: {
        select: {
          name: true,
          recipe: { select: { yield: true, bakingTimeMinutes: true, labourTimeMinutes: true } },
        },
      },
    } as const;

    let [weekTasks, overdueTasks, locations, records] = await Promise.all([
      this.prisma.weeklyTask.findMany({
        where: { weeklyPlan: { weekStart: { gte: monday, lte: sunday } } },
        include: taskInclude,
      }),
      this.prisma.weeklyTask.count({
        where: {
          status: { notIn: ['DONE', 'CANCELLED'] },
          weeklyPlan: { weekStart: { lt: monday } },
        },
      }),
      this.prisma.storageLocation.findMany({ where: { isActive: true }, select: { id: true, name: true, capacity: true } }),
      this.prisma.storageRecord.findMany({
        where: { isActive: true, quantity: { gt: 0 } },
        select: { locationId: true, quantity: true, unitCost: true, expiryDate: true },
      }),
    ]);

    // If the current week has nothing planned, steer by the next planned week instead
    let weekLabel: string | null = null;
    let isFallbackWeek = false;
    if (window === 'week' && weekTasks.length === 0) {
      const nextPlan = await this.prisma.weeklyPlan.findFirst({
        where: { weekStart: { gt: sunday }, tasks: { some: {} } },
        orderBy: { weekStart: 'asc' },
        select: { weekNumber: true, id: true },
      });
      if (nextPlan) {
        weekTasks = await this.prisma.weeklyTask.findMany({
          where: { weeklyPlanId: nextPlan.id },
          include: taskInclude,
        });
        weekLabel = `KW ${nextPlan.weekNumber}`;
        isFallbackWeek = true;
      }
    }

    // ---- Labour (this week) ----
    const plannedMinutes = weekTasks.reduce((s, t) => s + Number(t.estimatedMinutes), 0);
    const doneTasks = weekTasks.filter(t => t.status === 'DONE');
    const doneMinutes = doneTasks.reduce((s, t) => s + Number(t.estimatedMinutes), 0);
    const unitsPlanned = weekTasks.reduce((s, t) => s + Number(t.quantity), 0);

    // ---- Oven time & energy estimate (from recipe baking times) ----
    const OVEN_KW = 12;          // typical commercial deck oven draw
    const ENERGY_PRICE = 0.35;   // €/kWh
    let bakingMinutes = 0;
    const ovenByProduct = new Map<string, number>();
    for (const t of weekTasks) {
      const r = t.product?.recipe;
      if (!r || Number(r.yield) <= 0 || Number(r.bakingTimeMinutes) <= 0) continue;
      const batches = Number(t.quantity) / Number(r.yield);
      const mins = Number(r.bakingTimeMinutes) * batches;
      bakingMinutes += mins;
      ovenByProduct.set(t.product.name, (ovenByProduct.get(t.product.name) ?? 0) + mins);
    }
    const bakingHours = Math.round((bakingMinutes / 60) * 10) / 10;
    const energyKwh = Math.round(bakingHours * OVEN_KW * 10) / 10;
    const energyCost = Math.round(energyKwh * ENERGY_PRICE * 100) / 100;

    // ---- Storage utilization ----
    const usedByLocation = new Map<string, number>();
    let expiringCount = 0, expiringValue = 0;
    const in7days = new Date(Date.now() + 7 * 86400000);
    for (const r of records) {
      if (r.locationId) usedByLocation.set(r.locationId, (usedByLocation.get(r.locationId) ?? 0) + Number(r.quantity));
      if (r.expiryDate && r.expiryDate <= in7days) {
        expiringCount++;
        expiringValue += Number(r.quantity) * Number(r.unitCost ?? 0);
      }
    }
    const locs = locations.map(l => {
      const used = usedByLocation.get(l.id) ?? 0;
      const capacity = Number(l.capacity ?? 0);
      return {
        id: l.id, name: l.name, used: Math.round(used * 100) / 100, capacity,
        pct: capacity > 0 ? Math.round((used / capacity) * 100) : null,
      };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const totalCap = locs.reduce((s, l) => s + l.capacity, 0);
    const totalUsed = locs.filter(l => l.capacity > 0).reduce((s, l) => s + l.used, 0);

    // ISO-ish week number for the label
    const jan1 = new Date(monday.getFullYear(), 0, 1);
    const kw = Math.ceil(((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);

    const kwEnd = Math.ceil(((sunday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const rangeLabel = window === 'week' ? `KW ${kw}` : `KW ${kw}–${kwEnd}`;

    return {
      window,
      week: weekLabel ?? rangeLabel,
      isFallbackWeek,
      labour: {
        plannedHours: Math.round((plannedMinutes / 60) * 10) / 10,
        doneHours: Math.round((doneMinutes / 60) * 10) / 10,
        taskCount: weekTasks.length,
        doneCount: doneTasks.length,
        completionPct: weekTasks.length > 0 ? Math.round((doneTasks.length / weekTasks.length) * 100) : 0,
        unitsPlanned,
        minPerUnit: unitsPlanned > 0 ? Math.round((plannedMinutes / unitsPlanned) * 10) / 10 : 0,
        overdueTasks,
      },
      energy: {
        bakingHours,
        estKwh: energyKwh,
        estCost: energyCost,
        assumption: `${OVEN_KW} kW Ofen · €${ENERGY_PRICE.toFixed(2)}/kWh`,
        byProduct: [...ovenByProduct.entries()]
          .map(([name, mins]) => ({ name, hours: Math.round((mins / 60) * 10) / 10 }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 6),
      },
      storage: {
        overallPct: totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : null,
        locations: locs,
        expiring7d: { count: expiringCount, value: Math.round(expiringValue * 100) / 100 },
      },
    };
  }

  async getBusinessOutlook(window: 'week' | 'month' | 'year' = 'month', fromParam?: string, toParam?: string) {
    const FALLBACK_WAGE = 18;   // € per labour hour when no employees are defined
    const OVEN_KW = 12;         // commercial oven draw
    const ENERGY_PRICE = 0.35;  // €/kWh

    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    let weekFilter: any;
    if (fromParam && toParam) {
      // explicit date range supplied (e.g. month picker)
      weekFilter = { gte: new Date(fromParam), lt: new Date(toParam) };
    } else {
      weekFilter = { gte: monday };
      if (window === 'week') weekFilter.lt = new Date(monday.getTime() + 7 * 86400000);
      else if (window === 'month') weekFilter.lt = new Date(monday.getTime() + 28 * 86400000);
    }

    // If week view has no plans in the current week, fall forward to the next planned week
    // (mirrors the same fallback in getOperationsKpis)
    if (window === 'week' && !fromParam) {
      const hasCurrentWeek = await this.prisma.weeklyPlan.count({
        where: { weekStart: weekFilter, tasks: { some: {} } },
      });
      if (hasCurrentWeek === 0) {
        const nextPlan = await this.prisma.weeklyPlan.findFirst({
          where: { weekStart: { gte: weekFilter.lt }, tasks: { some: {} } },
          orderBy: { weekStart: 'asc' },
          select: { weekStart: true },
        });
        if (nextPlan) {
          weekFilter = {
            gte: nextPlan.weekStart,
            lt: new Date(nextPlan.weekStart.getTime() + 7 * 86400000),
          };
        }
      }
    }

    const employees = await this.prisma.employee.findMany({ where: { isActive: true } });

    const tasks = await this.prisma.weeklyTask.findMany({
      where: { status: { notIn: ['CANCELLED'] }, weeklyPlan: { weekStart: weekFilter } },
      include: {
        weeklyPlan: { select: { weekNumber: true } },
        product: {
          select: {
            id: true, name: true, sellingPrice: true,
            recipe: {
              select: {
                yield: true, bakingTimeMinutes: true,
                components: { select: { quantity: true, ingredient: { select: { unitCost: true } } } },
              },
            },
          },
        },
      },
    });

    // Payroll: paid weekly hours × hourly rate per employee
    const weeklyCapacityHours = employees.reduce((s, e) => s + Number(e.weeklyHours), 0);
    const weeklyPayroll = employees.reduce((s, e) => s + Number(e.weeklyHours) * Number(e.hourlyRate), 0);
    const blendedRate = weeklyCapacityHours > 0 ? weeklyPayroll / weeklyCapacityHours : FALLBACK_WAGE;

    type WeekRow = { week: string; kw: number; revenue: number; labourCost: number; energyCost: number; materialCost: number; otherCost: number };
    const byWeek = new Map<number, WeekRow>();
    const revenueByProduct = new Map<string, { name: string; revenue: number; units: number }>();
    let labourMinutes = 0, bakingMinutes = 0, materialCost = 0, revenue = 0, otherCost = 0;

    for (const t of tasks) {
      const kw = t.weeklyPlan.weekNumber;
      const row = byWeek.get(kw) ?? { week: `KW ${kw}`, kw, revenue: 0, labourCost: 0, energyCost: 0, materialCost: 0, otherCost: 0 };
      const qty = Number(t.quantity);
      const price = Number(t.product?.sellingPrice ?? 0);
      const taskRevenue = qty * price;
      const taskLabourCost = (Number(t.estimatedMinutes) / 60) * blendedRate;
      const taskCash = Number((t as any).cashAmount ?? 0);

      let taskMaterial = 0, taskEnergy = 0;
      const r = t.product?.recipe;
      if (r && Number(r.yield) > 0) {
        const batches = qty / Number(r.yield);
        const batchCost = r.components.reduce((s, c) => s + Number(c.quantity) * Number(c.ingredient.unitCost), 0);
        taskMaterial = batchCost * batches;
        const mins = Number(r.bakingTimeMinutes) * batches;
        bakingMinutes += mins;
        taskEnergy = (mins / 60) * OVEN_KW * ENERGY_PRICE;
      }

      labourMinutes += Number(t.estimatedMinutes);
      materialCost += taskMaterial;
      revenue += taskRevenue;
      row.revenue += taskRevenue;
      row.labourCost += taskLabourCost;
      row.energyCost += taskEnergy;
      row.materialCost += taskMaterial;
      byWeek.set(kw, row);

      if (t.product) {
        const rp = revenueByProduct.get(t.product.id) ?? { name: t.product.name, revenue: 0, units: 0 };
        rp.revenue += taskRevenue;
        rp.units += qty;
        revenueByProduct.set(t.product.id, rp);
      }
    }

    // Window length in weeks (for payroll & capacity)
    const weeksInWindow = window === 'week' ? 1 : window === 'month' ? 4
      : Math.max(1, Math.ceil((new Date(monday.getFullYear(), 11, 31).getTime() - monday.getTime()) / (7 * 86400000)));

    const utilisedHours = labourMinutes / 60;
    const availableHours = weeklyCapacityHours * weeksInWindow;
    const hasTeam = employees.length > 0;
    // With a team, labour is a fixed payroll cost (paid hours × rate);
    // without one, fall back to planned hours × fallback wage.
    const labourCost = hasTeam ? weeklyPayroll * weeksInWindow : utilisedHours * FALLBACK_WAGE;
    const energyCost = (bakingMinutes / 60) * OVEN_KW * ENERGY_PRICE;
    const totalCost = labourCost + energyCost + materialCost + otherCost;
    const grossProfit = revenue - totalCost;
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const weeks = [...byWeek.values()].sort((a, b) => a.kw - b.kw).map(w => {
      const weekLabour = hasTeam ? weeklyPayroll : w.labourCost;
      return {
        week: w.week,
        revenue: r2(w.revenue),
        labourCost: r2(weekLabour),
        energyCost: r2(w.energyCost),
        materialCost: r2(w.materialCost),
        otherCost: r2(w.otherCost),
        profit: r2(w.revenue - weekLabour - w.energyCost - w.materialCost - w.otherCost),
      };
    });

    return {
      window,
      range: weeks.length ? `${weeks[0].week}–${weeks[weeks.length - 1].week.replace('KW ', '')}` : null,
      assumptions: {
        hourlyWage: hasTeam ? Math.round(blendedRate * 100) / 100 : FALLBACK_WAGE,
        wageSource: hasTeam ? 'team' : 'fallback',
        ovenKw: OVEN_KW, energyPrice: ENERGY_PRICE,
      },
      team: {
        employees: employees.length,
        weeklyCapacityHours: r2(weeklyCapacityHours),
        weeklyPayroll: r2(weeklyPayroll),
        availableHours: r2(availableHours),
        utilisedHours: r2(utilisedHours),
        utilizationPct: availableHours > 0 ? Math.round((utilisedHours / availableHours) * 1000) / 10 : null,
      },
      totals: {
        revenue: r2(revenue),
        labourCost: r2(labourCost),
        labourHours: Math.round((labourMinutes / 60) * 10) / 10,
        energyCost: r2(energyCost),
        energyKwh: Math.round((bakingMinutes / 60) * OVEN_KW * 10) / 10,
        materialCost: r2(materialCost),
        otherCost: r2(otherCost),
        totalCost: r2(totalCost),
        grossProfit: r2(grossProfit),
        grossMarginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
        unitsPlanned: Math.round(tasks.reduce((s, t) => s + Number(t.quantity), 0)),
        revenuePerLabourHour: labourMinutes > 0 ? r2(revenue / (labourMinutes / 60)) : 0,
      },
      weeks,
      topProducts: [...revenueByProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
        .map(p => ({ ...p, revenue: r2(p.revenue) })),
    };
  }

  async getStrategicKpis() {
    const since30 = new Date(Date.now() - 30 * 86400000);

    const [products, ingredients, txns] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true, sellingPrice: true,
          laborCost: true, overheadCost: true, packagingCost: true,
          recipe: {
            select: {
              yield: true,
              components: {
                select: { quantity: true, ingredient: { select: { unitCost: true } } },
              },
            },
          },
        },
      }),
      this.prisma.ingredient.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentStock: true, unitCost: true },
      }),
      this.prisma.stockTransaction.findMany({
        where: { createdAt: { gte: since30 } },
        select: { ingredientId: true, type: true, quantity: true, unitCost: true },
      }),
    ]);

    // ---- Portfolio margins ----
    const margins: { id: string; name: string; sellingPrice: number; unitCost: number; marginPct: number }[] = [];
    for (const p of products) {
      const price = Number(p.sellingPrice);
      if (price <= 0) continue;
      let materialCost = 0;
      if (p.recipe && Number(p.recipe.yield) > 0) {
        const batchCost = p.recipe.components.reduce(
          (s, c) => s + Number(c.quantity) * Number(c.ingredient.unitCost), 0);
        materialCost = batchCost / Number(p.recipe.yield);
      }
      const unitCost = materialCost + Number(p.laborCost) + Number(p.overheadCost) + Number(p.packagingCost);
      margins.push({
        id: p.id, name: p.name, sellingPrice: price,
        unitCost: Math.round(unitCost * 100) / 100,
        marginPct: Math.round(((price - unitCost) / price) * 1000) / 10,
      });
    }
    const avgMargin = margins.length ? Math.round(margins.reduce((s, m) => s + m.marginPct, 0) / margins.length * 10) / 10 : 0;
    const buckets = [
      { label: '< 20%', min: -Infinity, max: 20, count: 0 },
      { label: '20–40%', min: 20, max: 40, count: 0 },
      { label: '40–60%', min: 40, max: 60, count: 0 },
      { label: '> 60%', min: 60, max: Infinity, count: 0 },
    ];
    for (const m of margins) {
      const b = buckets.find(b => m.marginPct >= b.min && m.marginPct < b.max);
      if (b) b.count++;
    }
    const worstMargins = [...margins].sort((a, b) => a.marginPct - b.marginPct).slice(0, 5);

    // ---- Inventory flow (30 days) ----
    const costMap = new Map(ingredients.map(i => [i.id, Number(i.unitCost)]));
    const txValue = (t: { ingredientId: string; quantity: number; unitCost: any }) =>
      Math.abs(Number(t.quantity)) * Number(t.unitCost ?? costMap.get(t.ingredientId) ?? 0);

    let consumedValue = 0, wasteValue = 0, purchasedValue = 0;
    const movedIngredients = new Set<string>();
    for (const t of txns) {
      movedIngredients.add(t.ingredientId);
      if (t.type === 'STOCK_OUT' || t.type === 'PRODUCTION_USE') consumedValue += txValue(t);
      else if (t.type === 'WASTAGE' || t.type === 'SPOILAGE') wasteValue += txValue(t);
      else if (t.type === 'STOCK_IN') purchasedValue += txValue(t);
    }

    const inventoryValue = ingredients.reduce((s, i) => s + Number(i.currentStock) * Number(i.unitCost), 0);
    const dailyConsumption = consumedValue / 30;
    const turnoverAnnual = inventoryValue > 0 ? Math.round(((consumedValue / 30) * 365 / inventoryValue) * 10) / 10 : 0;
    const daysOfCover = dailyConsumption > 0 ? Math.round(inventoryValue / dailyConsumption) : null;
    const wastageRate = (consumedValue + wasteValue) > 0
      ? Math.round((wasteValue / (consumedValue + wasteValue)) * 1000) / 10 : 0;

    // ---- Dead stock: value sitting untouched for 30+ days ----
    const deadItems = ingredients
      .filter(i => Number(i.currentStock) > 0 && !movedIngredients.has(i.id))
      .map(i => ({ id: i.id, name: i.name, value: Math.round(Number(i.currentStock) * Number(i.unitCost) * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
    const deadStockValue = Math.round(deadItems.reduce((s, i) => s + i.value, 0) * 100) / 100;

    return {
      portfolio: {
        productsPriced: margins.length,
        avgMarginPct: avgMargin,
        lowMarginCount: margins.filter(m => m.marginPct < 20).length,
        buckets: buckets.map(b => ({ label: b.label, count: b.count })),
        worstMargins,
      },
      inventoryFlow: {
        consumedValue30d: Math.round(consumedValue * 100) / 100,
        purchasedValue30d: Math.round(purchasedValue * 100) / 100,
        wasteValue30d: Math.round(wasteValue * 100) / 100,
        wastageRatePct: wastageRate,
        turnoverAnnual,
        daysOfCover,
      },
      deadStock: {
        value: deadStockValue,
        count: deadItems.length,
        sharePct: inventoryValue > 0 ? Math.round((deadStockValue / inventoryValue) * 1000) / 10 : 0,
        topItems: deadItems.slice(0, 5),
      },
    };
  }

  async getSalesPipeline() {
    // Ready-to-sell finished goods + cakes coming out of planned production
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const [records, tasks, activeProductCount] = await Promise.all([
      this.prisma.storageRecord.findMany({
        where: { isActive: true, quantity: { gt: 0 } },
        include: {
          product: { select: { id: true, name: true, sellingPrice: true, shelfLifeDays: true } },
          location: { select: { name: true } },
        },
      }),
      this.prisma.weeklyTask.findMany({
        where: {
          status: { notIn: ['DONE', 'CANCELLED'] },
          weeklyPlan: { weekStart: { gte: monday } },
        },
        include: {
          weeklyPlan: { select: { weekNumber: true, weekStart: true } },
          product: { select: { id: true, name: true, sellingPrice: true } },
        },
      }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    // Ready stock grouped by product
    const readyMap = new Map<string, {
      productId: string; name: string; sellingPrice: number;
      quantity: number; reserved: number; cost: number; nearestExpiry: Date | null; locations: Set<string>;
    }>();
    for (const r of records) {
      const row = readyMap.get(r.product.id) ?? {
        productId: r.product.id, name: r.product.name, sellingPrice: Number(r.product.sellingPrice),
        quantity: 0, reserved: 0, cost: 0, nearestExpiry: null, locations: new Set<string>(),
      };
      row.quantity += Number(r.quantity);
      row.reserved += Number(r.reservedQty);
      row.cost += Number(r.quantity) * Number(r.unitCost ?? 0);
      if (r.expiryDate && (!row.nearestExpiry || r.expiryDate < row.nearestExpiry)) row.nearestExpiry = r.expiryDate;
      if (r.location?.name) row.locations.add(r.location.name);
      readyMap.set(r.product.id, row);
    }
    const now = Date.now();
    const ready = [...readyMap.values()]
      .map(r => {
        const available = r.quantity - r.reserved;
        const daysToExpiry = r.nearestExpiry ? Math.ceil((r.nearestExpiry.getTime() - now) / 86400000) : null;
        return {
          productId: r.productId, name: r.name,
          quantity: Math.round(r.quantity * 100) / 100,
          reserved: Math.round(r.reserved * 100) / 100,
          available: Math.round(available * 100) / 100,
          sellingPrice: r.sellingPrice,
          value: Math.round(available * r.sellingPrice * 100) / 100,
          cost: Math.round(r.cost * 100) / 100,
          nearestExpiry: r.nearestExpiry,
          daysToExpiry,
          expiryStatus: daysToExpiry === null ? 'none' : daysToExpiry <= 1 ? 'critical' : daysToExpiry <= 3 ? 'soon' : 'ok',
          locations: [...r.locations],
        };
      })
      .sort((a, b) => b.value - a.value);

    // Incoming pipeline grouped by product
    const incomingMap = new Map<string, {
      productId: string; name: string; sellingPrice: number; quantity: number; weeks: Set<string>;
    }>();
    for (const t of tasks) {
      if (!t.product) continue;
      const row = incomingMap.get(t.product.id) ?? {
        productId: t.product.id, name: t.product.name, sellingPrice: Number(t.product.sellingPrice),
        quantity: 0, weeks: new Set<string>(),
      };
      row.quantity += Number(t.quantity);
      row.weeks.add(`KW ${t.weeklyPlan.weekNumber}`);
      incomingMap.set(t.product.id, row);
    }
    const incoming = [...incomingMap.values()]
      .map(r => ({
        productId: r.productId, name: r.name,
        quantity: Math.round(r.quantity * 100) / 100,
        value: Math.round(r.quantity * r.sellingPrice * 100) / 100,
        weeks: [...r.weeks].sort(),
      }))
      .sort((a, b) => b.value - a.value);

    // Incoming grouped by week (availability forecast)
    const byWeekMap = new Map<number, { week: string; units: number; value: number }>();
    for (const t of tasks) {
      if (!t.product) continue;
      const wk = t.weeklyPlan.weekNumber;
      const row = byWeekMap.get(wk) ?? { week: `KW ${wk}`, units: 0, value: 0 };
      row.units += Number(t.quantity);
      row.value += Number(t.quantity) * Number(t.product.sellingPrice);
      byWeekMap.set(wk, row);
    }
    const byWeek = [...byWeekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => ({ ...v, units: Math.round(v.units * 100) / 100, value: Math.round(v.value * 100) / 100 }));

    // Sell-by urgency: anything expiring within 7 days, most urgent first
    const urgent = ready
      .filter(r => r.daysToExpiry !== null && r.daysToExpiry <= 7 && r.available > 0)
      .sort((a, b) => (a.daysToExpiry! - b.daysToExpiry!));

    const readyValue = Math.round(ready.reduce((s, r) => s + r.value, 0) * 100) / 100;
    const readyCost = ready.reduce((s, r) => s + r.cost, 0);
    const atRiskValue = Math.round(ready
      .filter(r => r.expiryStatus === 'critical' || r.expiryStatus === 'soon')
      .reduce((s, r) => s + r.value, 0) * 100) / 100;

    return {
      totals: {
        readyUnits: Math.round(ready.reduce((s, r) => s + r.available, 0) * 100) / 100,
        readyValue,
        potentialMarginPct: readyValue > 0 ? Math.round(((readyValue - readyCost) / readyValue) * 1000) / 10 : 0,
        reservedUnits: Math.round(ready.reduce((s, r) => s + r.reserved, 0) * 100) / 100,
        expiringSoon: ready.filter(r => r.expiryStatus === 'critical' || r.expiryStatus === 'soon').length,
        atRiskValue,
        assortment: { inStock: ready.filter(r => r.available > 0).length, totalActive: activeProductCount },
        incomingUnits: Math.round(incoming.reduce((s, r) => s + r.quantity, 0) * 100) / 100,
        incomingValue: Math.round(incoming.reduce((s, r) => s + r.value, 0) * 100) / 100,
      },
      ready,
      incoming,
      byWeek,
      urgent,
    };
  }

  async getForecast() {
    // Simple moving average based on last 7 days of production usage
    const since = new Date(Date.now() - 7 * 86400000);
    const usages = await this.prisma.ingredientUsage.findMany({
      where: { createdAt: { gte: since } },
      include: { batch: { select: { completedAt: true } } },
    });

    const byIngredient = new Map<string, { ingredientId: string; totalUsed: number; days: number }>();
    for (const u of usages) {
      const key = u.ingredientId;
      const ex = byIngredient.get(key);
      if (ex) { ex.totalUsed += Number(u.actualQty || u.plannedQty); }
      else byIngredient.set(key, { ingredientId: key, totalUsed: Number(u.actualQty || u.plannedQty), days: 7 });
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unit: true, currentStock: true, reorderLevel: true },
    });

    return ingredients.map(ing => {
      const usage = byIngredient.get(ing.id);
      const dailyUsage = usage ? usage.totalUsed / 7 : 0;
      const daysOfStock = dailyUsage > 0 ? Number(ing.currentStock) / dailyUsage : 999;
      const reorderIn = daysOfStock <= 7 ? 'urgent' : daysOfStock <= 14 ? 'soon' : 'ok';
      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        currentStock: Number(ing.currentStock),
        dailyUsage: Math.round(dailyUsage * 1000) / 1000,
        daysOfStock: Math.round(daysOfStock),
        reorderIn,
        suggestedOrder: Math.max(0, Number(ing.reorderLevel) * 2 - Number(ing.currentStock)),
      };
    });
  }

  // ─── ANNUAL PLAN: year-long revenue actual vs target ───────────────────────
  // Target is derived from the July 80% utilisation template (€20,146.80/week)
  static readonly ANNUAL_TARGET_WEEKLY = 20146.8;
  static readonly ANNUAL_TARGET_KW_FROM = 27; // July onwards

  async getAnnualPlan(year = 2026) {
    const TARGET = DashboardService.ANNUAL_TARGET_WEEKLY;

    const plans = await this.prisma.weeklyPlan.findMany({
      where: { year },
      include: {
        tasks: {
          where: { taskType: 'PRODUCTION' },
          include: { product: { select: { sellingPrice: true } } },
        },
      },
    });

    const planByKw = new Map(plans.map(p => [p.weekNumber, p]));
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const weeks = [];
    for (let kw = 1; kw <= 53; kw++) {
      const plan = planByKw.get(kw);
      let actual: number | null = null;
      if (plan && plan.tasks.length > 0) {
        actual = r2(plan.tasks.reduce((sum, t) =>
          sum + Number(t.quantity) * Number(t.product?.sellingPrice ?? 0), 0));
      }
      weeks.push({
        kw,
        week: `KW ${kw}`,
        actual: actual ?? undefined,
        target: r2(TARGET),
        hasData: actual !== null,
        isProjected: kw >= DashboardService.ANNUAL_TARGET_KW_FROM,
        status: plan?.status ?? null,
      });
    }

    return {
      year,
      targetWeeklyRevenue: TARGET,
      targetMonthlyRevenue: r2(TARGET * 4.33),
      targetUtilisationPct: 80.1,
      capacityHoursPerWeek: 78,
      weeks,
    };
  }

  async getSalesHistory(window: 'week' | 'month' | 'year') {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const now = new Date();
    const since = new Date(now);
    if (window === 'week') since.setDate(now.getDate() - 7);
    else if (window === 'month') since.setDate(now.getDate() - 30);
    else since.setFullYear(now.getFullYear() - 1);

    const movements = await this.prisma.storageMovement.findMany({
      where: { type: 'OUT', createdAt: { gte: since } },
      include: {
        storageRecord: {
          include: { product: { select: { id: true, name: true, sellingPrice: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate per product
    const byProduct = new Map<string, { id: string; name: string; units: number; revenue: number }>();
    let totalUnits = 0;
    let totalRevenue = 0;

    for (const m of movements) {
      const qty = Number(m.quantity);
      const price = Number(m.storageRecord?.product?.sellingPrice ?? m.storageRecord?.unitCost ?? 0);
      const rev = qty * price;
      const pid = m.storageRecord?.product?.id ?? 'unknown';
      const name = m.storageRecord?.product?.name ?? '—';
      const existing = byProduct.get(pid);
      if (existing) { existing.units += qty; existing.revenue += rev; }
      else byProduct.set(pid, { id: pid, name, units: qty, revenue: rev });
      totalUnits += qty;
      totalRevenue += rev;
    }

    // Build time-bucketed chart data
    const bucketMap = new Map<string, { label: string; units: number; revenue: number }>();
    for (const m of movements) {
      const d = new Date(m.createdAt);
      let label: string;
      if (window === 'week') {
        label = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      } else if (window === 'month') {
        label = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      } else {
        label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
      }
      const qty = Number(m.quantity);
      const price = Number(m.storageRecord?.product?.sellingPrice ?? m.storageRecord?.unitCost ?? 0);
      const rev = qty * price;
      const b = bucketMap.get(label) ?? { label, units: 0, revenue: 0 };
      b.units += qty; b.revenue += rev;
      bucketMap.set(label, b);
    }

    const topProducts = Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map(p => ({ ...p, revenue: r2(p.revenue) }));

    return {
      window,
      since: since.toISOString(),
      totalUnits: r2(totalUnits),
      totalRevenue: r2(totalRevenue),
      topProducts,
      chart: Array.from(bucketMap.values()).map(b => ({ ...b, revenue: r2(b.revenue) })),
    };
  }
}
