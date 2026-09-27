import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cashControlApi, employeeApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

export default function CashControlSettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['cash-control-settings'],
    queryFn: () => cashControlApi.getSettings().then(r => r.data),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.list().then(r => r.data),
  });

  const [form, setForm] = useState({
    alertRecipients: '', allowedEmployeeIds: '', dailyCutoffTime: '23:00', timezone: 'Europe/Berlin',
    discrepancyThreshold: 0, initialOpeningBalance: 0,
  });

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const selectedEmployeeIds = form.allowedEmployeeIds ? form.allowedEmployeeIds.split(',').filter(Boolean) : [];
  const toggleEmployee = (id: string) => {
    const next = selectedEmployeeIds.includes(id)
      ? selectedEmployeeIds.filter(x => x !== id)
      : [...selectedEmployeeIds, id];
    setForm(f => ({ ...f, allowedEmployeeIds: next.join(',') }));
  };

  const saveMutation = useMutation({
    mutationFn: () => cashControlApi.updateSettings({ ...form, allowedEmployeeIds: selectedEmployeeIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-control-settings'] }); toast.success('Einstellungen gespeichert'); },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  });

  return (
    <div>
      <PageHeader title="Kassenführung — Einstellungen" subtitle="Benachrichtigungen &amp; Standardwerte" />

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Empfänger für Erinnerungs-E-Mails (kommagetrennt)</label>
          <input
            type="text" value={form.alertRecipients}
            onChange={e => setForm(f => ({ ...f, alertRecipients: e.target.value }))}
            placeholder="admin@firma.de, buchhaltung@firma.de"
            className="w-full border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Frist (Uhrzeit)</label>
            <input
              type="time" value={form.dailyCutoffTime}
              onChange={e => setForm(f => ({ ...f, dailyCutoffTime: e.target.value }))}
              className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Zeitzone</label>
            <input
              type="text" value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Toleranzschwelle (€)</label>
            <input
              type="number" min={0} step="0.01" value={form.discrepancyThreshold}
              onChange={e => setForm(f => ({ ...f, discrepancyThreshold: Number(e.target.value) }))}
              className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Anfangsbestand (falls noch kein Kassensturz existiert)</label>
            <input
              type="number" min={0} step="0.01" value={form.initialOpeningBalance}
              onChange={e => setForm(f => ({ ...f, initialOpeningBalance: Number(e.target.value) }))}
              className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">
            Für die Kassenführung berechtigte Mitarbeiter
          </label>
          <p className="text-xs text-[#6A6A6A] mb-2">
            Nur ausgewählte Mitarbeiter erscheinen im Kassensturz-Dropdown. Ist keiner ausgewählt, sind alle aktiven Mitarbeiter wählbar.
          </p>
          <div className="border border-[#DDDDDD] rounded-lg divide-y divide-[#EBEBEB] max-h-56 overflow-y-auto">
            {employees.length === 0 && (
              <p className="text-sm text-[#6A6A6A] px-3 py-2">Keine Mitarbeiter angelegt</p>
            )}
            {employees.map((e: any) => (
              <label key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#F7F7F7]">
                <input
                  type="checkbox"
                  checked={selectedEmployeeIds.includes(e.id)}
                  onChange={() => toggleEmployee(e.id)}
                  className="rounded"
                />
                {e.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: '#FF385C' }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
