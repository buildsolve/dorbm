import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, LayoutGrid, List, Clock, ChefHat, FlameKindling } from 'lucide-react';
import { recipesApi, inventoryApi } from '../../api/client';
import { formatCurrency } from '../../utils/format';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

// ─── INGREDIENT-BASED CLASSIFIER ─────────────────────────────────────────────

interface IngCluster {
  name: string;
  icon: string;
  description: string;
  keywords: { word: string; weight: number }[];
}

const CLUSTERS: IngCluster[] = [
  {
    name: 'Chocolate & Cocoa',
    icon: '🍫',
    description: 'Recipes built around dark/milk chocolate, couverture, or cocoa powder.',
    keywords: [
      { word: 'kuvert',       weight: 10 },
      { word: 'kakao',        weight: 10 },
      { word: 'cocoa',        weight: 10 },
      { word: 'schokolade',   weight: 10 },
      { word: 'callebaut',    weight: 10 },
      { word: 'nougat',       weight:  8 },
      { word: 'schoko',       weight:  6 },
    ],
  },
  {
    name: 'Cheesecake & Fresh Cheese',
    icon: '🧀',
    description: 'Cream cheese, Frischkäse or Mascarpone as the dominant binding ingredient.',
    keywords: [
      { word: 'frisch',       weight: 10 },  // frischkäse, frische käse
      { word: 'cream cheese', weight: 10 },
      { word: 'speisequark',  weight: 10 },
      { word: 'mascarpone',   weight:  7 },
      { word: 'quark',        weight:  6 },
    ],
  },
  {
    name: 'Berry & Citrus',
    icon: '🍓',
    description: 'Built around raspberries, blueberries, strawberries, lemon or lime.',
    keywords: [
      { word: 'himbeer',      weight: 10 },
      { word: 'erdbeere',     weight: 10 },
      { word: 'erdbeeren',    weight: 10 },
      { word: 'blaubeere',    weight: 10 },
      { word: 'heidelbeer',   weight: 10 },
      { word: 'beere',        weight:  9 },
      { word: 'cranberr',     weight:  9 },
      { word: 'zitrone',      weight:  7 },
      { word: 'limette',      weight:  7 },
      { word: 'limetten',     weight:  7 },
    ],
  },
  {
    name: 'Coconut & Tropical',
    icon: '🥥',
    description: 'Coconut milk, mango purée, passion fruit — tropical ingredient base.',
    keywords: [
      { word: 'kokosmilch',   weight: 10 },
      { word: 'kokosraspel',  weight: 10 },
      { word: 'kokosöl',      weight: 10 },
      { word: 'kokos',        weight:  8 },
      { word: 'mango',        weight:  8 },
      { word: 'maracuja',     weight: 10 },
      { word: 'passionsfrucht', weight: 10 },
      { word: 'passion',      weight:  6 },
      { word: 'kokosirup',    weight:  8 },
    ],
  },
  {
    name: 'Banana, Spice & Vegetable',
    icon: '🌿',
    description: 'Spiced or vegetable-forward batters — banana, pumpkin, carrot, matcha.',
    keywords: [
      { word: 'banane',       weight: 10 },
      { word: 'bananenpüree', weight: 10 },
      { word: 'bananenpueree', weight: 10 },
      { word: 'kürbis',       weight: 10 },
      { word: 'pumkin',       weight: 10 },
      { word: 'karotte',      weight: 10 },
      { word: 'möhren',       weight: 10 },
      { word: 'matcha',       weight: 10 },
      { word: 'espresso',     weight:  9 },
      { word: 'zimt',         weight:  7 },
    ],
  },
  {
    name: 'Nuts & Seeds',
    icon: '🥜',
    description: 'Ground almonds, pistachios, hazelnuts or other nuts as a structural ingredient.',
    keywords: [
      { word: 'mandeln',      weight:  8 },
      { word: 'pistazie',     weight: 10 },
      { word: 'pistazien',    weight: 10 },
      { word: 'haselnuss',    weight:  9 },
      { word: 'erdnuss',      weight: 10 },
      { word: 'cashew',       weight: 10 },
      { word: 'marzipan',     weight:  8 },
      { word: 'haferflocken', weight:  7 },
    ],
  },
  {
    name: 'Classic Cream & Vanilla',
    icon: '🍦',
    description: 'Vanilla- and cream-forward classics — cupcakes, simple sponges, parfaits.',
    keywords: [
      { word: 'vanilla',      weight:  3 },
      { word: 'vanille',      weight:  3 },
      { word: 'sahne',        weight:  2 },
      { word: 'butter',       weight:  2 },
    ],
  },
];

function classifyRecipe(recipe: any): string {
  const ingText = (recipe.components ?? [])
    .map((c: any) => (c.ingredient?.name ?? '').toLowerCase())
    .join(' ');
  const nameText = (recipe.name ?? '').toLowerCase();
  const text = ingText + ' ' + nameText;

  let best = CLUSTERS[CLUSTERS.length - 1].name; // default: Cream & Vanilla
  let bestScore = -1;

  for (const cluster of CLUSTERS) {
    let score = 0;
    for (const { word, weight } of cluster.keywords) {
      if (text.includes(word.toLowerCase())) score += weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cluster.name;
    }
  }
  return best;
}

// ─── RECIPE CARD ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onEdit, onDelete, onView }: any) {
  const ingCount = recipe.components?.length ?? 0;
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-[#EDEFF0] bg-white hover:border-[#FF385C] hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs font-mono text-[#89919A] truncate">{recipe.code}</p>
          <p className="text-sm font-semibold text-[#32363A] leading-snug mt-0.5 line-clamp-2">{recipe.name}</p>
        </div>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${recipe.isActive ? 'bg-[#F1FAF5] text-[#256F3A]' : 'bg-[#F0F0F0] text-[#89919A]'}`}>
          {recipe.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-xs mt-1">
        <div className="flex items-center gap-1 text-[#6A6D70]">
          <ChefHat className="w-3 h-3 shrink-0" />
          <span>{ingCount} Zut.</span>
        </div>
        <div className="flex items-center gap-1 text-[#6A6D70]">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{recipe.labourTimeMinutes > 0 ? `${recipe.labourTimeMinutes}m` : '—'}</span>
        </div>
        <div className="flex items-center gap-1 text-[#6A6D70]">
          <FlameKindling className="w-3 h-3 shrink-0" />
          <span>{recipe.bakingTimeMinutes > 0 ? `${recipe.bakingTimeMinutes}m` : '—'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#F5F6F7]">
        <div>
          <p className="text-[#6A6D70]">Materialkosten</p>
          <p className="font-semibold text-[#32363A]">{formatCurrency(recipe.totalMaterialCost ?? 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-[#6A6D70]">Menge</p>
          <p className="font-semibold text-[#32363A]">{recipe.yield} {recipe.yieldUnit}</p>
        </div>
      </div>

      <div className="flex gap-1 pt-1">
        <button onClick={() => onView(recipe)} className="btn-sm btn-secondary flex-1 justify-center" title="Details"><Eye className="w-3 h-3" /></button>
        <button onClick={() => onEdit(recipe)} className="btn-sm btn-secondary flex-1 justify-center" title="Bearbeiten">Edit</button>
        <button onClick={() => { if (confirm('Remove?')) onDelete(recipe.id); }} className="btn-sm btn-danger flex-1 justify-center" title="Löschen"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

const LABOUR_RATE = 20; // €/hr — must match backend RecipeService.LABOUR_RATE_PER_HOUR

function generateNextCode(existingRecipes: any[]): string {
  const nums = existingRecipes
    .map((r: any) => {
      const m = String(r.code ?? '').match(/RCP-?(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(n => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `RCP-${String(next).padStart(3, '0')}`;
}

function RecipeForm({ recipe, ingredients, existingRecipes, onSubmit, onClose }: any) {
  const isEdit = !!recipe;
  const autoCode = isEdit ? recipe.code : generateNextCode(existingRecipes);

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: recipe
      ? { ...recipe, code: recipe.code }
      : { code: autoCode, yield: 1, yieldUnit: 'units', laborCost: 0, overheadCost: 0, bakingTimeMinutes: 0, labourTimeMinutes: 0, components: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'components' });

  // Live cost preview
  const watchedComponents = watch('components') ?? [];
  const watchedLabour = watch('labourTimeMinutes') ?? 0;
  const watchedOverhead = watch('overheadCost') ?? 0;
  const watchedYield = watch('yield') ?? 1;

  const ingMap = Object.fromEntries((ingredients ?? []).map((i: any) => [i.id, i]));
  const materialCost = watchedComponents.reduce((sum: number, c: any) => {
    const ing = ingMap[c?.ingredientId];
    return sum + (ing ? Number(ing.unitCost ?? 0) * Number(c?.quantity ?? 0) : 0);
  }, 0);
  const labourCost = (Number(watchedLabour) / 60) * LABOUR_RATE;
  const overheadCost = Number(watchedOverhead) ?? 0;
  const totalCost = materialCost + labourCost + overheadCost;
  const costPerUnit = watchedYield > 0 ? totalCost / Number(watchedYield) : 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Code {!isEdit && <span className="text-[#6A6D70] font-normal">(auto-generated)</span>}</label>
          <div className="relative">
            <input
              {...register('code', { required: true })}
              className="input font-mono"
              readOnly={!isEdit}
              style={!isEdit ? { background: '#F5F6F7', color: '#6A6D70', cursor: 'not-allowed' } : undefined}
            />
            {!isEdit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#B0B0B0]">🔒</span>
            )}
          </div>
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
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Yield Quantity *</label>
          <input {...register('yield', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
        <div>
          <label className="label">Yield Unit</label>
          <input {...register('yieldUnit')} className="input" placeholder="units / cake / dozen" />
        </div>
        <div className="col-span-1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Labour Time (min) <span className="text-[#FF385C] font-normal">— actual preparation</span></label>
          <input {...register('labourTimeMinutes', { valueAsNumber: true })} type="number" min="0" className="input" placeholder="e.g. 45" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Hands-on work only — excludes baking. Drives labour cost at €20/hr.</p>
        </div>
        <div>
          <label className="label">Baking Time (min) <span className="text-[#6A6D70] font-normal">— oven / resting</span></label>
          <input {...register('bakingTimeMinutes', { valueAsNumber: true })} type="number" min="0" className="input" placeholder="e.g. 60" />
          <p className="text-xs text-[#6A6D70] mt-0.5">Passive oven / cooling time — for scheduling only.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Overhead Cost (€/batch)</label>
          <input {...register('overheadCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="label">Legacy Labor Cost (€) <span className="text-[#6A6D70] font-normal">— ignored when Labour Time is set</span></label>
          <input {...register('laborCost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
      </div>

      <div>
        <label className="label">
          Zubereitungsanleitung
          <span className="text-[#6A6D70] font-normal ml-1">— Schritt-für-Schritt Anleitung auf Deutsch</span>
        </label>
        <textarea
          {...register('notes')}
          rows={10}
          className="input font-mono text-sm leading-relaxed"
          style={{ resize: 'vertical', minHeight: 200 }}
          placeholder={`1. Backofen auf 175 °C Ober-/Unterhitze vorheizen. Springform (26 cm) einfetten und mit Mehl bestäuben.\n\n2. Butter und Zucker in einer Schüssel cremig aufschlagen, bis die Masse hell und luftig ist (ca. 5 Minuten).\n\n3. Eier einzeln unterrühren, dabei jedes Ei vollständig einarbeiten bevor das nächste hinzukommt.\n\n4. Mehl, Backpulver und Salz sieben und abwechselnd mit der Milch unter die Butter-Zucker-Masse heben.\n\n5. Teig in die vorbereitete Form füllen und glattstreichen.\n\n6. Im vorgeheizten Ofen 35–40 Minuten backen. Stäbchenprobe: Wenn kein Teig klebt, ist der Kuchen fertig.\n\n7. 10 Minuten in der Form abkühlen lassen, dann auf ein Kuchengitter stürzen und vollständig auskühlen.`}
        />
        <p className="text-xs text-[#6A6D70] mt-1">Jeden Schritt mit einer Zahl beginnen (1., 2., 3. …) — die Detailansicht zeigt die Anleitung als visuellen Ablauf.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">Ingredients</label>
          <button type="button" onClick={() => append({ ingredientId: '', quantity: 0, notes: '' })} className="btn-secondary btn-sm">
            <Plus className="w-3 h-3" /> Add Row
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <select {...register(`components.${i}.ingredientId`, { required: true })} className="input text-sm">
                  <option value="">Select ingredient...</option>
                  {ingredients.map((ing: any) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <input {...register(`components.${i}.quantity`, { required: true, valueAsNumber: true })} type="number" step="0.0001" placeholder="Qty" className="input text-sm" />
              </div>
              <div className="col-span-2">
                <input {...register(`components.${i}.notes`)} placeholder="Notes" className="input text-sm" />
              </div>
              <button type="button" onClick={() => remove(i)} className="col-span-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-gray-400 py-2">No ingredients added yet</p>}
        </div>
      </div>

      {/* Live cost preview */}
      <div className="rounded-xl border border-[#E8F0FE] bg-[#F8FAFF] p-4 space-y-2">
        <p className="text-xs font-semibold text-[#1B66C9] uppercase tracking-wide mb-3">Kostenvorschau (live)</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="flex justify-between text-[#6A6D70]">
            <span>Materialkosten</span>
            <span className="font-mono">{formatCurrency(materialCost)}</span>
          </div>
          <div className="flex justify-between text-[#6A6D70]">
            <span>Arbeitskosten ({watchedLabour} min × €{LABOUR_RATE}/h)</span>
            <span className="font-mono">{formatCurrency(labourCost)}</span>
          </div>
          <div className="flex justify-between text-[#6A6D70]">
            <span>Gemeinkosten</span>
            <span className="font-mono">{formatCurrency(overheadCost)}</span>
          </div>
          <div className="flex justify-between font-semibold text-[#222222] border-t border-[#DDEAFF] pt-1 mt-1">
            <span>Gesamtkosten / Charge</span>
            <span className="font-mono text-[#1B66C9]">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between font-semibold text-[#256F3A]">
            <span>Kosten / Einheit ({watchedYield} {watch('yieldUnit') || 'units'})</span>
            <span className="font-mono">{formatCurrency(costPerUnit)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Recipe</button>
      </div>
    </form>
  );
}

export default function RecipesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCluster, setFilterCluster] = useState('');

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.list().then(r => r.data),
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', false],
    queryFn: () => inventoryApi.ingredients.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => recipesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Recipe created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => recipesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Recipe updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Recipe removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openEdit = (r: any) => { setSelected(r); setModal('edit'); };
  const doDelete = (id: string) => deleteMutation.mutate(id);

  // Build grouped data for grid view
  const classifiedRecipes = recipes.map((r: any) => ({ ...r, _cluster: classifyRecipe(r) }));
  const visibleRecipes = filterCluster
    ? classifiedRecipes.filter((r: any) => r._cluster === filterCluster)
    : classifiedRecipes;

  const grouped = CLUSTERS.map(cluster => ({
    cluster,
    recipes: visibleRecipes.filter((r: any) => r._cluster === cluster.name),
  })).filter(g => g.recipes.length > 0);

  const columns = [
    { key: 'code', header: 'Code', width: '100px' },
    { key: 'name', header: 'Name' },
    { key: '_cluster', header: 'Gruppe', render: (r: any) => {
      const cl = CLUSTERS.find(c => c.name === r._cluster);
      return <span className="text-xs">{cl?.icon} {cl?.name ?? '—'}</span>;
    }},
    { key: 'yield', header: 'Yield', render: (r: any) => `${r.yield} ${r.yieldUnit}` },
    { key: 'components', header: 'Zutaten', render: (r: any) => `${r.components?.length ?? 0}` },
    { key: 'totalMaterialCost', header: 'Material', render: (r: any) => formatCurrency(r.totalMaterialCost ?? 0) },
    { key: 'labourTimeMinutes', header: 'Arbeit', render: (r: any) => r.labourTimeMinutes > 0 ? `${r.labourTimeMinutes} min` : '—' },
    { key: 'bakingTimeMinutes', header: 'Backen', render: (r: any) => r.bakingTimeMinutes > 0 ? `${r.bakingTimeMinutes} min` : '—' },
    { key: 'isActive', header: 'Status', render: (r: any) => <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    { key: 'actions', header: 'Actions', render: (r: any) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(`/recipes/${r.id}`)} className="btn-sm btn-secondary"><Eye className="w-3 h-3" /></button>
        <button onClick={() => openEdit(r)} className="btn-sm btn-secondary">Edit</button>
        <button onClick={() => { if (confirm('Remove?')) doDelete(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Rezepte"
        subtitle="Produktrezepte und Zutatenverbrauch"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={filterCluster}
              onChange={e => setFilterCluster(e.target.value)}
              className="input w-52"
            >
              <option value="">Alle Gruppen</option>
              {CLUSTERS.map(c => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
            <div className="flex items-center bg-[#F5F6F7] rounded-lg p-0.5 border border-[#EDEFF0]">
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'grid' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Gruppen
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={viewMode === 'list' ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#6A6D70' }}
              >
                <List className="w-3.5 h-3.5" /> Liste
              </button>
            </div>
            <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Neues Rezept
            </button>
          </div>
        }
      />

      {viewMode === 'grid' ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="card flex items-center justify-center h-32 text-[#6A6D70] text-sm">Laden…</div>
          ) : grouped.length === 0 ? (
            <div className="card flex items-center justify-center h-32 text-[#6A6D70] text-sm">Keine Rezepte gefunden</div>
          ) : grouped.map(({ cluster, recipes: clusterRecipes }) => (
            <div key={cluster.name} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cluster.icon}</span>
                  <div>
                    <h2 className="text-base font-semibold text-[#32363A]">{cluster.name}</h2>
                    <p className="text-xs text-[#6A6D70] mt-0.5 max-w-xl">{cluster.description}</p>
                  </div>
                </div>
                <span className="text-xs text-[#6A6D70] bg-[#F5F6F7] px-2 py-0.5 rounded-full border border-[#EDEFF0] shrink-0">
                  {clusterRecipes.length} Rezept{clusterRecipes.length !== 1 ? 'e' : ''}
                </span>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
                {clusterRecipes.map((r: any) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onView={() => navigate(`/recipes/${r.id}`)}
                    onEdit={openEdit}
                    onDelete={doDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-0">
          <Table columns={columns} data={visibleRecipes} loading={isLoading} />
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Neues Rezept' : 'Rezept bearbeiten'} onClose={() => setModal(null)} size="xl">
          <RecipeForm
            recipe={selected ? { ...selected, components: selected.components?.map((c: any) => ({ ingredientId: c.ingredientId, quantity: c.quantity, notes: c.notes })) } : null}
            ingredients={ingredients}
            existingRecipes={recipes}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected.id, data })}
          />
        </Modal>
      )}
    </div>
  );
}
