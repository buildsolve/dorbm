import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { cashControlApi } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/format';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function CashControlDashboard() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['cash-control-summary', from, to],
    queryFn: () => cashControlApi.summary({ from, to }).then(r => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['cash-count-detail', selectedId],
    queryFn: () => cashControlApi.getById(selectedId!).then(r => r.data),
    enabled: !!selectedId,
  });

  const counts = summary?.counts ?? [];
  const chartData = [...counts].reverse().map((c: any) => ({
    date: c.businessDate.slice(5, 10),
    difference: c.difference,
  }));

  return (
    <div>
      <PageHeader title="Kassenführung — Dashboard" subtitle="Übersicht &amp; Kassendifferenzen" />

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Von</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6A6A6A] mb-1">Bis</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-[#DDDDDD] rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Eingereichte Kassenstürze" value={summary?.totalSubmitted ?? 0} icon={<Wallet className="w-5 h-5" />} color="blue" />
        <StatCard title="Ø Differenz (absolut)" value={formatCurrency(summary?.avgAbsDifference ?? 0)} icon={<AlertCircle className="w-5 h-5" />} color="orange" />
        <StatCard
          title="Tage ohne Differenz"
          value={counts.filter((c: any) => Math.abs(c.difference) < 0.0001 && c.status === 'SUBMITTED').length}
          icon={<CheckCircle2 className="w-5 h-5" />} color="green"
        />
      </div>

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-bold text-[#222] mb-3">Kassendifferenz im Zeitverlauf</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Differenz']} contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="difference" stroke="#FF385C" strokeWidth={2} dot={{ r: 3, fill: '#FF385C' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5">
        <Table
          columns={[
            { key: 'businessDate', header: 'Datum', render: (r: any) => r.businessDate.slice(0, 10) },
            { key: 'employee', header: 'Mitarbeiter', render: (r: any) => r.employee?.name ?? '—' },
            { key: 'expectedAmount', header: 'Soll', render: (r: any) => formatCurrency(r.expectedAmount) },
            { key: 'countedAmount', header: 'Ist', render: (r: any) => formatCurrency(r.countedAmount) },
            {
              key: 'difference', header: 'Differenz',
              render: (r: any) => (
                <span style={{ color: Math.abs(r.difference) < 0.0001 ? '#008A05' : '#E31C5F', fontWeight: 600 }}>
                  {formatCurrency(r.difference)}
                </span>
              ),
            },
            {
              key: 'status', header: 'Status',
              render: (r: any) => (
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                  background: r.status === 'SUBMITTED' ? '#E8F8EE' : '#FFF3E8',
                  color: r.status === 'SUBMITTED' ? '#008A05' : '#C2410C',
                }}>
                  {r.status === 'SUBMITTED' ? 'Eingereicht' : 'Entwurf'}
                </span>
              ),
            },
          ]}
          data={counts}
          onRowClick={(r: any) => setSelectedId(r.id)}
          emptyText="Keine Kassenstürze im ausgewählten Zeitraum"
        />
      </div>

      {selectedId && detail && (
        <Modal title={`Kassensturz — ${detail.businessDate.slice(0, 10)}`} onClose={() => setSelectedId(null)} size="lg">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#6A6A6A] mb-2">Stückelung</h4>
              <div className="space-y-1 text-sm">
                {detail.denominationCounts.map((d: any) => (
                  <div key={d.id} className="flex justify-between">
                    <span>{d.denomination < 1 ? `${Math.round(d.denomination * 100)} ct` : `€${d.denomination}`} × {d.quantity}</span>
                    <span>{formatCurrency(d.subtotal)}</span>
                  </div>
                ))}
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#6A6A6A] mt-4 mb-2">Barentnahmen</h4>
              <div className="space-y-1 text-sm">
                {detail.withdrawals.length === 0 && <p className="text-[#6A6A6A]">Keine</p>}
                {detail.withdrawals.map((w: any) => (
                  <div key={w.id} className="flex justify-between">
                    <span>{w.purpose}</span><span>{formatCurrency(w.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#6A6A6A] mb-2">Details</h4>
              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between"><span>Mitarbeiter</span><span>{detail.employee?.name}</span></div>
                <div className="flex justify-between"><span>Soll</span><span>{formatCurrency(detail.expectedAmount)}</span></div>
                <div className="flex justify-between"><span>Ist</span><span>{formatCurrency(detail.countedAmount)}</span></div>
                <div className="flex justify-between font-bold"><span>Differenz</span><span>{formatCurrency(detail.difference)}</span></div>
              </div>
              {detail.reason && (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#6A6A6A] mb-1">Begründung</h4>
                  <p className="text-sm mb-4">{detail.reason}</p>
                </>
              )}
              {detail.signatureImage && (
                <>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#6A6A6A] mb-1">Unterschrift</h4>
                  <img src={detail.signatureImage} alt="Unterschrift" className="border border-[#EBEBEB] rounded-lg max-w-full" />
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
