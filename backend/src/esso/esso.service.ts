import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CurvePoint {
  volume: number;
  unitCost: number;
  totalCost: number;
  materialCpu: number;
  laborCpu: number;
  overheadCpu: number;
  qualityPenaltyCpu: number;
  revenue: number;
  margin: number;
  marginPct: number;
  isFeasible: boolean;
  tierLabel?: string;
}

export interface SimulationOutput {
  product: any;
  costModel: any;
  curve: CurvePoint[];
  sweetSpot: { volume: number; unitCost: number; margin: number; marginPct: number } | null;
  breakEven: { volume: number } | null;
  recommendations: { type: 'INFO' | 'WARNING' | 'SUCCESS'; message: string }[];
}

@Injectable()
export class EssoService {
  constructor(private prisma: PrismaService) {}

  // ─── SIMULATION ENGINE ────────────────────────────────────────────────────

  async simulate(dto: {
    productId: string;
    minVolume: number;
    maxVolume: number;
    stepSize: number;
    costModelId?: string;
  }): Promise<SimulationOutput> {
    // Load product + recipe
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        recipe: {
          include: { components: { include: { ingredient: true } } },
        },
        essoCostModel: { include: { tiers: { orderBy: { minQty: 'asc' } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Resolve cost model
    let costModel = product.essoCostModel;
    if (dto.costModelId) {
      costModel = await this.prisma.essoCostModel.findUnique({
        where: { id: dto.costModelId },
        include: { tiers: { orderBy: { minQty: 'asc' } } },
      }) as any;
    }

    // Base material cost per unit from recipe
    let baseMaterialCpu = 0;
    if (product.recipe?.components) {
      const totalMaterial = product.recipe.components.reduce(
        (s: number, c: any) => s + Number(c.quantity) * Number(c.ingredient?.unitCost || 0),
        0,
      );
      baseMaterialCpu = totalMaterial / Number(product.recipe.yield || 1);
    }

    // Capacity constraints
    const capacities = await this.prisma.essoCapacity.findMany({ where: { isActive: true } });
    const hardCap = capacities.length > 0
      ? Math.min(...capacities.map((c: any) => Number(c.maxUnits)))
      : (costModel ? Number(costModel.maxCapacity) : dto.maxVolume);

    const effectiveMax = Math.min(dto.maxVolume, hardCap, costModel ? Number(costModel.maxCapacity) : dto.maxVolume);

    // Build cost curve
    const curve: CurvePoint[] = [];
    const volumes = this._range(dto.minVolume, dto.maxVolume, dto.stepSize);

    // Add tier thresholds explicitly so they appear as inflection points
    if (costModel?.tiers) {
      for (const tier of (costModel as any).tiers) {
        const weeklyForTier = Number(tier.minQty) / 4;
        if (weeklyForTier > dto.minVolume && weeklyForTier < dto.maxVolume) {
          volumes.push(weeklyForTier - 1, weeklyForTier);
        }
      }
      volumes.sort((a, b) => a - b);
    }

    for (const V of volumes) {
      const pt = this._computePoint(product, costModel, baseMaterialCpu, V, effectiveMax);
      curve.push(pt);
    }

    // Detect sweet spot (min unit cost in feasible zone)
    const feasible = curve.filter(p => p.isFeasible);
    let sweetSpot = null;
    if (feasible.length > 0) {
      const best = feasible.reduce((a, b) => (a.unitCost < b.unitCost ? a : b));
      sweetSpot = {
        volume: best.volume,
        unitCost: best.unitCost,
        margin: best.margin,
        marginPct: best.marginPct,
      };
    }

    // Detect break-even (where margin crosses 0)
    let breakEven: { volume: number } | null = null;
    for (let i = 1; i < curve.length; i++) {
      if (curve[i - 1].margin < 0 && curve[i].margin >= 0) {
        breakEven = { volume: Math.round((curve[i - 1].volume + curve[i].volume) / 2) };
        break;
      }
    }
    if (!breakEven && curve[0]?.margin >= 0) {
      breakEven = { volume: dto.minVolume };
    }

    const recommendations = this._buildRecommendations(
      product, costModel, curve, sweetSpot, breakEven, effectiveMax,
    );

    return {
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
        sellingPrice: product.sellingPrice,
        baseMaterialCpu,
      },
      costModel,
      curve,
      sweetSpot,
      breakEven,
      recommendations,
    };
  }

  private _computePoint(
    product: any,
    costModel: any,
    baseMaterialCpu: number,
    V: number,
    maxCap: number,
  ): CurvePoint {
    const sellingPrice = Number(product.sellingPrice);

    if (V > maxCap) {
      return {
        volume: V, unitCost: 0, totalCost: 0, materialCpu: 0, laborCpu: 0,
        overheadCpu: 0, qualityPenaltyCpu: 0, revenue: 0, margin: 0, marginPct: 0,
        isFeasible: false,
      };
    }

    // Tier discount based on estimated monthly volume
    const monthlyEst = V * 4.33;
    let activeTier: any = null;
    if (costModel?.tiers) {
      for (const t of (costModel as any).tiers) {
        if (monthlyEst >= Number(t.minQty)) activeTier = t;
      }
    }
    const discount = activeTier ? Number(activeTier.discountPct) / 100 : 0;

    // Material cost per unit with waste and tier discount
    const wasteRate = costModel ? Number(costModel.baseWasteRate) : 0.02;
    const materialCpu = baseMaterialCpu * (1 - discount) * (1 + wasteRate);

    // Labor — use time-based cost when labourTimeMinutes is set on the recipe
    const LABOUR_RATE = 20; // €/hr
    const labourTimeMinutes = Number(product.recipe?.labourTimeMinutes || 0);
    const recipeYield = Number(product.recipe?.yield || 1);
    const timeLaborCpu = labourTimeMinutes > 0
      ? (labourTimeMinutes / 60) * LABOUR_RATE / recipeYield
      : Number(product.laborCost || 0);
    const laborFixed = costModel ? Number(costModel.laborFixed) : 0;
    const laborVariable = costModel ? Number(costModel.laborVariable) : timeLaborCpu;
    const laborCpu = laborFixed / V + laborVariable;

    // Overhead
    const overheadFixed = costModel ? Number(costModel.fixedOverhead) : 0;
    const overheadVariable = Number(product.overheadCost || 0);
    const overheadCpu = overheadFixed / V + overheadVariable;

    // Quality/diseconomy penalty above optimal batch
    let qualityPenaltyCpu = 0;
    if (costModel) {
      const optimal = Number(costModel.optimalBatchHint) > 0
        ? Number(costModel.optimalBatchHint)
        : Number(costModel.maxCapacity) * 0.5;
      if (V > optimal) {
        const excess = (V - optimal) / optimal;
        qualityPenaltyCpu = materialCpu * excess * Number(costModel.qualityFactor);
      }
    }

    const packagingCpu = Number(product.packagingCost || 0);
    const unitCost = materialCpu + laborCpu + overheadCpu + qualityPenaltyCpu + packagingCpu;
    const totalCost = unitCost * V;
    const revenue = sellingPrice * V;
    const margin = revenue - totalCost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      volume: Math.round(V * 10) / 10,
      unitCost: Math.round(unitCost * 10000) / 10000,
      totalCost: Math.round(totalCost * 100) / 100,
      materialCpu: Math.round(materialCpu * 10000) / 10000,
      laborCpu: Math.round(laborCpu * 10000) / 10000,
      overheadCpu: Math.round(overheadCpu * 10000) / 10000,
      qualityPenaltyCpu: Math.round(qualityPenaltyCpu * 10000) / 10000,
      revenue: Math.round(revenue * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginPct: Math.round(marginPct * 100) / 100,
      isFeasible: true,
      tierLabel: activeTier?.label,
    };
  }

  private _buildRecommendations(
    product: any,
    costModel: any,
    curve: CurvePoint[],
    sweetSpot: any,
    breakEven: any,
    maxCap: number,
  ): { type: 'INFO' | 'WARNING' | 'SUCCESS'; message: string }[] {
    const recs: { type: 'INFO' | 'WARNING' | 'SUCCESS'; message: string }[] = [];

    if (!sweetSpot) {
      recs.push({ type: 'WARNING', message: 'No feasible production volume found. Check capacity constraints.' });
      return recs;
    }

    recs.push({ type: 'SUCCESS', message: `Optimal production volume for ${product.name}: ${Math.round(sweetSpot.volume)} units/week at €${sweetSpot.unitCost.toFixed(2)}/unit.` });

    if (breakEven) {
      recs.push({ type: 'INFO', message: `Break-even point: ${breakEven.volume} units/week. Below this, production operates at a loss.` });
    }

    if (sweetSpot.marginPct < 20) {
      recs.push({ type: 'WARNING', message: `Margin at sweet spot is ${sweetSpot.marginPct.toFixed(1)}% — below the recommended 20% threshold. Review pricing or ingredient costs.` });
    } else {
      recs.push({ type: 'SUCCESS', message: `Margin at optimal volume: ${sweetSpot.marginPct.toFixed(1)}%` });
    }

    if (costModel?.tiers?.length > 0) {
      const firstTier = (costModel as any).tiers[0];
      const weeklyThreshold = Number(firstTier.minQty) / 4.33;
      if (sweetSpot.volume < weeklyThreshold) {
        recs.push({ type: 'WARNING', message: `Increase production to ≥${Math.ceil(weeklyThreshold)} units/week (${firstTier.minQty} units/month) to unlock bulk pricing tier "${firstTier.label}" (${firstTier.discountPct}% ingredient discount).` });
      } else {
        recs.push({ type: 'SUCCESS', message: `Bulk pricing tier "${firstTier.label}" is active at optimal volume — ${firstTier.discountPct}% ingredient discount applied.` });
      }
    }

    if (sweetSpot.volume >= maxCap * 0.95) {
      recs.push({ type: 'INFO', message: `Optimal volume is at or near production capacity (${maxCap} units/week). Consider expanding capacity to improve unit economics.` });
    }

    const basePoint = curve.find(p => p.isFeasible);
    if (basePoint && sweetSpot.unitCost < basePoint.unitCost) {
      const saving = basePoint.unitCost - sweetSpot.unitCost;
      const savingPct = (saving / basePoint.unitCost) * 100;
      recs.push({ type: 'INFO', message: `Scaling to optimal volume reduces unit cost by €${saving.toFixed(2)} (${savingPct.toFixed(0)}%) compared to minimum batch.` });
    }

    return recs;
  }

  private _range(min: number, max: number, step: number): number[] {
    const pts: number[] = [];
    for (let v = min; v <= max; v += step) pts.push(v);
    if (pts[pts.length - 1] !== max) pts.push(max);
    return pts;
  }

  // ─── COST MODEL CRUD ──────────────────────────────────────────────────────

  async getCostModels() {
    return this.prisma.essoCostModel.findMany({
      where: { isActive: true },
      include: {
        product: { select: { id: true, name: true, code: true, sellingPrice: true } },
        tiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCostModel(id: string) {
    const m = await this.prisma.essoCostModel.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, code: true, sellingPrice: true } },
        tiers: { orderBy: { minQty: 'asc' } },
      },
    });
    if (!m) throw new NotFoundException('Cost model not found');
    return m;
  }

  async upsertCostModel(productId: string, dto: any) {
    const { tiers, ...data } = dto;
    const existing = await this.prisma.essoCostModel.findUnique({ where: { productId } });

    let model: any;
    if (existing) {
      model = await this.prisma.essoCostModel.update({
        where: { productId },
        data,
        include: { tiers: true },
      });
      // Replace tiers
      if (tiers !== undefined) {
        await this.prisma.essoCostTier.deleteMany({ where: { costModelId: model.id } });
        if (tiers.length > 0) {
          await this.prisma.essoCostTier.createMany({
            data: tiers.map((t: any) => ({ ...t, costModelId: model.id })),
          });
        }
      }
    } else {
      model = await this.prisma.essoCostModel.create({
        data: { ...data, productId },
        include: { tiers: true },
      });
      if (tiers?.length > 0) {
        await this.prisma.essoCostTier.createMany({
          data: tiers.map((t: any) => ({ ...t, costModelId: model.id })),
        });
      }
    }

    return this.getCostModel(model.id);
  }

  async deleteCostModel(id: string) {
    await this.getCostModel(id);
    return this.prisma.essoCostModel.update({ where: { id }, data: { isActive: false } });
  }

  // ─── CAPACITY CRUD ────────────────────────────────────────────────────────

  async getCapacities() {
    return this.prisma.essoCapacity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsertCapacity(dto: any) {
    const { id, ...data } = dto;
    if (id) {
      return this.prisma.essoCapacity.update({ where: { id }, data });
    }
    return this.prisma.essoCapacity.create({ data });
  }

  async deleteCapacity(id: string) {
    return this.prisma.essoCapacity.update({ where: { id }, data: { isActive: false } });
  }

  // ─── SCENARIO CRUD ────────────────────────────────────────────────────────

  async getScenarios() {
    return this.prisma.essoScenario.findMany({
      where: { isActive: true },
      include: {
        product: { select: { id: true, name: true, code: true } },
        results: { orderBy: { runAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createScenario(dto: any) {
    return this.prisma.essoScenario.create({
      data: dto,
      include: { product: { select: { id: true, name: true, code: true } } },
    });
  }

  async updateScenario(id: string, dto: any) {
    return this.prisma.essoScenario.update({
      where: { id },
      data: dto,
      include: { product: { select: { id: true, name: true, code: true } } },
    });
  }

  async deleteScenario(id: string) {
    return this.prisma.essoScenario.update({ where: { id }, data: { isActive: false } });
  }

  async runAndSaveScenario(id: string): Promise<SimulationOutput & { savedResult: any }> {
    const scenario = await this.prisma.essoScenario.findUnique({ where: { id } });
    if (!scenario) throw new NotFoundException('Scenario not found');

    const output = await this.simulate({
      productId: scenario.productId,
      minVolume: Number(scenario.minVolume),
      maxVolume: Number(scenario.maxVolume),
      stepSize: Number(scenario.stepSize),
      costModelId: scenario.costModelId ?? undefined,
    });

    const saved = await this.prisma.essoResult.create({
      data: {
        scenarioId: id,
        sweetSpotVolume: output.sweetSpot?.volume ?? 0,
        breakEvenVolume: output.breakEven?.volume ?? 0,
        optimalMarginPct: output.sweetSpot?.marginPct ?? 0,
        costCurveJson: JSON.stringify(output.curve),
        recommendJson: JSON.stringify(output.recommendations),
      },
    });

    return { ...output, savedResult: saved };
  }

  async getProducts() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        recipe: {
          select: {
            id: true, yield: true, labourTimeMinutes: true, bakingTimeMinutes: true,
            components: { include: { ingredient: { select: { unitCost: true } } } },
          },
        },
        essoCostModel: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
