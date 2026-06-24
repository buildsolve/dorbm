import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Clock, Euro, Users } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { employeeApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

const ROLES = ['KONDITOR', 'BAECKER', 'AUSHILFE', 'AZUBI', 'KUECHENLEITUNG'];
const ROLE_LABEL: Record<string, string> = {
  KONDITOR: 'Konditor:in', BAECKER: 'Bäcker:in', AUSHILFE: 'Aushilfe',
  AZUBI: 'Azubi', KUECHENLEITUNG: 'Küchenleitung',
};
const ROLE_ICON: Record<string, string> = {
  KONDITOR: '🎂', BAECKER: '🥐', AUSHILFE: '🧹', AZUBI: '📚', KUECHENLEITUNG: '👩‍🍳',
};

const WEEKDAYS = [
  { code: 'MON', label: 'Mo' },
  { code: 'TUE', label: 'Di' },
  { code: 'WED', label: 'Mi' },
  { code: 'THU', label: 'Do' },
  { code: 'FRI', label: 'Fr' },
  { code: 'SAT', label: 'Sa' },
];

function EmployeeForm({ employee, onSubmit, onClose }: any) {
  const defaultDays = employee?.availableDays
    ? JSON.parse(employee.availableDays)
    : ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const [availDays, setAvailDays] = useState<string[]>(defaultDays);

  const { register, handleSubmit } = useForm({
    defaultValues: employee || { role: 'KONDITOR', weeklyHours: 40, hourlyRate: 18 },
  });

  const toggleDay = (code: string) =>
    setAvailDays(prev => prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]);

  return (
    <form onSubmit={handleSubmit(data => onSubmit({ ...data, availableDays: JSON.stringify(availDays) }))} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input {...register('name', { required: true })} className="input" placeholder="Konditor 3" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Rolle</label>
          <select {...register('role')} className="input">
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Wochenstunden (bezahlt) *</label>
          <input {...register('weeklyHours', { required: true, valueAsNumber: true })} type="number" step="0.5" className="input" />
        </div>
        <div>
          <label className="label">Stundenlohn (€) *</label>
          <input {...register('hourlyRate', { required: true, valueAsNumber: true })} type="number" step="0.5" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Verfügbare Tage</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {WEEKDAYS.map(d => (
            <button
              key={d.code}
              type="button"
              onClick={() => toggleDay(d.code)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-all"
              style={availDays.includes(d.code)
                ? { background: '#FF385C', color: 'white', borderColor: '#FF385C' }
                : { background: 'white', color: '#6A6D70', borderColor: '#D9D9D9' }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Notizen</label>
        <input {...register('notes')} className="input" placeholder="z.B. Schwerpunkt Torten" />
      </div>
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => employeeApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Mitarbeiter:in angelegt'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => employeeApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Aktualisiert'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Deaktiviert'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Fehler'),
  });

  const totalHours = employees.reduce((s: number, e: any) => s + Number(e.weeklyHours), 0);
  const totalPayroll = employees.reduce((s: number, e: any) => s + Number(e.weeklyHours) * Number(e.hourlyRate), 0);

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Mitarbeiter:innen, bezahlte Wochenstunden und Stundenlöhne — Basis für die Lohnkosten im Dashboard"
        actions={
          <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Mitarbeiter:in
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-[#FFF0F3] text-[#E31C5F]"><Users className="w-5 h-5" /></div>
          <div>
            <p className="text-xl font-bold text-[#222222] leading-none">{employees.length}</p>
            <p className="text-xs text-[#6A6A6A] mt-1">Aktive Mitarbeiter:innen</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-[#EBF3FF] text-[#1B66C9]"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-xl font-bold text-[#222222] leading-none">{totalHours} h</p>
            <p className="text-xs text-[#6A6A6A] mt-1">Bezahlte Stunden / Woche (Kapazität)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-[#E8F8EE] text-[#008A05]"><Euro className="w-5 h-5" /></div>
          <div>
            <p className="text-xl font-bold text-[#222222] leading-none">{formatCurrency(totalPayroll)}</p>
            <p className="text-xs text-[#6A6A6A] mt-1">Lohnkosten / Woche ({formatCurrency(totalPayroll * 4.33)} / Monat)</p>
          </div>
        </div>
      </div>

      {/* Employee cards */}
      {isLoading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {employees.map((e: any) => {
            const days: string[] = e.availableDays ? JSON.parse(e.availableDays) : [];
            return (
              <div key={e.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ROLE_ICON[e.role] ?? '👤'}</span>
                    <div>
                      <p className="font-semibold text-[#222222]">{e.name}</p>
                      <span className="badge-blue">{ROLE_LABEL[e.role] ?? e.role}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-[#F7F7F7]">
                    <p className="text-sm font-bold text-[#222222]">{e.weeklyHours} h</p>
                    <p className="text-[10px] text-[#6A6A6A]">pro Woche</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F7F7F7]">
                    <p className="text-sm font-bold text-[#222222]">{formatCurrency(e.hourlyRate)}</p>
                    <p className="text-[10px] text-[#6A6A6A]">pro Stunde</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F7F7F7]">
                    <p className="text-sm font-bold text-[#222222]">{formatCurrency(e.weeklyHours * e.hourlyRate)}</p>
                    <p className="text-[10px] text-[#6A6A6A]">pro Woche</p>
                  </div>
                </div>

                {/* Available days */}
                {days.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#6A6A6A] mr-0.5">Verfügbar:</span>
                    {WEEKDAYS.map(d => (
                      <span
                        key={d.code}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={days.includes(d.code)
                          ? { background: '#FFF0F3', color: '#E31C5F', border: '1px solid #FFCCD5' }
                          : { background: '#F5F6F7', color: '#C0C4C8', border: '1px solid #EDEFF0' }}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                )}

                {e.notes && <p className="text-xs text-[#6A6A6A]">{e.notes}</p>}
                <div className="flex gap-2 pt-2 border-t mt-auto">
                  <button onClick={() => { setSelected(e); setModal('edit'); }} className="btn-sm btn-secondary flex-1"><Pencil className="w-3 h-3" /> Bearbeiten</button>
                  <button onClick={() => { if (confirm('Mitarbeiter:in deaktivieren?')) deleteMutation.mutate(e.id); }} className="btn-sm btn-danger"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="card p-8 text-center text-gray-500 col-span-full">Noch keine Mitarbeiter:innen — lege Konditor 1, Konditor 2 … an.</div>
          )}
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Neue:r Mitarbeiter:in' : 'Mitarbeiter:in bearbeiten'} onClose={() => setModal(null)} size="lg">
          <EmployeeForm
            employee={selected}
            onClose={() => setModal(null)}
            onSubmit={(data: any) => modal === 'create' ? createMutation.mutate(data) : updateMutation.mutate({ id: selected.id, data })}
          />
        </Modal>
      )}
    </div>
  );
}
