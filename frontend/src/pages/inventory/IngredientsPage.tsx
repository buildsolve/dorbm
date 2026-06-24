import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, AlertTriangle, LayoutGrid, List, MapPin, Truck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { inventoryApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Ingredient } from '../../types';

const UNITS = ['KG', 'G', 'L', 'ML', 'UNITS', 'DOZEN', 'BOX'];

// ---- Ingredient grouping (keyword-based, same approach as Recipes) ----

interface IngGroup {
  name: string;
  icon: string;
  description: string;
  keywords: { word: string; weight: number }[];
}

const GROUPS: IngGroup[] = [
  {
    name: 'Mehl, Getreide & Backtriebmittel', icon: '🌾',
    description: 'Mehle, Stärken, Flocken und Triebmittel',
    keywords: [
      { word: 'mehl', weight: 10 }, { word: 'flour', weight: 10 }, { word: 'hafer', weight: 8 },
      { word: 'stärke', weight: 10 }, { word: 'staerke', weight: 10 }, { word: 'st�rke', weight: 10 },
      { word: 'mondamin', weight: 10 }, { word: 'grie', weight: 6 },
      { word: 'backpulver', weight: 10 }, { word: 'baking powder', weight: 10 }, { word: 'natron', weight: 10 },
      { word: 'löffelbisc', weight: 8 }, { word: 'boden', weight: 6 }, { word: 'tortlett', weight: 8 },
    ],
  },
  {
    name: 'Milchprodukte & Eier', icon: '🥛',
    description: 'Molkereiprodukte, Käse und Eiprodukte',
    keywords: [
      { word: 'milch', weight: 8 }, { word: 'milk', weight: 8 }, { word: 'butter', weight: 8 },
      { word: 'sahne', weight: 10 }, { word: 'joghurt', weight: 10 }, { word: 'quark', weight: 10 },
      { word: 'mascarpone', weight: 10 }, { word: 'käse', weight: 10 }, { word: 'kaese', weight: 10 },
      { word: 'cheese', weight: 10 }, { word: 'schlagcreme', weight: 8 },
      { word: 'eigelb', weight: 10 }, { word: 'eiweiss', weight: 10 }, { word: 'vollei', weight: 10 },
      { word: 'voll ei', weight: 10 }, { word: 'egg', weight: 10 },
      // plant "milks" should not land here
      { word: 'kokosmilch', weight: -20 }, { word: 'hafermilch', weight: -20 }, { word: 'erdnussbutter', weight: -20 },
    ],
  },
  {
    name: 'Zucker & Süßungsmittel', icon: '🍯',
    description: 'Zuckerarten, Sirupe und Zuckeraustauschstoffe',
    keywords: [
      { word: 'zucker', weight: 10 }, { word: 'sugar', weight: 10 }, { word: 'glucose', weight: 10 },
      { word: 'glukose', weight: 10 }, { word: 'honig', weight: 10 }, { word: 'hönig', weight: 10 },
      { word: 'sirup', weight: 8 }, { word: 'erytrit', weight: 10 }, { word: 'fondant', weight: 8 },
      { word: 'icing', weight: 10 },
    ],
  },
  {
    name: 'Schokolade & Kakao', icon: '🍫',
    description: 'Kuvertüren, Kakao und Schokoladenprodukte',
    keywords: [
      { word: 'kuvert', weight: 12 }, { word: 'schok', weight: 12 }, { word: 'kakao', weight: 12 },
      { word: 'cocoa', weight: 12 }, { word: 'nougat', weight: 10 }, { word: 'callebaut', weight: 12 },
    ],
  },
  {
    name: 'Früchte & Gemüse', icon: '🍓',
    description: 'Frische und verarbeitete Früchte, Pürees und Gemüse',
    keywords: [
      { word: 'banane', weight: 10 }, { word: 'beere', weight: 10 }, { word: 'beereb', weight: 10 },
      { word: 'erdbeer', weight: 10 }, { word: 'himbeer', weight: 10 }, { word: 'blaubeer', weight: 10 },
      { word: 'heidelbeer', weight: 10 }, { word: 'mango', weight: 10 }, { word: 'maracuja', weight: 10 },
      { word: 'passion', weight: 10 }, { word: 'limette', weight: 10 }, { word: 'zitrone', weight: 10 },
      { word: 'orange', weight: 10 }, { word: 'mandarine', weight: 10 }, { word: 'cranberr', weight: 10 },
      { word: 'datel', weight: 10 }, { word: 'früchte', weight: 8 }, { word: 'kürbis', weight: 8 },
      { word: 'karotte', weight: 10 }, { word: 'möhren', weight: 10 }, { word: 'püree', weight: 6 },
      { word: 'pueree', weight: 6 }, { word: 'pure', weight: 5 }, { word: 'p�ree', weight: 6 },
      { word: 'kürbiskerne', weight: -20 }, { word: 'marzipan', weight: -10 },
    ],
  },
  {
    name: 'Nüsse, Kokos & Marzipan', icon: '🥜',
    description: 'Nüsse, Saaten, Kokosprodukte und Marzipan',
    keywords: [
      { word: 'mandel', weight: 10 }, { word: 'haselnuss', weight: 10 }, { word: 'haselnussgrie', weight: 12 },
      { word: 'pistazie', weight: 10 }, { word: 'cashew', weight: 10 }, { word: 'erdnuss', weight: 10 },
      { word: 'kokos', weight: 10 }, { word: 'kürbiskerne', weight: 12 }, { word: 'marzipan', weight: 10 },
    ],
  },
  {
    name: 'Fette & Öle', icon: '🧈',
    description: 'Pflanzliche Fette und Öle',
    keywords: [
      { word: 'margarine', weight: 12 }, { word: 'öl', weight: 8 }, { word: 'oel', weight: 8 },
      { word: 'sonnenblumen', weight: 10 }, { word: 'raps', weight: 10 },
      { word: 'kokosöl', weight: 4 },
    ],
  },
  {
    name: 'Aromen & Gewürze', icon: '🌿',
    description: 'Vanille, Gewürze, Pasten und Aromen',
    keywords: [
      { word: 'vanill', weight: 10 }, { word: 'zimt', weight: 10 }, { word: 'salz', weight: 10 },
      { word: 'matcha', weight: 10 }, { word: 'espresso', weight: 10 }, { word: 'rosenwasser', weight: 10 },
      { word: 'bourbon', weight: 10 }, { word: 'paste', weight: 6 }, { word: 'extract', weight: 8 },
      { word: 'puddingpulver', weight: -20 },
    ],
  },
  {
    name: 'Bindemittel & Hilfsstoffe', icon: '🧪',
    description: 'Gelatine, Puddingpulver, Glasuren und sonstige Hilfsstoffe',
    keywords: [
      { word: 'gelatine', weight: 12 }, { word: 'agar', weight: 12 }, { word: 'pudding', weight: 10 },
      { word: 'cremepulver', weight: 10 }, { word: 'creme pulver', weight: 10 }, { word: 'protein', weight: 10 },
      { word: 'topglanz', weight: 12 }, { word: 'saftbinder', weight: 12 }, { word: 'geleeguss', weight: 12 },
      { word: 'wasser', weight: 8 }, { word: 'gefrier', weight: 6 },
    ],
  },
];

const DEFAULT_GROUP = 'Bindemittel & Hilfsstoffe';

function classifyIngredient(ing: Ingredient): string {
  const text = `${ing.name} ${ing.description || ''}`.toLowerCase();
  let best = DEFAULT_GROUP;
  let bestScore = 0;
  for (const g of GROUPS) {
    let score = 0;
    for (const kw of g.keywords) {
      if (text.includes(kw.word)) score += kw.weight;
    }
    if (score > bestScore) { bestScore = score; best = g.name; }
  }
  return best;
}

// ---- Card ----

function IngredientCard({ ing, onStockIn, onEdit, onDelete }: any) {
  const low = Number(ing.currentStock) <= Number(ing.reorderLevel);
  return (
    <div className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-gray-400 font-mono">{ing.code}</div>
          <div className="font-semibold text-gray-800 truncate" title={ing.name}>{ing.name}</div>
        </div>
        <span className={ing.isActive ? 'badge-green' : 'badge-gray'}>{ing.isActive ? 'Active' : 'Inactive'}</span>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-500">Bestand</span>
        <span className={low ? 'text-amber-600 font-semibold' : 'font-semibold text-gray-800'}>
          {Number(ing.currentStock).toFixed(2)} {ing.unit}
          {low && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />}
        </span>
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-500">Stückkosten</span>
        <span className="font-medium text-gray-700">{formatCurrency(Number(ing.unitCost), 4)} / {ing.unit}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 min-h-[1rem]">
        {ing.storageLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ing.storageLocation}</span>}
        {ing.supplier?.name && <span className="flex items-center gap-1 truncate"><Truck className="w-3 h-3 shrink-0" />{ing.supplier.name}</span>}
      </div>

      <div className="flex gap-2 pt-2 border-t mt-auto">
        <button onClick={onStockIn} className="btn-sm btn-secondary flex-1">+ Stock</button>
        <button onClick={onEdit} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={onDelete} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function IngredientForm({ ingredient, suppliers, onSubmit, onClose }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: ingredient || { unit: 'KG', unitCost: 0, reorderLevel: 0 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Code *</label>
          <input {...register('code', { required: true })} className="input" placeholder="ING001" />
        </div>
        <div>
          <label className="label">Unit *</label>
          <select {...register('unit', { required: true })} className="input">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Name *</label>
        <input {...register('name', { required: true })} className="input" placeholder="All-Purpose Flour" />
      </div>
      <div>
        <label className="label">Description</label>
        <input {...register('description')} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Unit Cost (€) *</label>
          <input {...register('unitCost', { required: true, valueAsNumber: true })} type="number" step="0.0001" className="input" />
        </div>
        <div>
          <label className="label">Reorder Level</label>
          <input {...register('reorderLevel', { valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Storage Location</label>
          <input {...register('storageLocation')} className="input" placeholder="Dry Store A1" />
        </div>
        <div>
          <label className="label">Supplier</label>
          <select {...register('supplierId')} className="input">
            <option value="">— None —</option>
            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Allergen Info</label>
        <input {...register('allergenInfo')} className="input" placeholder="e.g. Gluten, Dairy" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Ingredient</button>
      </div>
    </form>
  );
}

export default function IngredientsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | 'stock-in' | null>(null);
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterGroup, setFilterGroup] = useState<string>('');

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients', showInactive],
    queryFn: () => inventoryApi.ingredients.list(showInactive).then(r => r.data),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryApi.suppliers.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.ingredients.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingredient created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error creating ingredient'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => inventoryApi.ingredients.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingredient updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error updating ingredient'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.ingredients.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Ingredient removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const stockInMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.stock.stockIn(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Stock received'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Ingredient[]>();
    for (const ing of ingredients as Ingredient[]) {
      const g = classifyIngredient(ing);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(ing);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [ingredients]);

  const columns = [
    { key: 'code', header: 'Code', width: '100px' },
    { key: 'name', header: 'Name' },
    { key: 'group', header: 'Gruppe', render: (r: Ingredient) => {
      const g = classifyIngredient(r);
      const meta = GROUPS.find(x => x.name === g);
      return <span className="text-sm text-gray-600">{meta?.icon} {g}</span>;
    }},
    { key: 'unit', header: 'Unit', width: '80px' },
    { key: 'unitCost', header: 'Unit Cost', render: (r: Ingredient) => formatCurrency(Number(r.unitCost), 4) },
    { key: 'currentStock', header: 'Stock', render: (r: Ingredient) => (
      <span className={Number(r.currentStock) <= Number(r.reorderLevel) ? 'text-amber-600 font-medium' : ''}>
        {Number(r.currentStock).toFixed(2)} {r.unit}
        {Number(r.currentStock) <= Number(r.reorderLevel) && <AlertTriangle className="inline w-3 h-3 ml-1" />}
      </span>
    )},
    { key: 'storageLocation', header: 'Location' },
    { key: 'supplier', header: 'Supplier', render: (r: Ingredient) => r.supplier?.name || '—' },
    { key: 'isActive', header: 'Status', render: (r: Ingredient) => (
      <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'actions', header: 'Actions', render: (r: Ingredient) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(r); setModal('stock-in'); }} className="btn-sm btn-secondary">+ Stock</button>
        <button onClick={() => { setSelected(r); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => { if (confirm('Remove this ingredient?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  const visibleGroups = GROUPS.filter(g =>
    (!filterGroup || g.name === filterGroup) && (grouped.get(g.name)?.length || 0) > 0
  );

  return (
    <div>
      <PageHeader
        title="Ingredients"
        subtitle="Manage raw materials and inventory master data"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input w-auto text-sm">
              <option value="">Alle Gruppen</option>
              {GROUPS.map(g => <option key={g.name} value={g.name}>{g.icon} {g.name}</option>)}
            </select>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-[#FF385C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Gruppen
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#FF385C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" /> Liste
              </button>
            </div>
            <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Ingredient
            </button>
          </>
        }
      />

      {viewMode === 'list' ? (
        <div className="card p-0">
          <Table
            columns={columns}
            data={filterGroup ? (ingredients as Ingredient[]).filter(i => classifyIngredient(i) === filterGroup) : ingredients}
            loading={isLoading}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {isLoading && <div className="card p-8 text-center text-gray-500">Loading…</div>}
          {!isLoading && visibleGroups.map(g => {
            const items = grouped.get(g.name)!;
            return (
              <section key={g.name}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    <span className="mr-2">{g.icon}</span>{g.name}
                  </h2>
                  <span className="text-sm text-gray-500">{g.description}</span>
                  <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{items.length}</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {items.map(ing => (
                    <IngredientCard
                      key={ing.id}
                      ing={ing}
                      onStockIn={() => { setSelected(ing); setModal('stock-in'); }}
                      onEdit={() => { setSelected(ing); setModal('edit'); }}
                      onDelete={() => { if (confirm('Remove this ingredient?')) deleteMutation.mutate(ing.id); }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {!isLoading && visibleGroups.length === 0 && (
            <div className="card p-8 text-center text-gray-500">Keine Zutaten gefunden.</div>
          )}
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Ingredient' : 'Edit Ingredient'} onClose={() => setModal(null)} size="lg">
          <IngredientForm
            ingredient={selected}
            suppliers={suppliers}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected!.id, data })}
          />
        </Modal>
      )}

      {modal === 'stock-in' && selected && (
        <StockInModal ingredient={selected} suppliers={suppliers} onClose={() => setModal(null)} onSubmit={(data: any) => stockInMutation.mutate({ ...data, ingredientId: selected.id })} />
      )}
    </div>
  );
}

function StockInModal({ ingredient, suppliers, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: { quantity: 0 } });
  return (
    <Modal title={`Stock In — ${ingredient.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity ({ingredient.unit}) *</label>
            <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
          </div>
          <div>
            <label className="label">Unit Cost (€)</label>
            <input {...register('unitCost', { valueAsNumber: true })} type="number" step="0.0001" defaultValue={ingredient.unitCost} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Batch Number</label>
            <input {...register('batchNumber')} className="input" placeholder="BATCH-001" />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input {...register('expiryDate')} type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Supplier</label>
          <select {...register('supplierId')} className="input">
            <option value="">— None —</option>
            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <input {...register('notes')} className="input" />
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Record Stock In</button>
        </div>
      </form>
    </Modal>
  );
}
