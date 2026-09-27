import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import { Coins, Trash2, Plus, PenLine, CheckCircle2, Landmark } from 'lucide-react';
import { cashControlApi, employeeApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency } from '../../utils/format';

const DENOMINATIONS: { value: number; kind: 'COIN' | 'NOTE' }[] = [
  { value: 0.01, kind: 'COIN' }, { value: 0.02, kind: 'COIN' }, { value: 0.05, kind: 'COIN' },
  { value: 0.10, kind: 'COIN' }, { value: 0.20, kind: 'COIN' }, { value: 0.50, kind: 'COIN' },
  { value: 1, kind: 'COIN' }, { value: 2, kind: 'COIN' },
  { value: 5, kind: 'NOTE' }, { value: 10, kind: 'NOTE' }, { value: 20, kind: 'NOTE' },
  { value: 50, kind: 'NOTE' }, { value: 100, kind: 'NOTE' }, { value: 200, kind: 'NOTE' }, { value: 500, kind: 'NOTE' },
];

const denomLabel = (value: number) => (value < 1 ? `${Math.round(value * 100)} ct` : `€${value}`);
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function CashCountEntry() {
  const qc = useQueryClient();
  const [businessDate, setBusinessDate] = useState(todayStr());
  const [employeeId, setEmployeeId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [posCashSales, setPosCashSales] = useState('0');
  const [reason, setReason] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalPurpose, setWithdrawalPurpose] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const sigRef = useRef<SignatureCanvas>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.list().then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['cash-control-settings'],
    queryFn: () => cashControlApi.getSettings().then(r => r.data),
  });

  const allowedEmployeeIds: string[] = settings?.allowedEmployeeIds
    ? settings.allowedEmployeeIds.split(',').filter(Boolean)
    : [];
  const selectableEmployees = allowedEmployeeIds.length
    ? employees.filter((e: any) => allowedEmployeeIds.includes(e.id))
    : employees;

  const { data: count } = useQuery({
    queryKey: ['cash-count', businessDate],
    queryFn: () => cashControlApi.getByDate(businessDate).then(r => r.data),
  });

  const { data: recentDeposits = [] } = useQuery({
    queryKey: ['cash-deposits'],
    queryFn: () => cashControlApi.deposits.list().then(r => r.data.slice(0, 5)),
  });

  useEffect(() => {
    if (!count) {
      setQuantities({});
      setPosCashSales('0');
      setReason('');
      return;
    }
    setEmployeeId(count.employeeId);
    setPosCashSales(String(count.posCashSales ?? 0));
    setReason(count.reason ?? '');
    const q: Record<string, number> = {};
    for (const d of count.denominationCounts ?? []) q[d.denomination.toFixed(2)] = d.quantity;
    setQuantities(q);
  }, [count]);

  const countedAmount = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d.value * (quantities[d.value.toFixed(2)] || 0), 0),
    [quantities],
  );

  const startMutation = useMutation({
    mutationFn: () => cashControlApi.createOrGet({ businessDate, employeeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-count', businessDate] }),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Konnte Kassensturz nicht starten'),
  });

  const saveMutation = useMutation({
    mutationFn: () => cashControlApi.patch(count!.id, {
      posCashSales: Number(posCashSales) || 0,
      denominationCounts: DENOMINATIONS
        .map(d => ({ denomination: d.value, kind: d.kind, quantity: quantities[d.value.toFixed(2)] || 0 }))
        .filter(d => d.quantity > 0),
      reason,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-count', businessDate] }); toast.success('Gespeichert'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Speichern fehlgeschlagen'),
  });

  const addWithdrawalMutation = useMutation({
    mutationFn: () => cashControlApi.addWithdrawal(count!.id, { amount: Number(withdrawalAmount), purpose: withdrawalPurpose }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-count', businessDate] });
      setWithdrawalAmount(''); setWithdrawalPurpose('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Barentnahme fehlgeschlagen'),
  });

  const removeWithdrawalMutation = useMutation({
    mutationFn: (withdrawalId: string) => cashControlApi.removeWithdrawal(count!.id, withdrawalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-count', businessDate] }),
  });

  const addDepositMutation = useMutation({
    mutationFn: () => cashControlApi.deposits.create({ amount: Number(depositAmount), note: depositNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-deposits'] });
      setDepositAmount(''); setDepositNote('');
      toast.success('Einzahlung erfasst');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Einzahlung fehlgeschlagen'),
  });

  const signMutation = useMutation({
    mutationFn: (signatureImage: string) => cashControlApi.sign(count!.id, signatureImage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-count', businessDate] }); toast.success('Kassensturz eingereicht'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Unterschrift fehlgeschlagen'),
  });

  const difference = count ? count.difference : 0;
  const requiresReason = Math.abs(difference) > 0.0001;
  const isSubmitted = count?.status === 'SUBMITTED';

  const handleSign = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Bitte unterschreiben'); return; }
    if (requiresReason && !reason.trim()) { toast.error('Bitte Grund für die Kassendifferenz angeben'); return; }
    signMutation.mutate(sigRef.current.toDataURL('image/png'));
  };

  return (
    <div>
      <PageHeader title="Kassensturz" subtitle="Tägliche Kassenführung" />

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Datum</label>
          <input
            type="date" value={businessDate} disabled={!!count}
            onChange={e => setBusinessDate(e.target.value)}
            className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Mitarbeiter</label>
          <select
            value={employeeId} disabled={!!count}
            onChange={e => setEmployeeId(e.target.value)}
            className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="">Bitte wählen…</option>
            {selectableEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {!count && (
          <button
            onClick={() => startMutation.mutate()}
            disabled={!employeeId || startMutation.isPending}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: '#FF385C' }}
          >
            Kassensturz starten
          </button>
        )}
      </div>

      {count && (
        <>
          {isSubmitted && (
            <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium" style={{ background: '#E8F8EE', color: '#008A05' }}>
              <CheckCircle2 className="w-4 h-4" /> Für diesen Tag bereits eingereicht — nur noch lesbar.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#222] mb-3 flex items-center gap-2"><Coins className="w-4 h-4" /> Münzen &amp; Scheine</h3>
              <div className="grid grid-cols-2 gap-3">
                {DENOMINATIONS.map(d => (
                  <div key={d.value} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#444]">{denomLabel(d.value)}</span>
                    <input
                      type="number" min={0} disabled={isSubmitted}
                      value={quantities[d.value.toFixed(2)] || ''}
                      placeholder="0"
                      onChange={e => setQuantities(q => ({ ...q, [d.value.toFixed(2)]: Math.max(0, Number(e.target.value)) }))}
                      className="w-20 border border-[#DDDDDD] rounded-lg px-2 py-1.5 text-sm text-right"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 flex justify-between text-sm font-bold" style={{ borderTop: '1px solid #EBEBEB' }}>
                <span>Gezählt</span><span>{formatCurrency(countedAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[#222] mb-3">POS-Bericht &amp; Barentnahmen</h3>
                <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Bareinnahmen laut Tagesbericht</label>
                <input
                  type="number" min={0} step="0.01" disabled={isSubmitted}
                  value={posCashSales}
                  onChange={e => setPosCashSales(e.target.value)}
                  className="w-full border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm mb-4"
                />

                <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Barentnahmen</label>
                <div className="space-y-1.5 mb-2">
                  {(count.withdrawals ?? []).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between text-sm bg-[#F7F7F7] rounded-lg px-3 py-1.5">
                      <span>{formatCurrency(w.amount)} — {w.purpose}</span>
                      {!isSubmitted && (
                        <button onClick={() => removeWithdrawalMutation.mutate(w.id)} className="text-[#6A6A6A] hover:text-[#E31C5F]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!isSubmitted && (
                  <div className="flex gap-2">
                    <input
                      type="number" min={0} step="0.01" placeholder="Betrag"
                      value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)}
                      className="w-24 border border-[#DDDDDD] rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text" placeholder="Zweck (z.B. Einkauf Blumen)"
                      value={withdrawalPurpose} onChange={e => setWithdrawalPurpose(e.target.value)}
                      className="flex-1 border border-[#DDDDDD] rounded-lg px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => addWithdrawalMutation.mutate()}
                      disabled={!withdrawalAmount || !withdrawalPurpose || addWithdrawalMutation.isPending}
                      className="p-2 rounded-lg text-white disabled:opacity-40" style={{ background: '#222' }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[#222] mb-3">Kassendifferenz</h3>
                <div className="space-y-1.5 text-sm text-[#444]">
                  <div className="flex justify-between"><span>Anfangsbestand</span><span>{formatCurrency(count.openingBalance)}</span></div>
                  <div className="flex justify-between"><span>+ POS-Bareinnahmen</span><span>{formatCurrency(count.posCashSales)}</span></div>
                  <div className="flex justify-between"><span>− Barentnahmen</span><span>{formatCurrency(count.withdrawalsTotal)}</span></div>
                  <div className="flex justify-between font-semibold pt-1.5" style={{ borderTop: '1px solid #EBEBEB' }}>
                    <span>Soll</span><span>{formatCurrency(count.expectedAmount)}</span>
                  </div>
                  <div className="flex justify-between"><span>Ist (gezählt)</span><span>{formatCurrency(count.countedAmount)}</span></div>
                  <div className="flex justify-between text-base font-bold pt-1.5" style={{ borderTop: '1px solid #EBEBEB', color: Math.abs(difference) < 0.0001 ? '#008A05' : '#E31C5F' }}>
                    <span>Differenz</span><span>{formatCurrency(difference)}</span>
                  </div>
                </div>
                {requiresReason && (
                  <textarea
                    value={reason} disabled={isSubmitted}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Grund für die Kassendifferenz…"
                    className="w-full mt-3 border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm"
                    rows={2}
                  />
                )}
              </div>
            </div>
          </div>

          {!isSubmitted && (
            <div className="flex justify-end gap-3 mb-5">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-[#DDDDDD] text-[#222]"
              >
                Speichern
              </button>
            </div>
          )}

          {!isSubmitted && (
            <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#222] mb-3 flex items-center gap-2"><PenLine className="w-4 h-4" /> Unterschrift</h3>
              <div className="border border-[#DDDDDD] rounded-xl overflow-hidden" style={{ touchAction: 'none' }}>
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#222222"
                  canvasProps={{ width: 600, height: 180, className: 'w-full' }}
                />
              </div>
              <div className="flex justify-end gap-3 mt-3">
                <button onClick={() => sigRef.current?.clear()} className="px-4 py-2 rounded-full text-sm font-semibold border border-[#DDDDDD] text-[#222]">
                  Löschen
                </button>
                <button
                  onClick={handleSign}
                  disabled={signMutation.isPending}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                  style={{ background: '#FF385C' }}
                >
                  Unterschreiben &amp; einreichen
                </button>
              </div>
            </div>
          )}

          {isSubmitted && count.signatureImage && (
            <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#222] mb-3">Unterschrift</h3>
              <img src={count.signatureImage} alt="Unterschrift" className="border border-[#EBEBEB] rounded-xl max-w-full" />
            </div>
          )}
        </>
      )}

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 mt-5">
        <h3 className="text-sm font-bold text-[#222] mb-1 flex items-center gap-2"><Landmark className="w-4 h-4" /> Einzahlung (Bank)</h3>
        <p className="text-xs text-[#6A6A6A] mb-3">
          Unabhängig vom Kassensturz — direkt nach dem Abschluss oder auch erst Tage später erfassbar.
          Wird automatisch vom Anfangsbestand des nächsten Kassensturz abgezogen.
        </p>
        <div className="space-y-1.5 mb-3">
          {recentDeposits.length === 0 && <p className="text-sm text-[#6A6A6A]">Noch keine Einzahlungen erfasst</p>}
          {recentDeposits.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between text-sm bg-[#F7F7F7] rounded-lg px-3 py-1.5">
              <span>{formatCurrency(d.amount)}{d.note ? ` — ${d.note}` : ''}</span>
              <span className="text-xs text-[#6A6A6A]">{new Date(d.depositedAt).toLocaleString('de-DE')}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number" min={0} step="0.01" placeholder="Betrag"
            value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
            className="w-28 border border-[#DDDDDD] rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            type="text" placeholder="Notiz (optional, z.B. Bankreferenz)"
            value={depositNote} onChange={e => setDepositNote(e.target.value)}
            className="flex-1 border border-[#DDDDDD] rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => addDepositMutation.mutate()}
            disabled={!depositAmount || addDepositMutation.isPending}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: '#222' }}
          >
            Erfassen
          </button>
        </div>
      </div>
    </div>
  );
}
