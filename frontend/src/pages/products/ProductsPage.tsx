import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Calculator, List, LayoutGrid, EyeOff, Eye } from 'lucide-react';
import { productsApi, recipesApi } from '../../api/client';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────

function ProductForm({ product, categories, recipes, onSubmit, onClose }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: product || { sellingPrice: 0, laborCost: 0, overheadCost: 0, packagingCost: 0 },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Code *</label>
          <input {...register('code', { required: true })} className="input" placeholder="PRD001" />
        </div>
        <div>
          <label className="label">Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Classic Vanilla Cake" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input {...register('description')} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select {...register('categoryId')} className="input">
            <option value="">— None —</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Recipe</label>
          <select {...register('recipeId')} className="input">
            <option value="">— None —</option>
            {recipes?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Selling Price (€) *</label>
          <input {...register('sellingPrice', { required: true, valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="label">Packaging Cost (€)</label>
          <input {...register('packagingCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Overhead Cost (€)</label>
          <input {...register('overheadCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="label">Legacy Labor Cost (€) <span className="text-[#6A6D70] font-normal text-xs">— use recipe Labour Time instead</span></label>
          <input {...register('laborCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Allergen Info</label>
          <input {...register('allergenInfo')} className="input" placeholder="Gluten, Dairy, Eggs" />
        </div>
        <div>
          <label className="label">Shelf Life (days)</label>
          <input {...register('shelfLifeDays', { valueAsNumber: true })} type="number" className="input" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary">Save Product</button>
      </div>
    </form>
  );
}

// ─── KALKULATION MODAL ────────────────────────────────────────────────────────

interface KalkParams {
  labourRatePerMin: number; // €/min
  overheadPct: number;      // Grundkostenzuschlag %
  bakingLossPct: number;    // Back-/Fertigungsverlust %
  lossPct: number;          // Verluste (sales loss/spoilage) %
  profitPct: number;        // Gewinn & Risiko %
  vatPct: number;           // MwSt %
}

function toGrams(qty: number, unit: string): number {
  const u = (unit || '').toUpperCase();
  if (u === 'KG') return qty * 1000;
  if (u === 'G' || u === 'GR' || u === 'GRAMM') return qty;
  if (u === 'L' || u === 'LITER') return qty * 1000;
  if (u === 'ML') return qty;
  return qty; // for pieces, units, etc.
}

function KalkulationModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { data: detail } = useQuery({
    queryKey: ['product-detail', product.id],
    queryFn: () => productsApi.get(product.id).then(r => r.data),
  });

  const [params, setParams] = useState<KalkParams>({
    labourRatePerMin: 0.333, // €20/hr default
    overheadPct: 108,
    bakingLossPct: 5,
    lossPct: 8,
    profitPct: 25,
    vatPct: 19,
  });

  const p = (field: keyof KalkParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setParams(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));

  const prod = detail || product;
  const recipe = prod.recipe;
  const components: any[] = recipe?.components || [];
  const recipeYield = Number(recipe?.yield || 1);
  const labourTimeMinutes = Number(recipe?.labourTimeMinutes || 0);
  const bakingTimeMinutes = Number(recipe?.bakingTimeMinutes || 0);

  // ── Ingredient calculations ───────────────────────────────────────────────
  const ingredientRows = components.map((c: any) => {
    const qty = Number(c.quantity);
    const unit = c.ingredient?.unit || '';
    const unitCost = Number(c.ingredient?.unitCost || 0);
    const amount = qty * unitCost;
    const weightG = toGrams(qty, unit);
    return {
      name: c.ingredient?.name || '—',
      unit,
      qty,
      weightG,
      unitCost,
      amount,
    };
  });

  const totalWeightG = ingredientRows.reduce((s, r) => s + r.weightG, 0);
  const totalMaterialCostBatch = ingredientRows.reduce((s, r) => s + r.amount, 0);
  const bakingLossG = totalWeightG * (params.bakingLossPct / 100);
  const zwischengewicht = totalWeightG - bakingLossG;

  // ── Cost cascade ─────────────────────────────────────────────────────────
  const labourCostBatch = labourTimeMinutes * params.labourRatePerMin;
  const grundkosten = totalMaterialCostBatch + labourCostBatch;
  const grundkostenzuschlag = grundkosten * (params.overheadPct / 100);
  const selbstkosten = grundkosten + grundkostenzuschlag;
  const verluste = selbstkosten * (params.lossPct / 100);
  const basisForProfit = selbstkosten + verluste;
  const gewinnRisiko = basisForProfit * (params.profitPct / 100);
  const nettopreis = basisForProfit + gewinnRisiko;
  const mwst = nettopreis * (params.vatPct / 100);
  const kalkulierterVKRezept = nettopreis + mwst;
  const empfohlenerVKProStueck = recipeYield > 0 ? kalkulierterVKRezept / recipeYield : 0;
  const aktuellerVK = Number(prod.sellingPrice);
  const totalGewinn = (aktuellerVK - empfohlenerVKProStueck) * recipeYield;
  const gewinnProStueck = aktuellerVK - empfohlenerVKProStueck;

  const ParamInput = ({ label, field, step = 0.01, suffix = '' }: { label: string; field: keyof KalkParams; step?: number; suffix?: string }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#32363A]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={params[field]}
          onChange={p(field)}
          className="w-20 text-right text-xs border border-[#89919A] px-1.5 py-0.5"
          style={{ borderRadius: 4 }}
        />
        {suffix && <span className="text-xs text-[#6A6D70] w-6">{suffix}</span>}
      </div>
    </div>
  );

  const CRow = ({ label: label_, sub, value, highlight, bold, green, red, divider }: any) => (
    <tr style={{
      background: highlight ? '#FFF0F3' : undefined,
      borderTop: divider ? '2px solid #D9D9D9' : '1px solid #EDEFF0',
      fontWeight: bold ? 600 : 400,
    }}>
      <td className="py-1.5 px-3 text-xs" style={{ color: '#32363A', width: '55%' }}>
        {label_}
        {sub && <div className="text-[10px] text-[#6A6D70] font-normal">{sub}</div>}
      </td>
      <td className="py-1.5 px-3 text-xs text-right" style={{
        color: green ? '#256F3A' : red ? '#BB0000' : '#32363A',
        width: '45%',
      }}>
        {value}
      </td>
    </tr>
  );

  return (
    <div className="flex gap-5" style={{ minHeight: 520 }}>
      {/* Left: params */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Kalkulations-Parameter</p>
          <div style={{ background: '#FAFAFA', border: '1px solid #D9D9D9', padding: '10px 12px' }}>
            <ParamInput label="Lohnkosten (€/min)" field="labourRatePerMin" step={0.001} />
            <ParamInput label="Grundkostenzuschlag" field="overheadPct" step={1} suffix="%" />
            <ParamInput label="Back-/Fertigungsverlust" field="bakingLossPct" step={0.5} suffix="%" />
            <ParamInput label="Verluste (Verkauf)" field="lossPct" step={0.5} suffix="%" />
            <ParamInput label="Gewinn & Risiko" field="profitPct" step={0.5} suffix="%" />
            <ParamInput label="Mehrwertsteuer" field="vatPct" step={0.5} suffix="%" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Rezept-Info</p>
          <div style={{ background: '#FAFAFA', border: '1px solid #D9D9D9', padding: '10px 12px' }} className="space-y-1">
            {[
              ['Rezept', recipe?.name || '—'],
              ['Stückzahl', recipeYield + ' ' + (recipe?.yieldUnit || 'Stk.')],
              ['Arbeitszeit', labourTimeMinutes > 0 ? labourTimeMinutes + ' min' : '—'],
              ['Backzeit', bakingTimeMinutes > 0 ? bakingTimeMinutes + ' min' : '—'],
              ['Rezeptmenge', totalWeightG > 0 ? Math.round(totalWeightG) + ' g' : '—'],
              ['Zwischengewicht', totalWeightG > 0 ? Math.round(zwischengewicht) + ' g' : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[#6A6D70]">{k}</span>
                <span className="text-[#32363A] font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: calculation */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#32363A]">{prod.name}</p>
            <p className="text-xs text-[#6A6D70]">{prod.code}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6A6D70]">Aktueller VK</p>
            <p className="text-lg font-bold text-[#FF385C]">{formatCurrency(aktuellerVK)}</p>
          </div>
        </div>

        {/* Ingredients table */}
        {components.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Rohmaterial</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#F0F4FF', borderBottom: '2px solid #D9D9D9' }}>
                  <th className="text-left py-1.5 px-2 font-semibold text-[#32363A]">Zutat</th>
                  <th className="text-right py-1.5 px-2 font-semibold text-[#32363A]">Menge</th>
                  <th className="text-right py-1.5 px-2 font-semibold text-[#32363A]">Gewicht (g)</th>
                  <th className="text-right py-1.5 px-2 font-semibold text-[#32363A]">€/Einheit</th>
                  <th className="text-right py-1.5 px-2 font-semibold text-[#32363A]">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #EDEFF0' }}>
                    <td className="py-1 px-2 text-[#32363A]">{row.name}</td>
                    <td className="py-1 px-2 text-right text-[#6A6D70]">{row.qty} {row.unit}</td>
                    <td className="py-1 px-2 text-right text-[#6A6D70]">{row.weightG > 0 ? Math.round(row.weightG) : '—'}</td>
                    <td className="py-1 px-2 text-right text-[#6A6D70]">{formatCurrency(row.unitCost)}</td>
                    <td className="py-1 px-2 text-right font-medium text-[#32363A]">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#E8F5E9', borderTop: '2px solid #A3D9A5' }}>
                  <td className="py-1.5 px-2 font-semibold text-[#256F3A]" colSpan={4}>Rohmaterialkosten gesamt</td>
                  <td className="py-1.5 px-2 text-right font-bold text-[#256F3A]">{formatCurrency(totalMaterialCostBatch)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Cost cascade */}
        <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Kosten Kalkulation</p>
        <table className="w-full text-xs border-collapse">
          <tbody>
            <CRow label="Rohmaterialkosten" value={formatCurrency(totalMaterialCostBatch)} />
            <CRow
              label={`Produktionslöhne (${labourTimeMinutes} min × €${params.labourRatePerMin.toFixed(3)}/min)`}
              sub={labourTimeMinutes === 0 ? 'Keine Arbeitszeit in Rezept hinterlegt' : undefined}
              value={formatCurrency(labourCostBatch)}
            />
            <CRow label="Grundkosten" sub="Rohmaterial + Produktionslöhne" value={formatCurrency(grundkosten)} bold highlight />
            <CRow
              label={`Grundkostenzuschlag (${params.overheadPct}%)`}
              sub="Nicht aktiv Beschäftigte, Urlaub, Krankheit"
              value={formatCurrency(grundkostenzuschlag)}
            />
            <CRow label="Gestehungskosten / Selbstkosten" sub="Grundkosten + Zuschlag" value={formatCurrency(selbstkosten)} bold highlight divider />
            <CRow label={`Verluste (${params.lossPct}%)`} sub="Verkaufsverluste, Schwund" value={formatCurrency(verluste)} />
            <CRow label={`Gewinn & Risiko (${params.profitPct}%)`} value={formatCurrency(gewinnRisiko)} green />
            <CRow label="Nettopreis Rezept" sub="Selbstkosten + Verluste + Gewinn" value={formatCurrency(nettopreis)} bold highlight divider />
            <CRow label={`Mehrwertsteuer (${params.vatPct}%)`} value={formatCurrency(mwst)} />
            <CRow label="Kalkulierter Verkaufspreis / Rezept" value={formatCurrency(kalkulierterVKRezept)} bold highlight divider />
            <CRow
              label={`Empfohlener VK / Stück (÷ ${recipeYield} ${recipe?.yieldUnit || 'Stk.'})`}
              value={formatCurrency(empfohlenerVKProStueck)}
              bold
            />
            <CRow label="Aktueller Verkaufspreis / Stück" value={formatCurrency(aktuellerVK)} bold divider />
            <CRow
              label="Differenz / Stück"
              sub={gewinnProStueck >= 0 ? 'Über Kalkulation' : 'Unter Kalkulation — Preiserhöhung empfohlen'}
              value={`${gewinnProStueck >= 0 ? '+' : ''}${formatCurrency(gewinnProStueck)}`}
              green={gewinnProStueck >= 0}
              red={gewinnProStueck < 0}
              bold
            />
            <CRow
              label={`Total Gewinn / Charge (${recipeYield} Stk.)`}
              value={`${totalGewinn >= 0 ? '+' : ''}${formatCurrency(totalGewinn)}`}
              green={totalGewinn >= 0}
              red={totalGewinn < 0}
              bold
              highlight={totalGewinn >= 0}
            />
          </tbody>
        </table>

        {labourTimeMinutes === 0 && (
          <div className="mt-3 px-3 py-2 flex items-center gap-2 text-xs text-[#7A4F00]"
               style={{ background: '#FEF3CD', borderLeft: '3px solid #E76500' }}>
            ⚠ Kein Arbeitszeit im Rezept hinterlegt. Bitte Labour Time in der Rezept-Verwaltung eintragen für präzise Kalkulation.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onKalkulation, onDelete, onToggleActive }: any) {
  const margin = product.contributionMargin ?? 0;
  const marginPct = product.marginPercent ?? 0;
  const marginColor = margin > 0 ? '#256F3A' : '#BB0000';
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg border border-[#EDEFF0] bg-white hover:border-[#FF385C] hover:shadow-sm transition-all cursor-default"
      style={{ minWidth: 0 }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs font-mono text-[#89919A] truncate">{product.code}</p>
          <p className="text-sm font-semibold text-[#32363A] leading-snug mt-0.5">{product.name}</p>
        </div>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${product.isActive ? 'bg-[#F1FAF5] text-[#256F3A]' : 'bg-[#F0F0F0] text-[#89919A]'}`}>
          {product.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-[#F5F6F7]">
        <div>
          <p className="text-[#6A6D70]">VK-Preis</p>
          <p className="font-semibold text-[#32363A]">{formatCurrency(Number(product.sellingPrice))}</p>
        </div>
        <div className="text-right">
          <p className="text-[#6A6D70]">Marge</p>
          <p className="font-semibold" style={{ color: marginColor }}>{marginPct.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex gap-1 pt-1">
        <button onClick={() => onKalkulation(product)} className="btn-sm btn-secondary flex-1 justify-center" title="Kalkulation">
          <Calculator className="w-3 h-3" />
        </button>
        <button onClick={() => onEdit(product)} className="btn-sm btn-secondary flex-1 justify-center" title="Bearbeiten">
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onToggleActive(product)}
          className="btn-sm flex-1 justify-center"
          style={{ background: product.isActive ? '#FFF0F3' : '#F1FAF5', color: product.isActive ? '#BB0000' : '#256F3A', border: `1px solid ${product.isActive ? '#FFCCD5' : '#A3D9A5'}` }}
          title={product.isActive ? 'Deaktivieren' : 'Aktivieren'}
        >
          {product.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button onClick={() => { if (confirm('Remove?')) onDelete(product.id); }} className="btn-sm btn-danger flex-1 justify-center" title="Löschen">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── CATEGORY SECTION ─────────────────────────────────────────────────────────

const CAT_ICONS: Record<string, string> = {
  'Layer Cakes': '🎂',
  'Tarts & Tortes': '🥧',
  'Cheesecakes': '🍰',
  'Cakes & Loafs': '🍞',
  'Cupcakes & Törtchen': '🧁',
  'Cookies & Small Bites': '🍪',
  'Frozen & Cold Desserts': '🍦',
};

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | 'kalkulation' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [filterCat, setFilterCat] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', filterCat, showInactive],
    queryFn: () => productsApi.list({ ...(filterCat ? { categoryId: filterCat } : {}), includeInactive: showInactive }).then(r => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories.list().then(r => r.data),
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => productsApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openEdit = (p: any) => { setSelected(p); setModal('edit'); };
  const openKalk = (p: any) => { setSelected(p); setModal('kalkulation'); };
  const doDelete = (id: string) => deleteMutation.mutate(id);
  const doToggleActive = (p: any) => toggleActiveMutation.mutate({ id: p.id, isActive: !p.isActive });

  // Group products by category for grid view
  const TARGET_CATS = ['Layer Cakes', 'Tarts & Tortes', 'Cheesecakes', 'Cakes & Loafs', 'Cupcakes & Törtchen', 'Cookies & Small Bites', 'Frozen & Cold Desserts'];
  const grouped: { cat: any; products: any[] }[] = [];

  if (viewMode === 'grid') {
    const activeCats = filterCat
      ? categories.filter((c: any) => c.id === filterCat)
      : [...categories].sort((a: any, b: any) => {
          const ai = TARGET_CATS.indexOf(a.name);
          const bi = TARGET_CATS.indexOf(b.name);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });

    for (const cat of activeCats) {
      const catProducts = products.filter((p: any) => p.categoryId === cat.id);
      if (catProducts.length > 0) grouped.push({ cat, products: catProducts });
    }
    const uncategorized = products.filter((p: any) => !p.categoryId);
    if (uncategorized.length > 0) grouped.push({ cat: { id: '', name: 'Ohne Kategorie', description: '' }, products: uncategorized });
  }

  const columns = [
    { key: 'code', header: 'Code', width: '90px' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (r: any) => r.category?.name || '—' },
    { key: 'recipe', header: 'Recipe', render: (r: any) => r.recipe?.name || '—' },
    { key: 'sellingPrice', header: 'VK-Preis', render: (r: any) => formatCurrency(Number(r.sellingPrice)) },
    { key: 'totalCost', header: 'Grundkosten', render: (r: any) => formatCurrency(r.totalCost ?? 0) },
    { key: 'contributionMargin', header: 'Marge', render: (r: any) => (
      <span style={{ color: (r.contributionMargin ?? 0) > 0 ? '#256F3A' : '#BB0000', fontWeight: 500 }}>
        {formatCurrency(r.contributionMargin ?? 0)} ({r.marginPercent?.toFixed(1)}%)
      </span>
    )},
    { key: 'isActive', header: 'Status', render: (r: any) => <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => openKalk(r)} className="btn-sm btn-secondary" title="Kalkulation"><Calculator className="w-3 h-3" /></button>
        <button onClick={() => openEdit(r)} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button
          onClick={() => doToggleActive(r)}
          className="btn-sm"
          style={{ background: r.isActive ? '#FFF0F3' : '#F1FAF5', color: r.isActive ? '#BB0000' : '#256F3A', border: `1px solid ${r.isActive ? '#FFCCD5' : '#A3D9A5'}` }}
          title={r.isActive ? 'Deaktivieren' : 'Aktivieren'}
        >
          {r.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button onClick={() => { if (confirm('Remove?')) doDelete(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Produkte"
        subtitle="Produkte verwalten, Preise und Stückkostenrechnung"
        actions={
          <div className="flex items-center gap-2">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input w-48">
              <option value="">Alle Kategorien</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => setShowInactive(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={showInactive
                ? { background: '#32363A', color: 'white', borderColor: '#32363A' }
                : { background: 'white', color: '#6A6D70', borderColor: '#EDEFF0' }}
              title={showInactive ? 'Nur aktive anzeigen' : 'Inaktive anzeigen'}
            >
              {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showInactive ? 'Alle' : 'Nur aktive'}
            </button>
            <div className="flex items-center bg-[#F5F6F7] rounded-lg p-0.5 border border-[#EDEFF0]">
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'grid' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kategorien
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'list' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <List className="w-3.5 h-3.5" /> Liste
              </button>
            </div>
            <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary"><Plus className="w-4 h-4" /> Neues Produkt</button>
          </div>
        }
      />

      {viewMode === 'grid' ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="card flex items-center justify-center h-32 text-[#6A6D70] text-sm">Laden…</div>
          ) : grouped.length === 0 ? (
            <div className="card flex items-center justify-center h-32 text-[#6A6D70] text-sm">Keine Produkte gefunden</div>
          ) : grouped.map(({ cat, products: catProds }) => (
            <div key={cat.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CAT_ICONS[cat.name] ?? '📦'}</span>
                  <div>
                    <h2 className="text-base font-semibold text-[#32363A]">{cat.name}</h2>
                    {cat.description && <p className="text-xs text-[#6A6D70] mt-0.5 max-w-xl">{cat.description}</p>}
                  </div>
                </div>
                <span className="text-xs text-[#6A6D70] bg-[#F5F6F7] px-2 py-0.5 rounded-full border border-[#EDEFF0]">
                  {catProds.length} Produkt{catProds.length !== 1 ? 'e' : ''}
                </span>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {catProds.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onEdit={openEdit}
                    onKalkulation={openKalk}
                    onDelete={doDelete}
                    onToggleActive={doToggleActive}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-0">
          <Table columns={columns} data={products} loading={isLoading} />
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Neues Produkt' : 'Produkt bearbeiten'} onClose={() => setModal(null)} size="lg">
          <ProductForm
            product={selected ? { ...selected, categoryId: selected.categoryId, recipeId: selected.recipeId } : null}
            categories={categories}
            recipes={recipes}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected.id, data })}
          />
        </Modal>
      )}

      {modal === 'kalkulation' && selected && (
        <Modal title={`Kalkulation — ${selected.name}`} onClose={() => setModal(null)} size="xl">
          <KalkulationModal product={selected} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
