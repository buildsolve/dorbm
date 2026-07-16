import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, AlertTriangle, LayoutGrid, List, MapPin, Truck, Search } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { inventoryApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Ingredient } from '../../types';

const UNITS = ['KG', 'G', 'L', 'ML', 'UNITS', 'DOZEN', 'BOX'];

const UNIT_LABEL: Record<string, string> = {
  KG: '€/kg', G: '€/100g', L: '€/L', ML: '€/100ml', UNITS: '€/Stück', DOZEN: '€/Dutzend', BOX: '€/Box',
};

const STORAGE_LOCATIONS = [
  'Kühlschrank', 'Tiefkühler', 'Lagerregal', 'Vorratskammer', 'Theke', 'Trockenlager',
];

const GROUPS = [
  { name: 'Mehl, Getreide & Backtriebmittel', icon: '🌾' },
  { name: 'Milchprodukte & Eier', icon: '🥛' },
  { name: 'Zucker & Süßungsmittel', icon: '🍯' },
  { name: 'Schokolade & Kakao', icon: '🍫' },
  { name: 'Früchte & Gemüse', icon: '🍓' },
  { name: 'Nüsse, Kokos & Marzipan', icon: '🥜' },
  { name: 'Fette & Öle', icon: '🧈' },
  { name: 'Aromen & Gewürze', icon: '🌿' },
  { name: 'Bindemittel & Hilfsstoffe', icon: '🧪' },
];

const GROUP_MAP = Object.fromEntries(GROUPS.map(g => [g.name, g.icon]));

function getGroup(ing: Ingredient): string {
  return (ing as any).category || 'Bindemittel & Hilfsstoffe';
}

// ---- Card ----

function IngredientCard({ ing, onStockIn, onEdit, onDelete }: any) {
  const low = Number(ing.currentStock) <= Number(ing.reorderLevel);
  const group = getGroup(ing);
  const icon = GROUP_MAP[group] ?? '🧪';
  return (
    <div className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-gray-400">{icon} {group}</div>
          <div className="font-semibold text-gray-800 truncate" title={ing.name}>{ing.name}</div>
        </div>
        <span className={ing.isActive ? 'badge-green' : 'badge-gray'}>{ing.isActive ? 'Aktiv' : 'Inaktiv'}</span>
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
        <span className="font-medium text-gray-700">
          {formatCurrency(Number(ing.unitCost), 4)} <span className="text-gray-400 text-xs">{UNIT_LABEL[ing.unit] ?? `€/${ing.unit}`}</span>
        </span>
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
  const { register, handleSubmit, watch } = useForm({
    defaultValues: ingredient
      ? { ...ingredient, category: (ingredient as any).category || '' }
      : { unit: 'KG', unitCost: 0, reorderLevel: 0, category: '' },
  });
  const unit = watch('unit');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="z.B. Weizenmehl Type 405" />
        </div>
        <div>
          <label className="label">Einheit *</label>
          <select {...register('unit', { required: true })} className="input">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Gruppe *</label>
          <select {...register('category', { required: true })} className="input">
            <option value="">— Gruppe wählen —</option>
            {GROUPS.map(g => <option key={g.name} value={g.name}>{g.icon} {g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Lagerort</label>
          <select {...register('storageLocation')} className="input">
            <option value="">— Kein Lagerort —</option>
            {STORAGE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">
            Stückkosten ({UNIT_LABEL[unit] ?? `€/${unit}`}) *
          </label>
          <input {...register('unitCost', { required: true, valueAsNumber: true })} type="number" step="0.0001" className="input" />
        </div>
        <div>
          <label className="label">Meldebestand ({unit})</label>
          <input {...register('reorderLevel', { valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Lieferant</label>
          <select {...register('supplierId')} className="input">
            <option value="">— Kein Lieferant —</option>
            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Allergen-Info</label>
          <input {...register('allergenInfo')} className="input" placeholder="z.B. Gluten, Laktose" />
        </div>
      </div>

      <div>
        <label className="label">Beschreibung</label>
        <input {...register('description')} className="input" />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function IngredientsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | 'stock-in' | null>(null);
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [search, setSearch] = useState('');

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Zutat erstellt'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler beim Erstellen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => inventoryApi.ingredients.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Zutat aktualisiert'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler beim Speichern'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.ingredients.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Zutat entfernt'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });

  const stockInMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.stock.stockIn(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Wareneingang erfasst'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });

  const filtered = useMemo(() => {
    let list = ingredients as Ingredient[];
    if (filterGroup) list = list.filter(i => getGroup(i) === filterGroup);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.supplier as any)?.name?.toLowerCase().includes(q) ||
        getGroup(i).toLowerCase().includes(q)
      );
    }
    return list;
  }, [ingredients, filterGroup, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Ingredient[]>();
    for (const ing of filtered) {
      const g = getGroup(ing);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(ing);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  const columns = [
    { key: 'group', header: 'Gruppe', render: (r: Ingredient) => {
      const g = getGroup(r);
      return <span className="text-sm text-gray-600">{GROUP_MAP[g] ?? '🧪'} {g}</span>;
    }},
    { key: 'name', header: 'Name' },
    { key: 'supplier', header: 'Lieferant', render: (r: Ingredient) => r.supplier?.name || '—' },
    { key: 'unit', header: 'Einheit', width: '80px' },
    { key: 'unitCost', header: 'Stückkosten', render: (r: Ingredient) => (
      <span>
        {formatCurrency(Number(r.unitCost), 4)}
        <span className="text-gray-400 text-xs ml-1">{UNIT_LABEL[r.unit] ?? `€/${r.unit}`}</span>
      </span>
    )},
    { key: 'currentStock', header: 'Bestand', render: (r: Ingredient) => (
      <span className={Number(r.currentStock) <= Number(r.reorderLevel) ? 'text-amber-600 font-medium' : ''}>
        {Number(r.currentStock).toFixed(2)} {r.unit}
        {Number(r.currentStock) <= Number(r.reorderLevel) && <AlertTriangle className="inline w-3 h-3 ml-1" />}
      </span>
    )},
    { key: 'storageLocation', header: 'Lagerort', render: (r: Ingredient) => (r as any).storageLocation || '—' },
    { key: 'isActive', header: 'Status', render: (r: Ingredient) => (
      <span className={r.isActive ? 'badge-green' : 'badge-gray'}>{r.isActive ? 'Aktiv' : 'Inaktiv'}</span>
    )},
    { key: 'actions', header: 'Aktionen', render: (r: Ingredient) => (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setSelected(r); setModal('stock-in'); }} className="btn-sm btn-secondary">+ Stock</button>
        <button onClick={() => { setSelected(r); setModal('edit'); }} className="btn-sm btn-secondary"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => { if (confirm('Zutat entfernen?')) deleteMutation.mutate(r.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
      </div>
    )},
  ];

  const visibleGroups = GROUPS.filter(g => grouped.has(g.name));

  return (
    <div>
      <PageHeader
        title="Zutaten"
        subtitle="Rohstoffe und Lagerbestände verwalten"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              Inaktive anzeigen
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="input pl-8 w-48 text-sm"
              />
            </div>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input w-auto text-sm">
              <option value="">Alle Gruppen</option>
              {GROUPS.map(g => <option key={g.name} value={g.name}>{g.icon} {g.name}</option>)}
            </select>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#FF385C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" /> Liste
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-[#FF385C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Gruppen
              </button>
            </div>
            <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Zutat hinzufügen
            </button>
          </>
        }
      />

      {viewMode === 'list' ? (
        <div className="card p-0">
          <Table columns={columns} data={filtered} loading={isLoading} />
        </div>
      ) : (
        <div className="space-y-8">
          {isLoading && <div className="card p-8 text-center text-gray-500">Laden…</div>}
          {!isLoading && visibleGroups.map(g => {
            const items = grouped.get(g.name)!;
            return (
              <section key={g.name}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">
                    <span className="mr-2">{g.icon}</span>{g.name}
                  </h2>
                  <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{items.length}</span>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {items.map(ing => (
                    <IngredientCard
                      key={ing.id}
                      ing={ing}
                      onStockIn={() => { setSelected(ing); setModal('stock-in'); }}
                      onEdit={() => { setSelected(ing); setModal('edit'); }}
                      onDelete={() => { if (confirm('Zutat entfernen?')) deleteMutation.mutate(ing.id); }}
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
        <Modal title={modal === 'create' ? 'Neue Zutat' : 'Zutat bearbeiten'} onClose={() => setModal(null)} size="lg">
          <IngredientForm
            ingredient={selected}
            suppliers={suppliers}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected!.id, data })}
          />
        </Modal>
      )}

      {modal === 'stock-in' && selected && (
        <StockInModal
          ingredient={selected}
          suppliers={suppliers}
          onClose={() => setModal(null)}
          onSubmit={(data: any) => stockInMutation.mutate({ ...data, ingredientId: selected.id })}
        />
      )}
    </div>
  );
}

function StockInModal({ ingredient, suppliers, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({ defaultValues: { quantity: 0 } });
  return (
    <Modal title={`Wareneingang — ${ingredient.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Menge ({ingredient.unit}) *</label>
            <input {...register('quantity', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
          </div>
          <div>
            <label className="label">Stückkosten ({UNIT_LABEL[ingredient.unit] ?? `€/${ingredient.unit}`})</label>
            <input {...register('unitCost', { valueAsNumber: true })} type="number" step="0.0001" defaultValue={ingredient.unitCost} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Chargennummer</label>
            <input {...register('batchNumber')} className="input" placeholder="CHARGE-001" />
          </div>
          <div>
            <label className="label">Mindesthaltbarkeit</label>
            <input {...register('expiryDate')} type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Lieferant</label>
          <select {...register('supplierId')} className="input">
            <option value="">— Kein Lieferant —</option>
            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notizen</label>
          <input {...register('notes')} className="input" />
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" className="btn-primary">Wareneingang speichern</button>
        </div>
      </form>
    </Modal>
  );
}
