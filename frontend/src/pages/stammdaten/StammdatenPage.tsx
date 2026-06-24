import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FlameKindling, Snowflake, Refrigerator, Blend, HelpCircle, X, Check, Building2 } from 'lucide-react';
import api from '../../api/client';

// ── types ──────────────────────────────────────────────────────────────────────

type EquipmentType = 'OFEN' | 'TIEFKUEHLER' | 'KUEHLSCHRANK' | 'MIXER' | 'SONSTIGES';
type EquipmentSize = 'GROSS' | 'MITTEL' | 'KLEIN' | null;

interface Equipment {
  id: string;
  type: EquipmentType;
  name: string;
  size: EquipmentSize;
  quantity: number;
  powerKw: number | null;
  notes: string | null;
  isActive: boolean;
}

// ── constants ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<EquipmentType, { label: string; Icon: any; color: string; bg: string }> = {
  OFEN:         { label: 'Ofen',           Icon: FlameKindling, color: '#E8612C', bg: '#FFF3EE' },
  TIEFKUEHLER:  { label: 'Tiefkühler',    Icon: Snowflake,     color: '#2E86C1', bg: '#EBF5FB' },
  KUEHLSCHRANK: { label: 'Kühlschrank',   Icon: Refrigerator,  color: '#1A9E6E', bg: '#E8F8F5' },
  MIXER:        { label: 'Mixer/Rührer',  Icon: Blend,         color: '#7D3C98', bg: '#F5EEF8' },
  SONSTIGES:    { label: 'Sonstiges',      Icon: HelpCircle,    color: '#6A6A6A', bg: '#F7F7F7' },
};

const SIZE_LABEL: Record<string, string> = { GROSS: 'Groß', MITTEL: 'Mittel', KLEIN: 'Klein' };

const TYPES = Object.keys(TYPE_META) as EquipmentType[];
const SIZES: EquipmentSize[] = ['GROSS', 'MITTEL', 'KLEIN', null];

// ── api helpers ────────────────────────────────────────────────────────────────

const equipmentApi = {
  list: () => api.get<Equipment[]>('/equipment', { params: { includeInactive: 'true' } }).then(r => r.data),
  create: (data: Omit<Equipment, 'id'>) => api.post<Equipment>('/equipment', data).then(r => r.data),
  update: (id: string, data: Partial<Equipment>) => api.patch<Equipment>(`/equipment/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/equipment/${id}`),
};

// ── building cost types & api ──────────────────────────────────────────────────

interface BuildingCost {
  id: string;
  name: string;
  sqm: number;
  rentPerSqm: number;
  isActive: boolean;
  notes: string | null;
}

const buildingApi = {
  list: () => api.get<BuildingCost[]>('/building-cost').then(r => r.data),
  create: (data: Omit<BuildingCost, 'id'>) => api.post<BuildingCost>('/building-cost', data).then(r => r.data),
  update: (id: string, data: Partial<BuildingCost>) => api.patch<BuildingCost>(`/building-cost/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/building-cost/${id}`),
};

// ── building cost modal ────────────────────────────────────────────────────────

function BuildingModal({ item, onClose }: { item?: BuildingCost; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sqm: item ? String(item.sqm) : '',
    rentPerSqm: item ? String(item.rentPerSqm) : '',
    notes: item?.notes ?? '',
    isActive: item?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const monthly = parseFloat(form.sqm || '0') * parseFloat(form.rentPerSqm || '0');

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        sqm: parseFloat(form.sqm),
        rentPerSqm: parseFloat(form.rentPerSqm),
        notes: form.notes || null,
        isActive: form.isActive,
      };
      return item ? buildingApi.update(item.id, payload) : buildingApi.create(payload as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['building-costs'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <h2 className="font-semibold text-[#222222]">{item ? 'Fläche bearbeiten' : 'Neue Mietfläche'}</h2>
          <button onClick={onClose} className="text-[#6A6A6A] hover:text-[#222222]"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Bezeichnung</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Produktionshalle, Lager, Büro"
              className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Fläche (m²)</label>
              <input type="number" min={0} step={1} value={form.sqm} onChange={e => set('sqm', e.target.value)} placeholder="z.B. 120"
                className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Miete / m² / Monat (€)</label>
              <input type="number" min={0} step={0.5} value={form.rentPerSqm} onChange={e => set('rentPerSqm', e.target.value)} placeholder="z.B. 8.50"
                className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]" />
            </div>
          </div>
          {monthly > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#F0FBF0' }}>
              <span className="text-sm text-[#166534]">Monatliche Mietkosten</span>
              <span className="font-bold text-[#166534]">€{monthly.toFixed(2)}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Notizen</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional"
              className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EBEBEB]">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-[#DDDDDD] text-[#6A6A6A] hover:bg-[#F7F7F7]">Abbrechen</button>
          <button onClick={() => save.mutate()} disabled={!form.name || !form.sqm || !form.rentPerSqm}
            className="px-4 py-2 text-sm rounded-xl font-semibold text-white flex items-center gap-2"
            style={{ background: '#FF385C' }}>
            <Check className="w-4 h-4" /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ── modal ──────────────────────────────────────────────────────────────────────

interface FormState {
  type: EquipmentType;
  name: string;
  size: EquipmentSize;
  quantity: number;
  powerKw: string;
  notes: string;
  isActive: boolean;
}

// Industry-standard rated power by type × size (kW)
// Sources: EN 60335-2 appliance standards, commercial kitchen equipment specs
const DEFAULT_POWER_KW: Record<EquipmentType, Record<'GROSS' | 'MITTEL' | 'KLEIN' | '_', number>> = {
  OFEN:         { GROSS: 18.0, MITTEL: 11.0, KLEIN: 5.5,  _: 11.0 },
  TIEFKUEHLER:  { GROSS: 1.5,  MITTEL: 0.9,  KLEIN: 0.35, _: 0.9  },
  KUEHLSCHRANK: { GROSS: 0.8,  MITTEL: 0.5,  KLEIN: 0.2,  _: 0.5  },
  MIXER:        { GROSS: 5.0,  MITTEL: 1.5,  KLEIN: 0.55, _: 1.5  },
  SONSTIGES:    { GROSS: 3.0,  MITTEL: 1.5,  KLEIN: 0.75, _: 1.5  },
};

function defaultPower(type: EquipmentType, size: EquipmentSize): string {
  const row = DEFAULT_POWER_KW[type];
  return String(size && size in row ? row[size as keyof typeof row] : row['_']);
}

const DEFAULT_FORM: FormState = {
  type: 'OFEN', name: '', size: null, quantity: 1, powerKw: defaultPower('OFEN', null), notes: '', isActive: true,
};

function EquipmentModal({
  item, onClose,
}: { item?: Equipment; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(
    item
      ? { type: item.type, name: item.name, size: item.size, quantity: item.quantity, powerKw: item.powerKw != null ? String(item.powerKw) : '', notes: item.notes ?? '', isActive: item.isActive }
      : DEFAULT_FORM,
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        notes: form.notes || null,
        powerKw: form.powerKw !== '' ? parseFloat(form.powerKw) : null,
      };
      return item ? equipmentApi.update(item.id, payload) : equipmentApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); onClose(); },
  });

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  // When type changes, update powerKw only if the current value matches any default (i.e. not manually overridden)
  const isDefaultPower = (type: EquipmentType, size: EquipmentSize, kw: string) => {
    const allDefaults = Object.values(DEFAULT_POWER_KW[type]);
    return kw === '' || allDefaults.map(String).includes(kw);
  };

  const setType = (t: EquipmentType) => {
    setForm(f => ({
      ...f,
      type: t,
      powerKw: isDefaultPower(f.type as EquipmentType, f.size, f.powerKw)
        ? defaultPower(t, f.size)
        : f.powerKw,
    }));
  };

  const setSize = (s: EquipmentSize) => {
    setForm(f => ({
      ...f,
      size: s,
      powerKw: isDefaultPower(f.type as EquipmentType, f.size, f.powerKw)
        ? defaultPower(f.type as EquipmentType, s)
        : f.powerKw,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <h2 className="font-semibold text-[#222222]">
            {item ? 'Gerät bearbeiten' : 'Neues Gerät'}
          </h2>
          <button onClick={onClose} className="text-[#6A6A6A] hover:text-[#222222] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-5 space-y-4">
          {/* type */}
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Typ</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => {
                const m = TYPE_META[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all"
                    style={active
                      ? { background: m.bg, borderColor: m.color, color: m.color }
                      : { background: '#F7F7F7', borderColor: '#EBEBEB', color: '#6A6A6A' }}
                  >
                    <m.Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* name */}
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="z.B. Backofen, Tiefkühlschrank..."
              className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]"
            />
          </div>

          <div className="flex gap-3">
            {/* size */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Größe</label>
              <select
                value={form.size ?? ''}
                onChange={e => setSize((e.target.value || null) as EquipmentSize)}
                className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]"
              >
                <option value="">— keine —</option>
                {(['GROSS', 'MITTEL', 'KLEIN'] as const).map(s => (
                  <option key={s} value={s}>{SIZE_LABEL[s]}</option>
                ))}
              </select>
            </div>

            {/* quantity */}
            <div className="w-24">
              <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Anzahl</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 1)}
                className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C]"
              />
            </div>
          </div>

          {/* power consumption */}
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">
              Leistungsaufnahme (kW)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.powerKw}
                onChange={e => set('powerKw', e.target.value)}
                placeholder="z.B. 3.5"
                className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 pr-12 text-sm focus:outline-none focus:border-[#FF385C]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9A9A9A]">kW</span>
            </div>
            <p className="text-[11px] text-[#9A9A9A] mt-1">Nennleistung laut Typenschild — wird für die Energiekostenberechnung verwendet</p>
          </div>

          {/* notes */}
          <div>
            <label className="block text-xs font-semibold text-[#6A6A6A] mb-1.5 uppercase tracking-wide">Notizen</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Kapazität, Einschränkungen, Standort..."
              className="w-full border border-[#DDDDDD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF385C] resize-none"
            />
          </div>

          {/* active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('isActive', !form.isActive)}
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ background: form.isActive ? '#FF385C' : '#DDDDDD' }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: form.isActive ? '22px' : '4px' }}
              />
            </div>
            <span className="text-sm text-[#444]">Aktiv</span>
          </label>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EBEBEB]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[#6A6A6A] hover:bg-[#F7F7F7] transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: '#FF385C' }}
          >
            <Check className="w-4 h-4" />
            {save.isPending ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function StammdatenPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; item?: Equipment }>({ open: false });
  const [buildingModal, setBuildingModal] = useState<{ open: boolean; item?: BuildingCost }>({ open: false });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: equipmentApi.list,
  });

  const remove = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });

  const { data: buildings = [] } = useQuery({ queryKey: ['building-costs'], queryFn: buildingApi.list });
  const removeBuilding = useMutation({
    mutationFn: (id: string) => buildingApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['building-costs'] }),
  });
  const toggleBuilding = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => buildingApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['building-costs'] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      equipmentApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });

  // group by type for display
  const byType = TYPES.map(type => ({
    type,
    meta: TYPE_META[type],
    items: equipment.filter(e => e.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      {/* page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Stammdaten</h1>
          <p className="text-[#6A6A6A] text-sm mt-0.5">Küchenausstattung und Kapazitätsgrenzen</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#FF385C' }}
        >
          <Plus className="w-4 h-4" />
          Gerät hinzufügen
        </button>
      </div>

      {/* capacity summary pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        {TYPES.filter(t => equipment.some(e => e.type === t)).map(type => {
          const m = TYPE_META[type];
          const total = equipment.filter(e => e.type === type).reduce((s, e) => s + e.quantity, 0);
          return (
            <div
              key={type}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: m.bg, color: m.color }}
            >
              <m.Icon className="w-4 h-4" />
              <span>{total}× {m.label}</span>
            </div>
          );
        })}
      </div>

      {/* oven constraint banner */}
      {equipment.some(e => e.type === 'OFEN' && e.quantity === 1) && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-8 text-sm"
          style={{ background: '#FFF3EE', borderLeft: '4px solid #E8612C' }}
        >
          <FlameKindling className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#E8612C' }} />
          <div>
            <p className="font-semibold" style={{ color: '#C0430A' }}>Planungshinweis: 1 Ofen verfügbar</p>
            <p className="text-[#6A6A6A] mt-0.5">
              Alle backofenabhängigen Produkte müssen sequenziell geplant werden. Pro Tag kann nur eine
              Ofencharge gleichzeitig laufen. Eis-/No-Bake-Produkte sind davon nicht betroffen.
            </p>
          </div>
        </div>
      )}

      {/* equipment cards by type */}
      {isLoading ? (
        <div className="text-[#6A6A6A] text-sm">Lade Ausstattung...</div>
      ) : (
        <div className="space-y-8">
          {byType.map(({ type, meta, items }) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <meta.Icon className="w-4 h-4" style={{ color: meta.color }} />
                <h2 className="font-semibold text-[#222222] text-sm uppercase tracking-wide">{meta.label}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="group relative flex items-start gap-4 p-4 rounded-2xl border transition-shadow hover:shadow-md"
                    style={{ borderColor: '#EBEBEB' }}
                  >
                    {/* type icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      <meta.Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#222222] text-sm">{item.name}</span>
                        {item.size && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {SIZE_LABEL[item.size]}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: meta.color }}
                        >
                          {item.quantity}
                        </span>
                        <span className="text-xs text-[#6A6A6A]">
                          {item.quantity === 1 ? 'Stück' : 'Stück'}
                        </span>
                      </div>

                      {item.powerKw != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-semibold text-[#FF385C]">{item.powerKw} kW</span>
                          <span className="text-[10px] text-[#9A9A9A]">Leistung</span>
                        </div>
                      )}

                      {item.notes && (
                        <p className="text-xs text-[#999] mt-1 leading-relaxed">{item.notes}</p>
                      )}
                    </div>

                    {/* active toggle knob */}
                    <button
                      type="button"
                      title={item.isActive ? 'Aktiv – klicken zum Deaktivieren' : 'Inaktiv – klicken zum Aktivieren'}
                      onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
                      className="absolute top-3 right-14 flex items-center gap-1.5"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <span className="text-[10px] font-medium" style={{ color: item.isActive ? '#008A05' : '#9A9A9A' }}>
                        {item.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      {/* pill track */}
                      <span
                        style={{
                          display: 'inline-flex', width: 32, height: 18, borderRadius: 9999,
                          background: item.isActive ? '#008A05' : '#D1D5DB',
                          transition: 'background 0.2s', position: 'relative', flexShrink: 0,
                        }}
                      >
                        {/* thumb */}
                        <span style={{
                          position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          transition: 'left 0.2s',
                          left: item.isActive ? 16 : 2,
                        }} />
                      </span>
                    </button>

                    {/* action buttons (appear on hover) */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal({ open: true, item })}
                        className="p-1.5 rounded-lg text-[#6A6A6A] hover:bg-[#F7F7F7] hover:text-[#222222] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`„${item.name}" wirklich löschen?`)) remove.mutate(item.id); }}
                        className="p-1.5 rounded-lg text-[#6A6A6A] hover:bg-[#FFF0F3] hover:text-[#E31C5F] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {equipment.length === 0 && !isLoading && (
        <div className="text-center py-20 text-[#999]">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Noch keine Ausstattung erfasst</p>
          <p className="text-sm mt-1">Füge Öfen, Tiefkühler und Kühlschränke hinzu.</p>
        </div>
      )}

      {/* ── Gebäude & Mietflächen ── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: '#4B5563' }} />
            <h2 className="font-semibold text-[#222222] text-sm uppercase tracking-wide">Gebäude & Mietflächen</h2>
          </div>
          <button
            onClick={() => setBuildingModal({ open: true })}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
            style={{ background: '#FF385C' }}
          >
            <Plus className="w-3.5 h-3.5" /> Fläche hinzufügen
          </button>
        </div>

        {buildings.length === 0 ? (
          <div className="text-center py-10 text-[#999] border border-dashed border-[#DDDDDD] rounded-2xl">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Noch keine Mietflächen erfasst</p>
            <p className="text-xs mt-1">Füge Produktionshalle, Lager oder Büroflächen hinzu.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map(b => {
              const monthly = b.sqm * b.rentPerSqm;
              return (
                <div key={b.id} className="group relative flex items-start gap-4 p-4 rounded-2xl border transition-shadow hover:shadow-md"
                  style={{ borderColor: '#EBEBEB', opacity: b.isActive ? 1 : 0.6 }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F3F4F6' }}>
                    <Building2 className="w-5 h-5" style={{ color: '#4B5563' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[#222222] text-sm">{b.name}</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold" style={{ color: '#4B5563' }}>{b.sqm}</span>
                      <span className="text-xs text-[#6A6A6A]">m²</span>
                      <span className="text-xs text-[#9A9A9A] ml-1">· €{b.rentPerSqm}/m²</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold" style={{ color: '#166534' }}>€{monthly.toFixed(2)}</span>
                      <span className="text-[10px] text-[#9A9A9A]">/ Monat</span>
                    </div>
                    {b.notes && <p className="text-xs text-[#999] mt-1">{b.notes}</p>}
                  </div>

                  {/* active toggle */}
                  <button type="button" title={b.isActive ? 'Aktiv' : 'Inaktiv'}
                    onClick={() => toggleBuilding.mutate({ id: b.id, isActive: !b.isActive })}
                    className="absolute top-3 right-14 flex items-center gap-1.5"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span className="text-[10px] font-medium" style={{ color: b.isActive ? '#008A05' : '#9A9A9A' }}>
                      {b.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <span style={{ display: 'inline-flex', width: 32, height: 18, borderRadius: 9999,
                      background: b.isActive ? '#008A05' : '#D1D5DB', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: b.isActive ? 16 : 2 }} />
                    </span>
                  </button>

                  {/* action buttons */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setBuildingModal({ open: true, item: b })}
                      className="p-1.5 rounded-lg text-[#6A6A6A] hover:bg-[#F7F7F7] hover:text-[#222222] transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`„${b.name}" wirklich löschen?`)) removeBuilding.mutate(b.id); }}
                      className="p-1.5 rounded-lg text-[#6A6A6A] hover:bg-[#FFF0F3] hover:text-[#E31C5F] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal.open && (
        <EquipmentModal item={modal.item} onClose={() => setModal({ open: false })} />
      )}
      {buildingModal.open && (
        <BuildingModal item={buildingModal.item} onClose={() => setBuildingModal({ open: false })} />
      )}
    </div>
  );
}
