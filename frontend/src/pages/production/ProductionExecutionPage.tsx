import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getISOWeek, getISOWeekYear, format, addDays, startOfISOWeek } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Clock, ChefHat, PackagePlus, AlertCircle, Circle,
} from 'lucide-react';
import { weeklyApi, storageApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
type Day = typeof DAYS[number];

const DAY_LABELS: Record<Day, string> = {
  MON: 'Montag', TUE: 'Dienstag', WED: 'Mittwoch',
  THU: 'Donnerstag', FRI: 'Freitag', SAT: 'Samstag',
};

function getTodayKey(): Day | null {
  const d = new Date().getDay();
  const map: Record<number, Day> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
  return map[d] ?? null;
}

function autoBatch(productName: string) {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `FG-${date}-${productName.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`;
}

export default function ProductionExecutionPage() {
  const qc = useQueryClient();
  const now = new Date();
  const currentYear = getISOWeekYear(now);
  const currentWeek = getISOWeek(now);
  const today = getTodayKey();
  const weekStart = startOfISOWeek(now);

  const [doneTask, setDoneTask] = useState<any | null>(null);
  const [activeDay, setActiveDay] = useState<Day>(today ?? 'MON');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => weeklyApi.plans.list().then(r => r.data),
  });

  const planMeta = useMemo(
    () => (plans as any[]).find(p => p.year === currentYear && p.weekNumber === currentWeek),
    [plans, currentYear, currentWeek],
  );

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ['weekly-plan', planMeta?.id],
    queryFn: () => weeklyApi.plans.get(planMeta!.id).then(r => r.data),
    enabled: !!planMeta?.id,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => storageApi.locations.list().then(r => r.data),
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: any) => weeklyApi.tasks.update(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-plan', planMeta?.id] }),
  });

  const createStorage = useMutation({
    mutationFn: (data: any) => storageApi.records.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-records'] }),
  });

  const tasks: any[] = plan?.tasks ?? [];

  const tasksByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    DAYS.forEach(d => { map[d] = []; });
    tasks.forEach(t => { if (map[t.plannedDay]) map[t.plannedDay].push(t); });
    return map;
  }, [tasks]);

  const handleConfirmDone = async (storageData: {
    quantity: number; locationId: string; expiryDate: string; notes: string;
  }) => {
    try {
      await updateTask.mutateAsync({ taskId: doneTask.id, data: { status: 'DONE' } });

      if (doneTask.product?.id && storageData.quantity > 0) {
        await createStorage.mutateAsync({
          productId: doneTask.product.id,
          weeklyTaskId: doneTask.id,
          locationId: storageData.locationId || undefined,
          quantity: storageData.quantity,
          batchNumber: autoBatch(doneTask.product.name),
          productionDate: new Date().toISOString(),
          expiryDate: storageData.expiryDate || undefined,
          notes: storageData.notes || undefined,
          unitCost: doneTask.product.totalCost ?? undefined,
        });
      }

      toast.success(`✓ ${doneTask.product?.name ?? 'Aufgabe'} eingelagert`);
      setDoneTask(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Fehler beim Speichern');
    }
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'DONE').length;
  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  if (isLoading || loadingPlan) {
    return (
      <div className="space-y-6">
        <PageHeader title="Aktuelle Woche" subtitle={`KW ${currentWeek}`} />
        <div className="card p-8 text-center text-[#6A6A6A]">Lädt Wochenplan…</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader title="Aktuelle Woche" subtitle={`KW ${currentWeek} · ${currentYear}`} />
        <div className="card p-14 text-center">
          <AlertCircle className="w-10 h-10 text-[#DDDDDD] mx-auto mb-4" />
          <p className="font-semibold text-[#222222]">Kein Wochenplan für KW {currentWeek}</p>
          <p className="text-sm text-[#6A6A6A] mt-1">
            Erstelle zuerst einen Plan unter <strong>Production → Wochenplanung</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aktuelle Woche"
        subtitle={`KW ${currentWeek} · ${format(weekStart, 'dd. MMM')} – ${format(addDays(weekStart, 5), 'dd. MMM yyyy')}`}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6A6A6A]">
              <span className="font-bold text-[#222222]">{doneTasks}</span> / {totalTasks} fertig
            </span>
            <div className="w-28 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: progress === 100 ? '#00A86B' : '#FF385C' }}
              />
            </div>
          </div>
        }
      />

      {/* Day tabs */}
      <div className="flex gap-1 bg-[#F7F7F7] p-1 rounded-2xl w-fit">
        {DAYS.map(day => {
          const dayTasks = tasksByDay[day];
          const dayDone = dayTasks.filter(t => t.status === 'DONE').length;
          const isToday = day === today;
          const isActive = day === activeDay;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className="relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-150"
              style={{
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#222222' : '#6A6A6A',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              <span className="block">{DAY_LABELS[day].slice(0, 2)}</span>
              {dayTasks.length > 0 && (
                <span
                  className="block text-[10px] font-semibold mt-0.5"
                  style={{ color: dayDone === dayTasks.length ? '#00A86B' : isToday ? '#FF385C' : '#B0B0B0' }}
                >
                  {dayDone}/{dayTasks.length}
                </span>
              )}
              {isToday && !isActive && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#FF385C' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Task list for active day */}
      <div>
        {/* Day header */}
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-[#222222]">
            {DAY_LABELS[activeDay]}
          </h2>
          <span className="text-sm text-[#6A6A6A]">
            {format(addDays(weekStart, DAYS.indexOf(activeDay)), 'dd. MMM')}
          </span>
          {activeDay === today && (
            <span
              className="text-xs font-semibold px-2 py-0.5 text-white rounded-full"
              style={{ background: '#FF385C' }}
            >
              Heute
            </span>
          )}
        </div>

        {tasksByDay[activeDay].length === 0 ? (
          <div className="card p-10 text-center text-[#B0B0B0] text-sm">
            Keine Aufgaben für diesen Tag
          </div>
        ) : (
          <div className="space-y-2">
            {tasksByDay[activeDay].map(task => {
              const done = task.status === 'DONE';
              return (
                <div
                  key={task.id}
                  className="card p-0 overflow-hidden transition-all"
                  style={{ opacity: done ? 0.6 : 1 }}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Status icon */}
                    <button
                      onClick={() => !done && setDoneTask(task)}
                      disabled={done}
                      className="shrink-0 transition-transform hover:scale-110"
                      title={done ? 'Fertig' : 'Als fertig markieren'}
                    >
                      {done ? (
                        <CheckCircle2 className="w-6 h-6" style={{ color: '#00A86B' }} fill="#00A86B" />
                      ) : (
                        <Circle className="w-6 h-6 text-[#DDDDDD]" />
                      )}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-[#222222]"
                        style={{ textDecoration: done ? 'line-through' : 'none' }}
                      >
                        {task.product?.name ?? task.notes ?? 'Aufgabe'}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-sm text-[#6A6A6A]">
                          × {task.quantity} {task.product?.recipe?.yieldUnit ?? 'Stk'}
                        </span>
                        {task.estimatedMinutes > 0 && (
                          <span className="text-xs text-[#B0B0B0] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {task.estimatedMinutes} min
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="text-xs text-[#B0B0B0]">👤 {task.assignedTo}</span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {done ? (
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full shrink-0"
                        style={{ background: '#E8F8EE', color: '#008A05' }}
                      >
                        Eingelagert ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => setDoneTask(task)}
                        className="btn btn-sm shrink-0"
                        style={{
                          borderRadius: 9999,
                          background: 'linear-gradient(to right, #E61E4D, #D70466)',
                          color: '#FFF',
                          border: 'none',
                          fontSize: 12,
                          height: 30,
                          padding: '0 16px',
                          fontWeight: 600,
                        }}
                      >
                        <ChefHat className="w-3.5 h-3.5" /> Fertig & Einlagern
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All-days summary strip */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-[#6A6A6A] uppercase tracking-wide mb-3">Wochenübersicht</p>
        <div className="grid grid-cols-6 gap-2">
          {DAYS.map(day => {
            const dt = tasksByDay[day];
            const dn = dt.filter(t => t.status === 'DONE').length;
            const pct = dt.length > 0 ? (dn / dt.length) * 100 : 0;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                style={{ background: activeDay === day ? '#F7F7F7' : 'transparent' }}
              >
                <span className="text-[11px] font-semibold text-[#6A6A6A]">{DAY_LABELS[day].slice(0, 2)}</span>
                <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#00A86B' : '#FF385C' }}
                  />
                </div>
                <span className="text-[10px] text-[#B0B0B0]">{dn}/{dt.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Konditor storage dialog */}
      {doneTask && (
        <StorageDialog
          task={doneTask}
          locations={locations}
          onClose={() => setDoneTask(null)}
          onConfirm={handleConfirmDone}
          loading={updateTask.isPending || createStorage.isPending}
        />
      )}
    </div>
  );
}

function StorageDialog({ task, locations, onClose, onConfirm, loading }: {
  task: any; locations: any[]; onClose: () => void;
  onConfirm: (d: any) => void; loading: boolean;
}) {
  const [quantity, setQuantity] = useState(task.quantity);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  return (
    <Modal title="Fertig & Einlagern" onClose={onClose} size="sm">
      {/* Product summary */}
      <div
        className="flex items-start gap-3 p-3 mb-5 rounded-xl"
        style={{ background: '#FFF0F3', border: '1px solid #FFD6E0' }}
      >
        <ChefHat className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#E31C5F' }} />
        <div>
          <div className="font-bold text-[#222222]">{task.product?.name ?? task.notes}</div>
          <div className="text-xs text-[#6A6A6A] mt-0.5">Geplant: {task.quantity} Stück</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Tatsächlich produziert *</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            min={0}
            step={1}
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Lagerort (Konditor wählt)</label>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            className="input"
          >
            <option value="">— Kein Lager zuweisen —</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {locations.length === 0 && (
            <p className="text-xs text-[#B0B0B0] mt-1">
              Lagerorte anlegen unter Stammdaten → Lagerorte
            </p>
          )}
        </div>

        <div>
          <label className="label">Haltbar bis</label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label">Notiz (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="z.B. Glasur leicht angepasst"
            className="input"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-5 mt-5" style={{ borderTop: '1px solid #EBEBEB' }}>
        <button onClick={onClose} className="btn btn-ghost">Abbrechen</button>
        <button
          onClick={() => onConfirm({ quantity, locationId, expiryDate, notes })}
          disabled={loading || quantity <= 0}
          className="btn btn-primary"
        >
          <PackagePlus className="w-4 h-4" />
          {loading ? 'Speichern…' : 'Einlagern & Fertig ✓'}
        </button>
      </div>
    </Modal>
  );
}
