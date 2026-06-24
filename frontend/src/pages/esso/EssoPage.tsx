import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Area, AreaChart,
} from 'recharts';
import { TrendingDown, Target, AlertTriangle, CheckCircle, Info,
         Plus, Trash2, Play, Pencil, Sliders, BarChart2, Cpu } from 'lucide-react';
import { essoApi } from '../../api/client';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CurvePoint {
  volume: number; unitCost: number; totalCost: number;
  materialCpu: number; laborCpu: number; overheadCpu: number;
  qualityPenaltyCpu: number; revenue: number; margin: number;
  marginPct: number; isFeasible: boolean; tierLabel?: string;
}
interface SimResult {
  product: any; costModel: any; curve: CurvePoint[];
  sweetSpot: { volume: number; unitCost: number; margin: number; marginPct: number } | null;
  breakEven: { volume: number } | null;
  recommendations: { type: 'INFO' | 'WARNING' | 'SUCCESS'; message: string }[];
}

const TABS = ['Simulation', 'Cost Models', 'Scenarios', 'Capacity'] as const;
type Tab = typeof TABS[number];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function EssoPage() {
  const [tab, setTab] = useState<Tab>('Simulation');

  return (
    <div className="space-y-0">
      <PageHeader
        title="ESSO — Economies of Scale Optimization"
        subtitle="Identify optimal production volumes, break-even points, and cost efficiency sweet spots"
      />

      {/* Tab bar */}
      <div className="flex border-b border-[#D9D9D9] mb-5 -mt-2">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={tab === t
              ? { borderColor: '#FF385C', color: '#FF385C', background: 'transparent' }
              : { borderColor: 'transparent', color: '#6A6D70' }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Simulation' && <SimulationTab />}
      {tab === 'Cost Models' && <CostModelsTab />}
      {tab === 'Scenarios' && <ScenariosTab />}
      {tab === 'Capacity' && <CapacityTab />}
    </div>
  );
}

// ─── SIMULATION TAB ───────────────────────────────────────────────────────────

function SimulationTab() {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [minVol, setMinVol] = useState(10);
  const [maxVol, setMaxVol] = useState(300);
  const [step, setStep] = useState(5);
  const [result, setResult] = useState<SimResult | null>(null);
  const [chartView, setChartView] = useState<'cost' | 'margin' | 'decomp'>('cost');

  const { data: products = [] } = useQuery({
    queryKey: ['esso-products'],
    queryFn: () => essoApi.products().then(r => r.data),
  });

  const simulateMutation = useMutation({
    mutationFn: (dto: any) => essoApi.simulate(dto).then(r => r.data),
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Simulation failed'),
  });

  const run = () => {
    if (!selectedProductId) { toast.error('Select a product first'); return; }
    simulateMutation.mutate({ productId: selectedProductId, minVolume: minVol, maxVolume: maxVol, stepSize: step });
  };

  const feasibleCurve = result?.curve.filter(p => p.isFeasible) ?? [];
  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="label">Product</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="input"
            >
              <option value="">Select product…</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.sellingPrice)}
                  {p.essoCostModel ? ' ✓ model' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Min Volume (units/week)</label>
            <input type="number" value={minVol} onChange={e => setMinVol(+e.target.value)} className="input" min={1} />
          </div>
          <div>
            <label className="label">Max Volume (units/week)</label>
            <input type="number" value={maxVol} onChange={e => setMaxVol(+e.target.value)} className="input" min={1} />
          </div>
          <div>
            <label className="label">Step Size</label>
            <div className="flex gap-2">
              <input type="number" value={step} onChange={e => setStep(+e.target.value)} className="input" min={1} />
              <button onClick={run} disabled={simulateMutation.isPending} className="btn-primary whitespace-nowrap">
                <Play className="w-4 h-4" />
                {simulateMutation.isPending ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        </div>

        {selectedProduct && !selectedProduct.essoCostModel && (
          <div className="mt-3 px-3 py-2 flex items-center gap-2 text-xs text-[#7A4F00]"
               style={{ background: '#FEF3CD', borderLeft: '3px solid #E76500' }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            No cost model configured for this product. Using product-level costs (all variable). Configure a Cost Model for richer analysis.
          </div>
        )}
      </div>

      {result && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Sweet Spot" icon={<Target className="w-5 h-5" />} color="#FF385C"
              value={result.sweetSpot ? `${Math.round(result.sweetSpot.volume)} units/week` : '—'}
              sub={result.sweetSpot ? `€${result.sweetSpot.unitCost.toFixed(2)}/unit` : ''}
            />
            <KpiCard
              label="Unit Cost at Sweet Spot" icon={<TrendingDown className="w-5 h-5" />} color="#256F3A"
              value={result.sweetSpot ? formatCurrency(result.sweetSpot.unitCost) : '—'}
              sub={result.sweetSpot ? `Margin ${result.sweetSpot.marginPct.toFixed(1)}%` : ''}
            />
            <KpiCard
              label="Break-Even" icon={<BarChart2 className="w-5 h-5" />} color="#E76500"
              value={result.breakEven ? `${result.breakEven.volume} units/week` : '—'}
              sub="minimum for profitability"
            />
            <KpiCard
              label="Selling Price" icon={<Cpu className="w-5 h-5" />} color="#5A18A0"
              value={formatCurrency(result.product.sellingPrice)}
              sub={`Base material: ${formatCurrency(result.product.baseMaterialCpu)}/unit`}
            />
          </div>

          {/* Charts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Cost Curve Analysis</h2>
              <div className="flex gap-1">
                {(['cost', 'margin', 'decomp'] as const).map(v => (
                  <button key={v} onClick={() => setChartView(v)}
                    className="px-3 py-1 text-xs border transition-colors"
                    style={chartView === v
                      ? { background: '#FF385C', color: '#fff', borderColor: '#FF385C' }
                      : { background: '#fff', color: '#6A6D70', borderColor: '#D9D9D9' }}>
                    {v === 'cost' ? 'Unit Cost' : v === 'margin' ? 'Margin' : 'Cost Breakdown'}
                  </button>
                ))}
              </div>
            </div>

            {chartView === 'cost' && <CostCurveChart curve={feasibleCurve} sweetSpot={result.sweetSpot} breakEven={result.breakEven} />}
            {chartView === 'margin' && <MarginChart curve={feasibleCurve} sweetSpot={result.sweetSpot} breakEven={result.breakEven} />}
            {chartView === 'decomp' && <DecompChart curve={feasibleCurve} />}
          </div>

          {/* Recommendations */}
          <div className="card">
            <h2 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4">
              Actionable Recommendations
            </h2>
            <div className="space-y-2">
              {result.recommendations.map((r, i) => (
                <RecommendationRow key={i} rec={r} />
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="card">
            <h2 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4">
              Cost Curve Data Table
            </h2>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead style={{ background: '#FAFAFA', position: 'sticky', top: 0 }}>
                  <tr style={{ borderBottom: '2px solid #D9D9D9' }}>
                    {['Volume', 'Unit Cost', 'Material/u', 'Labor/u', 'Overhead/u', 'Quality/u', 'Total Cost', 'Revenue', 'Margin', 'Margin %', 'Tier'].map(h => (
                      <th key={h} className="table-header text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feasibleCurve.map((pt, i) => (
                    <tr key={i}
                      style={{
                        background: result.sweetSpot?.volume === pt.volume
                          ? '#FFF0F3'
                          : i % 2 === 0 ? '#fff' : '#FAFAFA',
                        borderBottom: '1px solid #EDEFF0',
                        fontWeight: result.sweetSpot?.volume === pt.volume ? 600 : 400,
                      }}>
                      <td className="table-cell">{pt.volume}</td>
                      <td className="table-cell" style={{ color: '#E31C5F' }}>{formatCurrency(pt.unitCost, 4)}</td>
                      <td className="table-cell">{formatCurrency(pt.materialCpu, 4)}</td>
                      <td className="table-cell">{formatCurrency(pt.laborCpu, 4)}</td>
                      <td className="table-cell">{formatCurrency(pt.overheadCpu, 4)}</td>
                      <td className="table-cell" style={{ color: pt.qualityPenaltyCpu > 0 ? '#BB0000' : undefined }}>
                        {formatCurrency(pt.qualityPenaltyCpu, 4)}
                      </td>
                      <td className="table-cell">{formatCurrency(pt.totalCost)}</td>
                      <td className="table-cell">{formatCurrency(pt.revenue)}</td>
                      <td className="table-cell" style={{ color: pt.margin >= 0 ? '#256F3A' : '#BB0000' }}>
                        {formatCurrency(pt.margin)}
                      </td>
                      <td className="table-cell" style={{ color: pt.marginPct >= 20 ? '#256F3A' : pt.marginPct >= 0 ? '#E76500' : '#BB0000' }}>
                        {pt.marginPct.toFixed(1)}%
                      </td>
                      <td className="table-cell text-[#6A6D70]">{pt.tierLabel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && (
        <div className="card flex flex-col items-center justify-center py-20 text-[#6A6D70]">
          <Sliders className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Select a product and click Run to generate the cost curve analysis.</p>
        </div>
      )}
    </div>
  );
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────

function CostCurveChart({ curve, sweetSpot, breakEven }: { curve: CurvePoint[]; sweetSpot: any; breakEven: any }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={curve} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
        <XAxis dataKey="volume" tick={{ fontSize: 11, fill: '#6A6D70' }} label={{ value: 'Units/week', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="cost" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `€${v.toFixed(2)}`} axisLine={false} tickLine={false} />
        <YAxis yAxisId="margin" orientation="right" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `€${v}`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: any, name: string) => [name.includes('Margin') ? formatCurrency(v) : formatCurrency(v, 4), name]}
          contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 0, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="margin" dataKey="margin" name="Weekly Margin (€)" fill="#256F3A" opacity={0.25} radius={0} />
        <Line yAxisId="cost" type="monotone" dataKey="unitCost" name="Unit Cost (€)" stroke="#FF385C" strokeWidth={2.5} dot={false} />
        {sweetSpot && <ReferenceLine yAxisId="cost" x={sweetSpot.volume} stroke="#FF385C" strokeDasharray="4 2" label={{ value: '★ Sweet Spot', fill: '#FF385C', fontSize: 10, position: 'insideTopRight' }} />}
        {breakEven && <ReferenceLine yAxisId="cost" x={breakEven.volume} stroke="#E76500" strokeDasharray="4 2" label={{ value: '◆ Break-Even', fill: '#E76500', fontSize: 10, position: 'insideTopLeft' }} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function MarginChart({ curve, sweetSpot, breakEven }: { curve: CurvePoint[]; sweetSpot: any; breakEven: any }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={curve} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
        <XAxis dataKey="volume" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="pct" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
        <YAxis yAxisId="abs" orientation="right" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `€${v}`} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 0, fontSize: 12 }}
          formatter={(v: any, name: string) => [name.includes('%') ? `${Number(v).toFixed(1)}%` : formatCurrency(v), name]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine yAxisId="pct" y={20} stroke="#D9D9D9" strokeDasharray="3 3" label={{ value: '20% threshold', fill: '#6A6D70', fontSize: 10 }} />
        <Area yAxisId="abs" type="monotone" dataKey="margin" name="Weekly Margin (€)" stroke="#256F3A" fill="#E8F5E9" fillOpacity={0.5} strokeWidth={2} dot={false} />
        <Line yAxisId="pct" type="monotone" dataKey="marginPct" name="Margin %" stroke="#FF385C" strokeWidth={2} dot={false} />
        {sweetSpot && <ReferenceLine yAxisId="pct" x={sweetSpot.volume} stroke="#FF385C" strokeDasharray="4 2" label={{ value: '★', fill: '#FF385C', fontSize: 14, position: 'insideTop' }} />}
        {breakEven && <ReferenceLine yAxisId="pct" x={breakEven.volume} stroke="#E76500" strokeDasharray="4 2" />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function DecompChart({ curve }: { curve: CurvePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={curve} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
        <XAxis dataKey="volume" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `€${v.toFixed(2)}`} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 0, fontSize: 12 }}
          formatter={(v: any, name: string) => [formatCurrency(Number(v), 4), name]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="materialCpu" name="Material/unit" stackId="1" stroke="#FF385C" fill="#FFF0F3" strokeWidth={1} />
        <Area type="monotone" dataKey="laborCpu" name="Labor/unit" stackId="1" stroke="#256F3A" fill="#E8F5E9" strokeWidth={1} />
        <Area type="monotone" dataKey="overheadCpu" name="Overhead/unit" stackId="1" stroke="#E76500" fill="#FFF3E0" strokeWidth={1} />
        <Area type="monotone" dataKey="qualityPenaltyCpu" name="Quality Penalty/unit" stackId="1" stroke="#BB0000" fill="#FFEAEA" strokeWidth={1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── COST MODELS TAB ──────────────────────────────────────────────────────────

function CostModelsTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['esso-cost-models'],
    queryFn: () => essoApi.costModels.list().then(r => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['esso-products'],
    queryFn: () => essoApi.products().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => essoApi.costModels.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['esso-cost-models'] }); toast.success('Model removed'); },
  });

  const productsWithoutModel = products.filter((p: any) => !p.essoCostModel);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[#6A6D70]">
          Configure fixed vs variable cost decomposition and bulk pricing tiers per product.
        </p>
        <button onClick={() => { setSelected(null); setModal('edit'); }} className="btn-primary btn-sm">
          <Plus className="w-3 h-3" /> New Cost Model
        </button>
      </div>

      {isLoading ? (
        <div className="card text-center py-10 text-[#6A6D70] text-sm">Loading…</div>
      ) : models.length === 0 ? (
        <div className="card text-center py-10 text-[#6A6D70] text-sm">
          No cost models configured. Add one to enable richer ESSO analysis.
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((m: any) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#32363A]">{m.product?.name}</p>
                  <p className="text-xs text-[#6A6D70] mt-0.5">{m.product?.code}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelected(m); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => { if (confirm('Delete cost model?')) deleteMutation.mutate(m.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                {[
                  ['Fixed Overhead', formatCurrency(m.fixedOverhead) + '/week'],
                  ['Labor Fixed', formatCurrency(m.laborFixed) + '/week'],
                  ['Labor Variable', formatCurrency(m.laborVariable) + '/unit'],
                  ['Min Batch', m.minBatch + ' units'],
                  ['Max Capacity', m.maxCapacity + ' units/wk'],
                  ['Quality Factor', (m.qualityFactor * 100).toFixed(1) + '%'],
                ].map(([k, v]) => (
                  <div key={k} className="p-2" style={{ background: '#FAFAFA', border: '1px solid #EDEFF0' }}>
                    <p className="text-xs text-[#6A6D70] uppercase tracking-wide">{k}</p>
                    <p className="text-sm font-medium text-[#32363A] mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {m.tiers?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Bulk Pricing Tiers</p>
                  <div className="flex flex-wrap gap-2">
                    {m.tiers.map((t: any) => (
                      <span key={t.id} className="badge-blue text-xs">
                        {t.label}: ≥{t.minQty} units/month → {t.discountPct}% discount
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'edit' && (
        <Modal title={selected ? 'Edit Cost Model' : 'New Cost Model'} onClose={() => setModal(null)} size="lg">
          <CostModelForm
            model={selected}
            products={selected ? [selected.product] : productsWithoutModel}
            onClose={() => setModal(null)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['esso-cost-models'] }); qc.invalidateQueries({ queryKey: ['esso-products'] }); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function CostModelForm({ model, products, onClose, onSaved }: any) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: model
      ? { ...model, tiers: model.tiers ?? [] }
      : { fixedOverhead: 500, laborFixed: 2000, laborVariable: 0.5, minBatch: 10, maxCapacity: 300, optimalBatchHint: 0, qualityFactor: 0.002, baseWasteRate: 0.02, tiers: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const productId = model ? model.product.id : data.productId;
      const { productId: _pid, product: _p, ...rest } = data;
      await essoApi.costModels.upsert(productId, rest);
      toast.success('Cost model saved');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!model && (
        <div>
          <label className="label">Product *</label>
          <select {...register('productId', { required: true })} className="input">
            <option value="">Select product…</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {model && (
        <div className="px-3 py-2 text-sm font-medium text-[#32363A]" style={{ background: '#FAFAFA', border: '1px solid #D9D9D9' }}>
          Product: {model.product?.name}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Fixed Overhead (€/week)</label>
          <input {...register('fixedOverhead', { valueAsNumber: true })} type="number" step="0.01" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Rent, utilities, equipment amortization</p>
        </div>
        <div>
          <label className="label">Fixed Labor (€/week)</label>
          <input {...register('laborFixed', { valueAsNumber: true })} type="number" step="0.01" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Salaried staff, minimum crew</p>
        </div>
        <div>
          <label className="label">Variable Labor (€/unit)</label>
          <input {...register('laborVariable', { valueAsNumber: true })} type="number" step="0.001" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Overtime / casual labor per unit</p>
        </div>
        <div>
          <label className="label">Min Viable Batch (units)</label>
          <input {...register('minBatch', { valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Max Weekly Capacity (units)</label>
          <input {...register('maxCapacity', { valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Optimal Batch Hint (0 = auto)</label>
          <input {...register('optimalBatchHint', { valueAsNumber: true })} type="number" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Volume above which diseconomies apply</p>
        </div>
        <div>
          <label className="label">Quality Factor (%)</label>
          <input {...register('qualityFactor', { valueAsNumber: true })} type="number" step="0.0001" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Cost increase rate per unit above optimal (e.g. 0.002)</p>
        </div>
        <div>
          <label className="label">Base Waste Rate (%)</label>
          <input {...register('baseWasteRate', { valueAsNumber: true })} type="number" step="0.001" className="input" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Baseline ingredient waste (e.g. 0.02 = 2%)</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Bulk Pricing Tiers</label>
          <button type="button" onClick={() => append({ label: '', minQty: 100, discountPct: 5 })} className="btn-secondary btn-sm">
            <Plus className="w-3 h-3" /> Add Tier
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-center p-2" style={{ background: '#FAFAFA', border: '1px solid #EDEFF0' }}>
              <div className="col-span-4">
                <input {...register(`tiers.${i}.label`)} placeholder="Tier name (e.g. Bulk METRO)" className="input text-xs" />
              </div>
              <div className="col-span-3">
                <input {...register(`tiers.${i}.minQty`, { valueAsNumber: true })} type="number" placeholder="Min qty/month" className="input text-xs" />
              </div>
              <div className="col-span-3">
                <input {...register(`tiers.${i}.discountPct`, { valueAsNumber: true })} type="number" step="0.1" placeholder="Discount %" className="input text-xs" />
              </div>
              <button type="button" onClick={() => remove(i)} className="col-span-2 btn-sm btn-danger justify-center">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-xs text-[#6A6D70] py-2">No tiers — add bulk pricing thresholds to model supplier discounts.</p>}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Cost Model'}</button>
      </div>
    </form>
  );
}

// ─── SCENARIOS TAB ────────────────────────────────────────────────────────────

function ScenariosTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareResults, setCompareResults] = useState<Record<string, SimResult>>({});

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['esso-scenarios'],
    queryFn: () => essoApi.scenarios.list().then(r => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['esso-products'],
    queryFn: () => essoApi.products().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => essoApi.scenarios.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esso-scenarios'] }),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => essoApi.scenarios.run(id).then(r => r.data),
    onSuccess: (data, id) => {
      toast.success('Scenario computed');
      qc.invalidateQueries({ queryKey: ['esso-scenarios'] });
      setCompareResults(prev => ({ ...prev, [id]: data }));
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[#6A6D70]">Save and compare simulation scenarios side-by-side.</p>
        <button onClick={() => setModal('create')} className="btn-primary btn-sm"><Plus className="w-3 h-3" /> New Scenario</button>
      </div>

      {isLoading ? (
        <div className="card text-center py-10 text-[#6A6D70] text-sm">Loading…</div>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s: any) => {
            const lastResult = s.results?.[0];
            return (
              <div key={s.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={compareIds.includes(s.id)} onChange={() => toggleCompare(s.id)} className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-semibold text-[#32363A]">{s.name}</p>
                      <p className="text-xs text-[#6A6D70]">{s.product?.name} · Vol {s.minVolume}–{s.maxVolume} · Step {s.stepSize}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {lastResult && (
                      <div className="text-right text-xs text-[#6A6D70]">
                        <span className="badge-blue mr-2">Sweet spot: {Math.round(lastResult.sweetSpotVolume)} u/wk</span>
                        <span className="badge-green">Margin: {lastResult.optimalMarginPct.toFixed(1)}%</span>
                      </div>
                    )}
                    <button onClick={() => runMutation.mutate(s.id)} disabled={runMutation.isPending} className="btn-sm btn-primary">
                      <Play className="w-3 h-3" /> Run
                    </button>
                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {scenarios.length === 0 && (
            <div className="card text-center py-10 text-[#6A6D70] text-sm">No scenarios yet.</div>
          )}
        </div>
      )}

      {compareIds.length >= 2 && Object.keys(compareResults).length >= 2 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4">Scenario Comparison</h2>
          <ComparisonChart scenarios={compareIds.map(id => ({ id, result: compareResults[id], name: scenarios.find((s: any) => s.id === id)?.name ?? id }))} />
        </div>
      )}

      {modal === 'create' && (
        <Modal title="New Scenario" onClose={() => setModal(null)}>
          <ScenarioForm
            products={products}
            onClose={() => setModal(null)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['esso-scenarios'] }); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function ScenarioForm({ products, onClose, onSaved }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: { name: '', productId: '', minVolume: 10, maxVolume: 300, stepSize: 5 },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await essoApi.scenarios.create(data);
      toast.success('Scenario created');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Scenario Name *</label>
        <input {...register('name', { required: true })} className="input" placeholder="e.g. Mini Cheesecake — High Volume" />
      </div>
      <div>
        <label className="label">Product *</label>
        <select {...register('productId', { required: true })} className="input">
          <option value="">Select product…</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Min Volume</label>
          <input {...register('minVolume', { valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Max Volume</label>
          <input {...register('maxVolume', { valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Step Size</label>
          <input {...register('stepSize', { valueAsNumber: true })} type="number" className="input" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Scenario'}</button>
      </div>
    </form>
  );
}

function ComparisonChart({ scenarios }: { scenarios: { id: string; result: SimResult; name: string }[] }) {
  const COLORS = ['#FF385C', '#256F3A', '#E76500', '#BB0000'];
  const maxLen = Math.max(...scenarios.map(s => s.result.curve.filter(p => p.isFeasible).length));
  const combined: any[] = [];
  for (let i = 0; i < maxLen; i++) {
    const pt: any = {};
    scenarios.forEach((s, si) => {
      const c = s.result.curve.filter(p => p.isFeasible)[i];
      if (c) { pt.volume = c.volume; pt[`unitCost_${si}`] = c.unitCost; }
    });
    if (pt.volume !== undefined) combined.push(pt);
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={combined} margin={{ left: 10, right: 10 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
        <XAxis dataKey="volume" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => `€${v.toFixed(2)}`} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 0, fontSize: 12 }}
          formatter={(v: any) => [formatCurrency(Number(v), 4), '']} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {scenarios.map((s, i) => (
          <Line key={s.id} type="monotone" dataKey={`unitCost_${i}`} name={s.name}
            stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── CAPACITY TAB ─────────────────────────────────────────────────────────────

function CapacityTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: capacities = [], isLoading } = useQuery({
    queryKey: ['esso-capacities'],
    queryFn: () => essoApi.capacities.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => essoApi.capacities.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esso-capacities'] }),
  });

  const TYPES = ['OVEN', 'LABOR', 'STORAGE', 'DAILY'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[#6A6D70]">Define hard production limits — these cap the feasible simulation range.</p>
        <button onClick={() => { setSelected(null); setModal('edit'); }} className="btn-primary btn-sm"><Plus className="w-3 h-3" /> Add Constraint</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!isLoading && capacities.length === 0 && (
          <div className="card col-span-2 text-center py-10 text-[#6A6D70] text-sm">
            No capacity constraints defined. Simulations will use Cost Model max capacity or the input range.
          </div>
        )}
        {capacities.map((c: any) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge-blue text-xs mr-2">{c.type}</span>
                <span className="text-sm font-semibold text-[#32363A]">{c.name}</span>
                <p className="text-lg font-bold text-[#FF385C] mt-1">{c.maxUnits} <span className="text-xs font-normal text-[#6A6D70]">{c.unitLabel}</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelected(c); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(c.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal === 'edit' && (
        <Modal title={selected ? 'Edit Constraint' : 'New Capacity Constraint'} onClose={() => setModal(null)} size="sm">
          <CapacityForm
            capacity={selected}
            types={TYPES}
            onClose={() => setModal(null)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['esso-capacities'] }); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function CapacityForm({ capacity, types, onClose, onSaved }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: capacity ?? { name: '', type: 'OVEN', maxUnits: 200, unitLabel: 'units/week' },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await essoApi.capacities.upsert(data);
      toast.success('Constraint saved');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input {...register('name', { required: true })} className="input" placeholder="e.g. Backofen Kapazität" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select {...register('type')} className="input">
            {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Max Units</label>
          <input {...register('maxUnits', { valueAsNumber: true })} type="number" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Unit Label</label>
        <input {...register('unitLabel')} className="input" placeholder="units/week" />
      </div>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: any) {
  return (
    <div className="bg-white border border-[#D9D9D9] overflow-hidden">
      <div style={{ height: 3, background: color }} />
      <div className="px-4 py-3 flex items-start justify-between">
        <div>
          <p className="text-xs text-[#6A6D70] uppercase tracking-wide font-medium">{label}</p>
          <p className="text-lg font-semibold text-[#32363A] mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-[#6A6D70] mt-1">{sub}</p>}
        </div>
        <div className="p-2 ml-2 shrink-0" style={{ background: color + '18', color, borderRadius: 4 }}>{icon}</div>
      </div>
    </div>
  );
}

function RecommendationRow({ rec }: { rec: { type: string; message: string } }) {
  const cfg = {
    SUCCESS: { icon: <CheckCircle className="w-4 h-4 shrink-0" />, color: '#256F3A', bg: '#E8F5E9', border: '#A3D9A5' },
    WARNING: { icon: <AlertTriangle className="w-4 h-4 shrink-0" />, color: '#7A4F00', bg: '#FEF3CD', border: '#FADA92' },
    INFO:    { icon: <Info className="w-4 h-4 shrink-0" />, color: '#E31C5F', bg: '#FFF0F3', border: '#FFC2CF' },
  }[rec.type as 'SUCCESS' | 'WARNING' | 'INFO'] ?? { icon: <Info className="w-4 h-4 shrink-0" />, color: '#6A6D70', bg: '#F5F5F5', border: '#D9D9D9' };

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 text-sm"
         style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.icon}
      <span>{rec.message}</span>
    </div>
  );
}
