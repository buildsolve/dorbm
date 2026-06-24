import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Play, ChevronLeft, ChevronRight, Clock, User, Users,
  Layers, CheckCircle2, Circle, AlertCircle, Pencil, RefreshCw, X, Flag, ShoppingBag, Euro,
} from 'lucide-react';
import { weeklyApi, productsApi, recipesApi, employeeApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const DAY_LABELS: Record<string, string> = { MON: 'Montag', TUE: 'Dienstag', WED: 'Mittwoch', THU: 'Donnerstag', FRI: 'Freitag', SAT: 'Samstag' };
const DAY_SHORT: Record<string, string> = { MON: 'Mo', TUE: 'Di', WED: 'Mi', THU: 'Do', FRI: 'Fr', SAT: 'Sa' };

const STAGE_TYPES = [
  { value: 'PREP', label: 'Vorbereitung', color: '#6A6D70', bg: '#F5F5F5' },
  { value: 'BAKE', label: 'Backen', color: '#7A4F00', bg: '#FEF3CD' },
  { value: 'COOL', label: 'Kühlen', color: '#E31C5F', bg: '#FFF0F3' },
  { value: 'FILL', label: 'Füllung', color: '#5A18A0', bg: '#F3E8FF' },
  { value: 'ASSEMBLE', label: 'Zusammensetzen', color: '#256F3A', bg: '#E8F5E9' },
  { value: 'DECORATE', label: 'Dekorieren', color: '#BB0000', bg: '#FFEAEA' },
  { value: 'PACK', label: 'Verpacken', color: '#FF385C', bg: '#E0EEFF' },
];

const STATUS_ICONS: Record<string, any> = {
  PLANNED: <Circle className="w-3.5 h-3.5 text-[#6A6D70]" />,
  IN_PROGRESS: <AlertCircle className="w-3.5 h-3.5 text-[#E76500]" />,
  DONE: <CheckCircle2 className="w-3.5 h-3.5 text-[#256F3A]" />,
};

function stageStyle(type: string) {
  return STAGE_TYPES.find(s => s.value === type) ?? STAGE_TYPES[0];
}

function fmtMinutes(min: number) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

// Get current ISO week
function currentWeekInfo() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return { year: now.getFullYear(), weekNumber };
}

// ─── RECIPE STAGES EDITOR ─────────────────────────────────────────────────────

function RecipeStagesModal({ recipe, onClose }: { recipe: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: stages = [] } = useQuery({
    queryKey: ['recipe-stages', recipe.id],
    queryFn: () => weeklyApi.stages.get(recipe.id).then(r => r.data),
  });

  const { register, handleSubmit, control } = useForm({
    values: { stages: stages.length > 0 ? stages : [] },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'stages' });

  const saveMutation = useMutation({
    mutationFn: (data: any) => weeklyApi.stages.upsert(recipe.id, data.stages),
    onSuccess: () => { toast.success('Arbeitsstufen gespeichert'); qc.invalidateQueries({ queryKey: ['recipe-stages', recipe.id] }); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });

  const addStage = () => append({ name: '', stageType: 'PREP', labourTimeMinutes: 30, bakingTimeMinutes: 0, dayOffset: 0, notes: '' });

  return (
    <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
      <div className="px-3 py-2 text-sm" style={{ background: '#FAFAFA', border: '1px solid #D9D9D9' }}>
        <span className="font-medium">{recipe.name}</span>
        <span className="text-[#6A6D70] ml-2 text-xs">Arbeitsstufen definieren. dayOffset=-1 bedeutet Vortag.</span>
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={f.id} className="p-3 space-y-2" style={{ background: '#FAFAFA', border: '1px solid #EDEFF0' }}>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input {...register(`stages.${i}.name`, { required: true })} className="input text-sm" placeholder="z.B. Böden backen" />
              </div>
              <div className="col-span-2">
                <select {...register(`stages.${i}.stageType`)} className="input text-sm">
                  {STAGE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <input {...register(`stages.${i}.labourTimeMinutes`, { valueAsNumber: true })} type="number" min="0" className="input text-sm" placeholder="Arbeitszeit min" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6A6D70]">Arbeit</span>
                </div>
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <input {...register(`stages.${i}.bakingTimeMinutes`, { valueAsNumber: true })} type="number" min="0" className="input text-sm" placeholder="Backzeit min" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6A6D70]">Back</span>
                </div>
              </div>
              <div className="col-span-1">
                <input {...register(`stages.${i}.dayOffset`, { valueAsNumber: true })} type="number" className="input text-sm text-center" title="Tag-Offset zum Liefertag" placeholder="0" />
              </div>
              <button type="button" onClick={() => remove(i)} className="col-span-1 btn-sm btn-danger justify-center">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input {...register(`stages.${i}.notes`)} className="input text-xs" placeholder="Notiz (optional)" />
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center py-6 text-sm text-[#6A6D70]">
            Keine Stufen — Rezept wird als einzelner Task eingeplant.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#6A6D70] px-1">
        <span>Spalten: Name · Typ · Arbeitszeit(min) · Backzeit(min) · Tag-Offset</span>
        <button type="button" onClick={addStage} className="btn-secondary btn-sm">
          <Plus className="w-3 h-3" /> Stufe hinzufügen
        </button>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Abbrechen</button>
        <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
          {saveMutation.isPending ? 'Speichern…' : 'Stufen speichern'}
        </button>
      </div>
    </form>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({ task, onUpdate, onDelete }: { task: any; onUpdate: (data: any) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? '');
  const isMisc = task.taskType === 'MISC';
  const stage = task.recipeStage;
  const ss = stageStyle(stage?.stageType ?? 'PREP');
  const nextStatus = { PLANNED: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'PLANNED' }[task.status as string] ?? 'PLANNED';
  const borderColor = isMisc ? '#E76500' : ss.color;

  return (
    <div
      className="group relative mb-2 p-2.5 cursor-default"
      style={{ background: isMisc ? '#FFFBF5' : '#fff', border: '1px solid #D9D9D9', borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Status + delete */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <button onClick={() => onUpdate({ status: nextStatus })} className="shrink-0 mt-0.5" title={`Status: ${task.status}`}>
          {STATUS_ICONS[task.status] ?? STATUS_ICONS.PLANNED}
        </button>
        <div className="flex-1 min-w-0">
          {isMisc ? (
            <>
              <div className="flex items-center gap-1">
                <ShoppingBag className="w-2.5 h-2.5 shrink-0" style={{ color: '#E76500' }} />
                <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#E76500' }}>{task.notes || 'Sonstiger Task'}</p>
              </div>
              {Number(task.cashAmount) > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] mt-0.5 font-medium" style={{ color: '#E76500' }}>
                  <Euro className="w-2.5 h-2.5" />{Number(task.cashAmount).toFixed(2)}
                </span>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#32363A] leading-tight truncate">{task.product?.name}</p>
              {stage && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 mt-0.5 font-medium"
                      style={{ background: ss.bg, color: ss.color }}>
                  {stage.name}
                </span>
              )}
            </>
          )}
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity btn-sm btn-danger p-0.5 shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {task.estimatedMinutes > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-[#6A6D70]">
            <Clock className="w-2.5 h-2.5" />{fmtMinutes(task.estimatedMinutes)}
          </span>
        )}
        {!isMisc && <span className="text-[10px] text-[#6A6D70]">× {task.quantity}</span>}
        {task.assignedTo && (
          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#E31C5F' }}>
            <User className="w-2.5 h-2.5" />{task.assignedTo}
          </span>
        )}
      </div>

      {/* Inline assign */}
      {editing ? (
        <div className="mt-1.5 flex gap-1">
          <input autoFocus value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="input text-xs py-0.5 flex-1" placeholder="Konditor"
            onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ assignedTo }); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
          />
          <button onClick={() => { onUpdate({ assignedTo }); setEditing(false); }} className="btn-sm btn-primary py-0.5">✓</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="mt-1 text-[10px] text-[#6A6D70] hover:text-[#FF385C] flex items-center gap-0.5">
          <User className="w-2.5 h-2.5" />{task.assignedTo ? 'Zugewiesen ändern' : 'Konditor zuweisen'}
        </button>
      )}
    </div>
  );
}

// ─── MISC TASK MODAL ─────────────────────────────────────────────────────────

function MiscTaskModal({ planId, defaultDay, onClose, onDone }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: { notes: '', plannedDay: defaultDay ?? 'MON', estimatedMinutes: 0, cashAmount: 0, assignedTo: '' },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await weeklyApi.plans.addTask(planId, { ...data, taskType: 'MISC', quantity: 1 });
      toast.success('Task hinzugefügt');
      onDone();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Fehler'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-3 rounded-xl text-sm" style={{ background: '#FFF8F0', border: '1px solid #FDDAB0' }}>
        Für operative Tätigkeiten ohne Produkt — z.B. Reinigung, Einkauf beim lokalen Händler. Die Arbeitszeit fliesst in die Lohnkosten, der Barbetrag in die Sonstigen Kosten.
      </div>
      <div>
        <label className="label">Beschreibung *</label>
        <input {...register('notes', { required: true })} className="input" placeholder="z.B. Erdbeeren beim Markt kaufen" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Tag</label>
          <select {...register('plannedDay')} className="input">
            {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Arbeitszeit (min)</label>
          <input {...register('estimatedMinutes', { valueAsNumber: true })} type="number" min={0} className="input" placeholder="60" />
        </div>
        <div>
          <label className="label">Barauslage (€)</label>
          <input {...register('cashAmount', { valueAsNumber: true })} type="number" min={0} step="0.01" className="input" placeholder="15.00" />
        </div>
      </div>
      <div>
        <label className="label">Konditor / Mitarbeiter:in</label>
        <input {...register('assignedTo')} className="input" placeholder="z.B. Klaus" />
      </div>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary" style={{ background: '#E76500', borderColor: '#E76500' }}>
          {saving ? 'Speichern…' : 'Task hinzufügen'}
        </button>
      </div>
    </form>
  );
}

// ─── GENERATE MODAL ───────────────────────────────────────────────────────────

function GenerateModal({ planId, products, onClose, onDone }: any) {
  const [entries, setEntries] = useState<Array<{ productId: string; quantity: number; deliveryDay: string }>>([
    { productId: '', quantity: 1, deliveryDay: 'FRI' },
  ]);
  const [loading, setLoading] = useState(false);

  const addRow = () => setEntries(e => [...e, { productId: '', quantity: 1, deliveryDay: 'FRI' }]);
  const removeRow = (i: number) => setEntries(e => e.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, value: any) =>
    setEntries(e => e.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const generate = async () => {
    const valid = entries.filter(e => e.productId);
    if (!valid.length) { toast.error('Mindestens ein Produkt auswählen'); return; }
    setLoading(true);
    try {
      await weeklyApi.plans.generate(planId, valid);
      toast.success('Tasks generiert');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Fehler');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-[#6A6D70] px-1">
        Wähle Produkte und ihren Liefertag. Arbeitsstufen werden automatisch auf die richtigen Tage verteilt.
      </div>
      <div className="space-y-2">
        {entries.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <select value={row.productId} onChange={e => update(i, 'productId', e.target.value)} className="input text-sm">
                <option value="">Produkt wählen…</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <input type="number" value={row.quantity} min={1} onChange={e => update(i, 'quantity', +e.target.value)} className="input text-sm" placeholder="Menge" />
            </div>
            <div className="col-span-3">
              <select value={row.deliveryDay} onChange={e => update(i, 'deliveryDay', e.target.value)} className="input text-sm">
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
            </div>
            <button onClick={() => removeRow(i)} className="col-span-2 btn-sm btn-danger justify-center">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Produkt hinzufügen</button>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button onClick={onClose} className="btn-ghost">Abbrechen</button>
        <button onClick={generate} disabled={loading} className="btn-primary">
          <Play className="w-3.5 h-3.5" />
          {loading ? 'Generiere…' : 'Tasks generieren'}
        </button>
      </div>
    </div>
  );
}

// ─── ADD TASK MODAL ───────────────────────────────────────────────────────────

function AddTaskModal({ planId, products, defaultDay, onClose, onDone }: any) {
  const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { productId: '', recipeStageId: '', plannedDay: defaultDay ?? 'MON', quantity: 1, assignedTo: '', estimatedMinutes: 0, notes: '' } });
  const selectedProductId = watch('productId');
  const selectedStageId   = watch('recipeStageId');
  const { data: stages = [] } = useQuery({
    queryKey: ['recipe-stages-for', selectedProductId],
    queryFn: () => selectedProductId
      ? weeklyApi.stages.get(products.find((p: any) => p.id === selectedProductId)?.recipeId ?? '').then(r => r.data)
      : Promise.resolve([]),
    enabled: !!selectedProductId,
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);
  const selectedStage = stages.find((s: any) => s.id === selectedStageId);

  // Auto-fill Arbeitszeit: stage takes priority, else recipe total
  useEffect(() => {
    if (selectedStage?.labourTimeMinutes != null) {
      setValue('estimatedMinutes', selectedStage.labourTimeMinutes);
    } else if (selectedProduct?.recipe?.labourTimeMinutes) {
      setValue('estimatedMinutes', selectedProduct.recipe.labourTimeMinutes);
    }
  }, [selectedStageId, selectedProductId, selectedStage, selectedProduct, setValue]);

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await weeklyApi.plans.addTask(planId, { ...data, recipeStageId: data.recipeStageId || null });
      toast.success('Task hinzugefügt');
      onDone();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Fehler'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Produkt *</label>
          <select {...register('productId', { required: true })} className="input">
            <option value="">Produkt wählen…</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Arbeitsstufe</label>
          <select {...register('recipeStageId')} className="input" disabled={!stages.length}>
            <option value="">— kein Stufe —</option>
            {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Tag</label>
          <select {...register('plannedDay')} className="input">
            {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Menge</label>
          <input {...register('quantity', { valueAsNumber: true })} type="number" min={1} className="input" />
        </div>
        <div>
          <label className="label">Arbeitszeit (min)</label>
          <input {...register('estimatedMinutes', { valueAsNumber: true })} type="number" min={0} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Konditor</label>
        <input {...register('assignedTo')} className="input" placeholder="z.B. Klaus" />
      </div>
      <div>
        <label className="label">Notiz</label>
        <input {...register('notes')} className="input" />
      </div>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Speichern…' : 'Task hinzufügen'}</button>
      </div>
    </form>
  );
}

// ─── WEEKLY BOARD ─────────────────────────────────────────────────────────────

function WeeklyBoard({ plan }: { plan: any }) {
  const qc = useQueryClient();
  const [addTaskDay, setAddTaskDay] = useState<string | null>(null);
  const [modal, setModal] = useState<'generate' | 'addTask' | 'miscTask' | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => productsApi.list({ includeInactive: false }).then(r => r.data),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.list().then(r => r.data),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: any) => weeklyApi.tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });
  const deleteTask = useMutation({
    mutationFn: (id: string) => weeklyApi.tasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }),
  });
  const clearMutation = useMutation({
    mutationFn: () => weeklyApi.plans.clearTasks(plan.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }); toast.success('Tasks geleert'); },
  });

  // Auto-assign: for each task day, distribute among employees available that day (round-robin)
  const autoAssign = async () => {
    const tasks: any[] = plan.tasks ?? [];
    if (!tasks.length || !employees.length) return;
    setAssigning(true);
    try {
      // Build availability map: day → employees available
      const availMap: Record<string, any[]> = {};
      for (const day of DAYS) {
        availMap[day] = employees.filter((e: any) => {
          const days: string[] = e.availableDays ? JSON.parse(e.availableDays) : [];
          return e.isActive && days.includes(day);
        });
      }
      // Round-robin counters per day
      const counters: Record<string, number> = {};
      for (const day of DAYS) counters[day] = 0;

      for (const task of tasks) {
        const day = task.plannedDay;
        const pool = availMap[day] ?? [];
        if (!pool.length) continue;
        const emp = pool[counters[day] % pool.length];
        counters[day]++;
        await weeklyApi.tasks.update(task.id, { assignedTo: emp.name });
      }
      qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] });
      toast.success('Konditor:innen zugewiesen');
    } catch {
      toast.error('Fehler beim Zuweisen');
    } finally {
      setAssigning(false);
    }
  };

  const tasksByDay: Record<string, any[]> = {};
  for (const d of DAYS) tasksByDay[d] = [];
  for (const t of plan.tasks ?? []) {
    if (tasksByDay[t.plannedDay]) tasksByDay[t.plannedDay].push(t);
  }

  // Summary per day
  const dayTotals: Record<string, { min: number; done: number; total: number }> = {};
  for (const d of DAYS) {
    const tasks = tasksByDay[d];
    dayTotals[d] = {
      min: tasks.reduce((s, t) => s + Number(t.estimatedMinutes ?? 0), 0),
      done: tasks.filter(t => t.status === 'DONE').length,
      total: tasks.length,
    };
  }

  // Konditor total across whole week
  const konditorTotals: Record<string, number> = {};
  for (const t of plan.tasks ?? []) {
    if (t.assignedTo) konditorTotals[t.assignedTo] = (konditorTotals[t.assignedTo] ?? 0) + Number(t.estimatedMinutes ?? 0);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setModal('generate')} className="btn-primary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Tasks generieren
        </button>
        <button onClick={() => { setAddTaskDay('MON'); setModal('addTask'); }} className="btn-secondary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Task manuell
        </button>
        <button onClick={() => { setAddTaskDay('MON'); setModal('miscTask'); }} className="btn-sm"
                style={{ background: '#FFF8F0', border: '1px solid #FDDAB0', color: '#E76500' }}>
          <ShoppingBag className="w-3.5 h-3.5" /> Sonstiger Task
        </button>
        {plan.tasks?.length > 0 && (
          <button
            onClick={autoAssign}
            disabled={assigning}
            className="btn-sm"
            style={{ background: '#F0F4FF', border: '1px solid #C5D5FF', color: '#1B66C9' }}
            title="Konditor:innen automatisch zuweisen basierend auf Verfügbarkeit"
          >
            <Users className="w-3.5 h-3.5" /> {assigning ? 'Zuweisen…' : 'Konditor zuweisen'}
          </button>
        )}
        {plan.tasks?.length > 0 && (
          <button onClick={() => { if (confirm('Alle Tasks dieser Woche löschen?')) clearMutation.mutate(); }} className="btn-ghost btn-sm text-[#BB0000]">
            <Trash2 className="w-3.5 h-3.5" /> Alle leeren
          </button>
        )}

        {/* Konditor summary */}
        {Object.keys(konditorTotals).length > 0 && (
          <div className="ml-auto flex gap-2">
            {Object.entries(konditorTotals).map(([k, m]) => (
              <span key={k} className="flex items-center gap-1 text-xs px-2 py-1"
                    style={{ background: '#FFF0F3', border: '1px solid #FFC2CF', color: '#E31C5F' }}>
                <User className="w-3 h-3" />{k}: {fmtMinutes(m)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        {DAYS.map(day => {
          const tasks = tasksByDay[day];
          const totals = dayTotals[day];
          const allDone = totals.total > 0 && totals.done === totals.total;

          return (
            <div key={day}>
              {/* Day header */}
              <div className="mb-2 px-2 py-1.5 flex items-center justify-between"
                   style={{
                     background: allDone ? '#E8F5E9' : '#F5F5F5',
                     borderBottom: `2px solid ${allDone ? '#256F3A' : '#FF385C'}`,
                   }}>
                <div>
                  <p className="text-xs font-bold text-[#32363A]">{DAY_SHORT[day]}</p>
                  <p className="text-[10px] text-[#6A6D70]">{DAY_LABELS[day]}</p>
                </div>
                <div className="text-right">
                  {totals.min > 0 && <p className="text-[10px] font-semibold" style={{ color: totals.min > 480 ? '#BB0000' : '#E31C5F' }}>{fmtMinutes(totals.min)}</p>}
                  {totals.total > 0 && <p className="text-[10px] text-[#6A6D70]">{totals.done}/{totals.total}</p>}
                </div>
              </div>

              {/* Tasks */}
              <div className="min-h-16">
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={(data) => updateTask.mutate({ id: task.id, data })}
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
              </div>

              {/* Add to this day */}
              <button
                onClick={() => { setAddTaskDay(day); setModal('addTask'); }}
                className="w-full text-center text-[10px] text-[#6A6D70] hover:text-[#FF385C] py-1 hover:bg-[#FFF0F3] transition-colors"
              >
                <Plus className="w-3 h-3 inline" /> Task
              </button>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {modal === 'generate' && (
        <Modal title="Tasks aus Produkt-Liste generieren" onClose={() => setModal(null)} size="lg">
          <GenerateModal
            planId={plan.id}
            products={products}
            onClose={() => setModal(null)}
            onDone={() => { qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }); setModal(null); }}
          />
        </Modal>
      )}
      {modal === 'addTask' && (
        <Modal title="Task manuell hinzufügen" onClose={() => setModal(null)} size="md">
          <AddTaskModal
            planId={plan.id}
            products={products}
            defaultDay={addTaskDay}
            onClose={() => setModal(null)}
            onDone={() => { qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }); setModal(null); }}
          />
        </Modal>
      )}
      {modal === 'miscTask' && (
        <Modal title="Sonstiger Task — Reinigung / Einkauf / …" onClose={() => setModal(null)} size="md">
          <MiscTaskModal
            planId={plan.id}
            defaultDay={addTaskDay}
            onClose={() => setModal(null)}
            onDone={() => { qc.invalidateQueries({ queryKey: ['weekly-plan', plan.id] }); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function WeeklyPage() {
  const qc = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [stagesModal, setStagesModal] = useState<any>(null);
  const [newPlanModal, setNewPlanModal] = useState(false);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => weeklyApi.plans.list().then(r => r.data),
  });
  const { data: allRecipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.list().then(r => r.data),
  });
  // Only show recipes linked to active products
  const { data: activeProducts = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => productsApi.list({ includeInactive: false }).then(r => r.data),
  });
  const activeRecipeIds = new Set(activeProducts.map((p: any) => p.recipeId).filter(Boolean));
  const recipes = allRecipes.filter((r: any) => activeRecipeIds.has(r.id));
  const { data: plan } = useQuery({
    queryKey: ['weekly-plan', selectedPlanId],
    queryFn: () => weeklyApi.plans.get(selectedPlanId!).then(r => r.data),
    enabled: !!selectedPlanId,
  });

  const createPlan = useMutation({
    mutationFn: (dto: any) => weeklyApi.plans.create(dto),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['weekly-plans'] });
      setSelectedPlanId(r.data.id);
      setNewPlanModal(false);
      toast.success('Wochenplan erstellt');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });
  const deletePlan = useMutation({
    mutationFn: (id: string) => weeklyApi.plans.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-plans'] }); setSelectedPlanId(null); },
  });
  const completePlan = useMutation({
    mutationFn: (id: string) => weeklyApi.plans.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-plans'] });
      qc.invalidateQueries({ queryKey: ['weekly-plan', selectedPlanId] });
      qc.invalidateQueries({ queryKey: ['production-plans'] });
      toast.success('Planung abgeschlossen — Produktionsplan bestätigt');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });

  const { year, weekNumber } = currentWeekInfo();

  return (
    <div className="space-y-0">
      <PageHeader
        title="Wochenplanung"
        subtitle="Granulare Produktionsplanung — Arbeitsstufen nach Wochentag"
        actions={
          <button onClick={() => setNewPlanModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Neue Woche
          </button>
        }
      />

      <div className="flex gap-5">
        {/* Sidebar: plan list + recipe stages */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {/* Plan list */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Wochenpläne</p>
            {plansLoading ? <p className="text-xs text-[#6A6D70]">Lade…</p> : (
              <div className="space-y-1">
                {plans.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className="group flex items-center justify-between px-2 py-1.5 cursor-pointer text-sm"
                    style={{
                      background: selectedPlanId === p.id ? '#FFF0F3' : '#FAFAFA',
                      border: `1px solid ${selectedPlanId === p.id ? '#FF385C' : '#D9D9D9'}`,
                      color: selectedPlanId === p.id ? '#FF385C' : '#32363A',
                    }}
                  >
                    <div>
                      <p className="text-xs font-semibold">KW {p.weekNumber}/{p.year}</p>
                      <p className="text-[10px] text-[#6A6D70]">{p._count?.tasks ?? 0} Tasks{p.status === 'COMPLETED' ? ' · ✓' : ''}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('Plan löschen?')) deletePlan.mutate(p.id); }}
                      className="opacity-0 group-hover:opacity-100 text-[#BB0000] hover:text-[#900000] p-0.5 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {plans.length === 0 && <p className="text-xs text-[#6A6D70]">Keine Pläne.</p>}
              </div>
            )}
          </div>

          {/* Recipe stages */}
          <div>
            <p className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Rezept-Stufen</p>
            <div className="space-y-1">
              {recipes.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setStagesModal(r)}
                  className="w-full text-left px-2 py-1.5 text-xs flex items-center justify-between"
                  style={{ background: '#FAFAFA', border: '1px solid #D9D9D9' }}
                >
                  <span className="truncate text-[#32363A]">{r.name}</span>
                  <Layers className="w-3 h-3 shrink-0 text-[#6A6D70]" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main board */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedPlanId ? (
            <div className="card flex flex-col items-center justify-center py-20 text-[#6A6D70]">
              <Layers className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Wochenplan auswählen oder neue Woche erstellen.</p>
              <button onClick={() => setNewPlanModal(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> KW {weekNumber}/{year} anlegen
              </button>
            </div>
          ) : plan ? (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="text-sm font-semibold text-[#32363A]">
                  Kalenderwoche {plan.weekNumber} / {plan.year}
                </h2>
                <span className="text-xs text-[#6A6D70]">
                  {new Date(plan.weekStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} –{' '}
                  {new Date(new Date(plan.weekStart).getTime() + 5 * 86400000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <span className="badge-blue text-xs">{plan.tasks?.length ?? 0} Tasks</span>
                {/* Completion progress */}
                {(() => {
                  const total = plan.tasks?.reduce((s: number, t: any) => s + Number(t.estimatedMinutes ?? 0), 0) ?? 0;
                  const done = plan.tasks?.filter((t: any) => t.status === 'DONE').reduce((s: number, t: any) => s + Number(t.estimatedMinutes ?? 0), 0) ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return total > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
                        <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#256F3A' : '#FF385C' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: pct === 100 ? '#256F3A' : '#FF385C' }}>{pct}%</span>
                    </div>
                  ) : null;
                })()}
                <span className="text-xs text-[#6A6D70]">
                  Gesamt: {fmtMinutes(plan.tasks?.reduce((s: number, t: any) => s + Number(t.estimatedMinutes ?? 0), 0) ?? 0)}
                </span>
                {plan.status === 'COMPLETED' ? (
                  <span className="ml-auto badge-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Abgeschlossen</span>
                ) : (
                  <button
                    className="ml-auto btn-sm flex items-center gap-1.5 font-medium"
                    style={{ background: '#256F3A', color: '#fff', border: 'none' }}
                    onClick={() => { if (confirm('Planung als abgeschlossen markieren? Der Produktionsplan wird automatisch bestätigt.')) completePlan.mutate(plan.id); }}
                    disabled={completePlan.isPending}
                  >
                    <Flag className="w-3.5 h-3.5" /> Planung abschließen
                  </button>
                )}
              </div>
              <WeeklyBoard plan={plan} />
            </div>
          ) : (
            <div className="card text-center py-10 text-[#6A6D70] text-sm">Lade Plan…</div>
          )}
        </div>
      </div>

      {/* New plan modal */}
      {newPlanModal && (
        <Modal title="Neuen Wochenplan erstellen" onClose={() => setNewPlanModal(false)} size="sm">
          <NewPlanForm
            defaultYear={year}
            defaultWeek={weekNumber}
            onClose={() => setNewPlanModal(false)}
            onSubmit={(dto: any) => createPlan.mutate(dto)}
          />
        </Modal>
      )}

      {/* Recipe stages modal */}
      {stagesModal && (
        <Modal title={`Arbeitsstufen — ${stagesModal.name}`} onClose={() => setStagesModal(null)} size="xl">
          <RecipeStagesModal recipe={stagesModal} onClose={() => setStagesModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function NewPlanForm({ defaultYear, defaultWeek, onClose, onSubmit }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: { year: defaultYear, weekNumber: defaultWeek, notes: '' },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Jahr</label>
          <input {...register('year', { valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Kalenderwoche</label>
          <input {...register('weekNumber', { valueAsNumber: true })} type="number" min={1} max={53} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notizen</label>
        <input {...register('notes')} className="input" placeholder="z.B. Hochsaison, Sonderbestellungen…" />
      </div>
      <div className="flex gap-3 justify-end pt-3 border-t border-[#EDEFF0]">
        <button type="button" onClick={onClose} className="btn-ghost">Abbrechen</button>
        <button type="submit" className="btn-primary">Erstellen</button>
      </div>
    </form>
  );
}
