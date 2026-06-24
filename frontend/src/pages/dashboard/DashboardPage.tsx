import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, equipmentClientApi, buildingCostClientApi } from '../../api/client';
import { formatCurrency } from '../../utils/format';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import {
  Package, BookOpen, ShoppingBag, Factory, AlertTriangle, TrendingUp, BarChart2, Zap,
  TrendingDown, CalendarRange, Briefcase, Wrench, Tag, Clock, Percent, Repeat, Trash2, Snowflake,
  Flame, Timer, Warehouse, Euro, PiggyBank, Users, ChevronDown, ChevronRight,
  Leaf, Award, Target, Activity, Truck, Scale, Cpu, UserCheck, Droplets
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, Legend, ComposedChart
} from 'recharts';

const COLORS = ['#FF385C', '#256F3A', '#E76500', '#BB0000', '#FF385C', '#5A18A0'];

// ── Section header with collapse toggle ──────────────────────────────────────
function SectionHeader({
  icon, label, sublabel, color, open, onToggle,
}: {
  icon: React.ReactNode; label: string; sublabel: string;
  color: string; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-4 text-left group"
      style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}
    >
      {/* Color stripe */}
      <div style={{ width: 4, height: 36, borderRadius: 9999, background: color, flexShrink: 0 }} />
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 12, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color,
      }}>
        {icon}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#222222', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 1 }}>{sublabel}</div>
      </div>
      {/* Chevron */}
      <div style={{ color: '#B0B0B0', transition: 'transform 0.2s' }}>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
    </button>
  );
}

const TABS = [
  { id: 'management', label: 'Management', icon: Briefcase, hint: 'Werte, Margen & Effizienz' },
  { id: 'operations', label: 'Operations', icon: Wrench, hint: 'Bestand, Planung & Produktion' },
  { id: 'sales', label: 'Sales', icon: Tag, hint: 'Verkaufsfertige Torten & Pipeline' },
] as const;

type TabId = typeof TABS[number]['id'];

const WINDOWS = [
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'year', label: 'Jahr' },
] as const;

type WindowId = typeof WINDOWS[number]['id'];

export default function DashboardPage() {
  const [tab, setTab] = useState<TabId>('management');
  const [opsWindow, setOpsWindow] = useState<WindowId>('week');
  const [mgmtWindow, setMgmtWindow] = useState<WindowId>('month');

  // Month picker: null = use mgmtWindow (rolling), otherwise explicit calendar month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // 'YYYY-MM'

  const monthRange = selectedMonth
    ? (() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const from = new Date(y, m - 1, 1);
        // find first Monday on or before from
        const dayOfWeek = from.getDay(); // 0=Sun
        const offsetToMon = (dayOfWeek + 6) % 7;
        from.setDate(1 - offsetToMon);
        // to = first Monday of next month (or similar: last day + 1)
        const to = new Date(y, m, 1); // first day of next month
        return {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        };
      })()
    : null;
  const [salesWindow, setSalesWindow] = useState<WindowId>('month');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    financials: true, inventory: true, products: true,
  });
  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const { data: overview } = useQuery({ queryKey: ['dashboard-overview'], queryFn: () => dashboardApi.overview().then(r => r.data) });
  const { data: topProducts } = useQuery({ queryKey: ['dashboard-top-products'], queryFn: () => dashboardApi.topProducts().then(r => r.data) });
  const { data: trend } = useQuery({ queryKey: ['dashboard-trend'], queryFn: () => dashboardApi.stockTrend(14).then(r => r.data) });
  const { data: efficiency } = useQuery({ queryKey: ['dashboard-efficiency'], queryFn: () => dashboardApi.productionEfficiency().then(r => r.data) });
  const { data: labourEfficiency } = useQuery({ queryKey: ['dashboard-labour-efficiency'], queryFn: () => dashboardApi.labourEfficiency().then(r => r.data) });
  const { data: impact } = useQuery({ queryKey: ['dashboard-inventory-impact', opsWindow], queryFn: () => dashboardApi.inventoryImpact(opsWindow).then(r => r.data) });
  const { data: pipeline } = useQuery({ queryKey: ['dashboard-sales-pipeline'], queryFn: () => dashboardApi.salesPipeline().then(r => r.data) });
  const { data: kpis } = useQuery({ queryKey: ['dashboard-strategic-kpis'], queryFn: () => dashboardApi.strategicKpis().then(r => r.data) });
  const { data: ops } = useQuery({ queryKey: ['dashboard-operations-kpis', opsWindow], queryFn: () => dashboardApi.operationsKpis(opsWindow).then(r => r.data) });
  const { data: opsOutlook } = useQuery({ queryKey: ['dashboard-ops-outlook', opsWindow], queryFn: () => dashboardApi.businessOutlook(opsWindow).then(r => r.data) });
  const { data: outlook } = useQuery({
    queryKey: ['dashboard-business-outlook', mgmtWindow, selectedMonth],
    queryFn: () => monthRange
      ? dashboardApi.businessOutlook('month', monthRange.from, monthRange.to).then(r => r.data)
      : dashboardApi.businessOutlook(mgmtWindow).then(r => r.data),
  });
  const { data: annualPlan } = useQuery({ queryKey: ['dashboard-annual-plan'], queryFn: () => dashboardApi.annualPlan(2026).then(r => r.data) });
  const { data: salesHistory } = useQuery({ queryKey: ['dashboard-sales-history', salesWindow], queryFn: () => dashboardApi.salesHistory(salesWindow).then(r => r.data) });
  const { data: equipment = [] } = useQuery({ queryKey: ['equipment'], queryFn: equipmentClientApi.list });
  const { data: buildings = [] } = useQuery({ queryKey: ['building-costs'], queryFn: buildingCostClientApi.list });
  const buildingCostMonthly = buildings
    .filter((b: any) => b.isActive)
    .reduce((sum: number, b: any) => sum + b.sqm * b.rentPerSqm, 0);

  // Fixed energy cost: active devices running 8 h/day × 22 days/month × €0.35/kWh
  const ENERGY_RATE = 0.35;   // €/kWh — Austrian commercial avg
  const HOURS_PER_MONTH = 8 * 22; // 176 h
  // Ovens are variable (production-driven), not fixed — exclude from fixed cost
  const activeEquipment = equipment.filter((e: any) => e.isActive && e.powerKw != null && e.type !== 'OFEN');
  const totalActivekW = activeEquipment.reduce((sum: number, e: any) => sum + e.powerKw * e.quantity, 0);
  const fixedEnergyCostMonthly = totalActivekW * HOURS_PER_MONTH * ENERGY_RATE;
  const fixedEnergyKwhMonthly = Math.round(totalActivekW * HOURS_PER_MONTH);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Real-time overview of your cake production operations" />

      {/* Audience tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all text-left"
            style={tab === t.id
              ? { borderColor: '#222222', background: '#F7F7F7', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
              : { borderColor: '#DDDDDD', background: '#FFFFFF' }}
          >
            <t.icon className="w-5 h-5" style={{ color: tab === t.id ? '#FF385C' : '#6A6A6A' }} />
            <span>
              <span className={`block text-sm font-semibold ${tab === t.id ? 'text-[#222222]' : 'text-[#6A6A6A]'}`}>{t.label}</span>
              <span className="block text-[11px] text-[#6A6A6A]">{t.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {tab === 'management' && (() => {
        const rev = outlook?.totals?.revenue ?? 0;
        const profit = outlook?.totals?.grossProfit ?? 0;
        const margin = outlook?.totals?.grossMarginPct ?? 0;
        const utilPct = outlook?.team?.utilizationPct ?? null;
        const labourHours = outlook?.totals?.labourHours ?? 0;
        const availHours = outlook?.team?.availableHours ?? 0;
        const range = outlook?.range ?? '';

        // Determine signal colour
        const profitOk = profit >= 0;
        const utilOk = utilPct == null || (utilPct >= 40 && utilPct <= 90);
        const overallOk = profitOk && utilOk;
        const bgColor = overallOk ? '#F0FAF3' : '#FFF8F0';
        const borderColor = overallOk ? '#B8DFC4' : '#F5C9A0';
        const dotColor = overallOk ? '#008A05' : '#E76500';

        // Build sentence
        const sentences: string[] = [];
        if (rev > 0) sentences.push(`Der Planungszeitraum ${range} zeigt einen erwarteten Umsatz von ${formatCurrency(rev)} bei einer Bruttomarge von ${margin}%.`);
        if (utilPct != null) sentences.push(`Die Kapazitätsauslastung liegt bei ${utilPct}% (${labourHours} von ${availHours} h bezahlter Arbeitszeit verplant).`);
        if (!profitOk) sentences.push('Achtung: Der geplante Rohgewinn ist negativ — Kosten übersteigen den erwarteten Umsatz.');
        if (utilPct != null && utilPct < 40) sentences.push('Die Auslastung ist niedrig — mehr Produktion einplanen, um Fixkosten zu decken.');
        if (utilPct != null && utilPct > 90) sentences.push('Die Auslastung ist sehr hoch — Überlastungsrisiko prüfen.');
        if (sentences.length === 0) sentences.push('Noch keine Plandaten für den gewählten Zeitraum vorhanden.');

        return (
          <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
            <p style={{ fontSize: 13, color: '#222222', lineHeight: 1.6, margin: 0 }}>
              {sentences.join(' ')}
            </p>
          </div>
        );
      })()}

      {tab === 'management' && (
        <div className="space-y-2">

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 1 — FINANCIALS
          ══════════════════════════════════════════════════════════════════ */}
          <SectionHeader
            icon={<Euro className="w-4 h-4" />}
            label="Financials"
            sublabel="Umsatz, Kosten, Deckungsbeitrag & Jahresplan"
            color="#008A05"
            open={openSections.financials}
            onToggle={() => toggleSection('financials')}
          />

          {openSections.financials && (
            <div className="space-y-5 pl-1 pb-4" style={{ borderLeft: '2px solid #E8F8EE', marginLeft: 6, paddingLeft: 20 }}>
              {/* Period selector */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className="text-xs font-semibold text-[#6A6A6A]">Ausblick</span>
                <div className="flex rounded-full border border-[#DDDDDD] overflow-hidden">
                  {WINDOWS.map(w => (
                    <button key={w.id} onClick={() => { setMgmtWindow(w.id); setSelectedMonth(null); }}
                      className="px-4 py-1.5 text-sm font-medium transition-colors"
                      style={mgmtWindow === w.id && !selectedMonth ? { background: '#222222', color: '#FFFFFF' } : { background: '#FFFFFF', color: '#6A6A6A' }}>
                      {w.label}
                    </button>
                  ))}
                </div>

                {/* Month picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#6A6A6A]">oder Monat:</span>
                  <select
                    value={selectedMonth ?? ''}
                    onChange={e => {
                      setSelectedMonth(e.target.value || null);
                      if (e.target.value) setMgmtWindow('month');
                    }}
                    style={{
                      border: selectedMonth ? '1.5px solid #222222' : '1px solid #DDDDDD',
                      borderRadius: 20, padding: '4px 10px', fontSize: 13,
                      background: selectedMonth ? '#222222' : '#FFFFFF',
                      color: selectedMonth ? '#FFFFFF' : '#6A6A6A',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="">— wählen —</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const d = new Date(now.getFullYear(), i, 1);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return (
                        <option key={val} value={val}>
                          {d.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                        </option>
                      );
                    })}
                    {/* next year months if near year end */}
                    {now.getMonth() >= 9 && Array.from({ length: 3 }, (_, i) => {
                      const d = new Date(now.getFullYear() + 1, i, 1);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return <option key={val} value={val}>{d.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</option>;
                    })}
                  </select>
                </div>

                <span className="text-xs text-[#6A6A6A]">
                  {outlook?.range ?? ''} · {outlook?.assumptions?.wageSource === 'team' ? `Lohn aus Team (Ø €${outlook?.assumptions?.hourlyWage}/h)` : `Annahme €${outlook?.assumptions?.hourlyWage ?? 18}/h Lohn`}, {outlook?.assumptions?.ovenKw ?? 12} kW Ofen, €{outlook?.assumptions?.energyPrice ?? 0.35}/kWh
                </span>
              </div>

              {/* Outlook KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Expected Revenue" value={formatCurrency(outlook?.totals?.revenue ?? 0)}
                  subtitle={`${outlook?.totals?.unitsPlanned ?? 0} Stück geplant · ${formatCurrency(outlook?.totals?.revenuePerLabourHour ?? 0)}/Arbeitsstunde`}
                  icon={<Euro className="w-6 h-6" />} color="green" />
                <StatCard title="Material Cost (est.)" value={formatCurrency(outlook?.totals?.materialCost ?? 0)}
                  subtitle={`Rohstoffe lt. Rezeptur · ${outlook?.totals?.revenue ? Math.round(((outlook?.totals?.materialCost ?? 0) / outlook.totals.revenue) * 100) : 0}% vom Umsatz`}
                  icon={<Package className="w-6 h-6" />} color="red" />
                <StatCard
                  title={outlook?.assumptions?.wageSource === 'team' ? 'Labour Cost (Payroll)' : 'Labour Cost (est.)'}
                  value={formatCurrency(outlook?.totals?.labourCost ?? 0)}
                  subtitle={outlook?.assumptions?.wageSource === 'team'
                    ? `${outlook?.team?.employees ?? 0} Mitarbeiter:innen · ${outlook?.team?.availableHours ?? 0} h bezahlt`
                    : `${outlook?.totals?.labourHours ?? 0} geplante Arbeitsstunden`}
                  icon={<Clock className="w-6 h-6" />} color="blue" />
                <StatCard title="Variable Energiekosten" value={formatCurrency(outlook?.totals?.energyCost ?? 0)}
                  subtitle={`≈ ${outlook?.totals?.energyKwh ?? 0} kWh Ofenbetrieb lt. Produktionsplan`}
                  icon={<Flame className="w-6 h-6" />} color="orange" />
                <StatCard
                  title="Fixe Energiekosten"
                  value={formatCurrency(fixedEnergyCostMonthly)}
                  subtitle={`${activeEquipment.length} Dauerläufer (ohne Ofen) · ${totalActivekW.toFixed(1)} kW · ${fixedEnergyKwhMonthly} kWh/Monat · €0.35/kWh`}
                  icon={<Zap className="w-6 h-6" />}
                  color="orange"
                />
                <StatCard title="Expected Gross Profit" value={formatCurrency(outlook?.totals?.grossProfit ?? 0)}
                  subtitle={`${outlook?.totals?.grossMarginPct ?? 0}% Marge · Gesamtkosten ${formatCurrency(outlook?.totals?.totalCost ?? 0)}`}
                  icon={<PiggyBank className="w-6 h-6" />} color={(outlook?.totals?.grossProfit ?? 0) >= 0 ? 'green' : 'red'} />
                <StatCard title="Capacity Utilization"
                  value={outlook?.team?.utilizationPct != null ? `${outlook.team.utilizationPct}%` : '—'}
                  subtitle={outlook?.team?.utilizationPct != null
                    ? `${outlook?.team?.utilisedHours ?? 0} h verplant von ${outlook?.team?.availableHours ?? 0} h bezahlt`
                    : 'Team unter „Team" anlegen, um Auslastung zu sehen'}
                  icon={<Users className="w-6 h-6" />}
                  color={(outlook?.team?.utilizationPct ?? 0) > 90 ? 'red' : (outlook?.team?.utilizationPct ?? 100) < 50 ? 'orange' : 'green'} />
              </div>

              {/* P&L Summary Table */}
              {(() => {
                const rev        = outlook?.totals?.revenue ?? 0;
                const material   = outlook?.totals?.materialCost ?? 0;
                const labour     = outlook?.totals?.labourCost ?? 0;
                const energyVar  = outlook?.totals?.energyCost ?? 0;
                const energyFix  = fixedEnergyCostMonthly;
                const rent       = buildingCostMonthly;

                // VAT: selling prices are gross (inkl. 7% MwSt), material costs gross (inkl. 19%)
                const umsatzsteuer = rev * (7 / 107);        // 7% of gross → to Finanzamt
                const vorsteuer    = material * (19 / 119);  // 19% of gross → refunded

                const netto = rev - material - labour - energyVar - energyFix - rent
                              - umsatzsteuer + vorsteuer;

                const pct = (v: number) => rev > 0 ? `${Math.round((v / rev) * 100)}%` : '—';

                const expenseRow = (label: string, value: number, sub?: string) => (
                  <tr key={label} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '9px 16px 9px 28px', color: '#9B1C1C' }}>
                      {label}
                      {sub && <span style={{ display: 'block', fontSize: 10, color: '#B45309', marginTop: 1 }}>{sub}</span>}
                    </td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: '#9B1C1C', fontWeight: 600 }}>−{formatCurrency(value)}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: '#B45309', fontSize: 11 }}>{pct(value)}</td>
                  </tr>
                );

                const creditRow = (label: string, value: number, sub?: string) => (
                  <tr key={label} style={{ borderBottom: '1px solid #F0F0F0', background: '#F8FFF8' }}>
                    <td style={{ padding: '9px 16px 9px 28px', color: '#166534' }}>
                      {label}
                      {sub && <span style={{ display: 'block', fontSize: 10, color: '#15803D', marginTop: 1 }}>{sub}</span>}
                    </td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>+{formatCurrency(value)}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: '#15803D', fontSize: 11 }}>{pct(value)}</td>
                  </tr>
                );

                return (
                  <div className="card overflow-hidden" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#F7F7F7', borderBottom: '1px solid #EBEBEB' }}>
                          <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 700, fontSize: 11, color: '#6A6A6A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Position</th>
                          <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, fontSize: 11, color: '#6A6A6A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Betrag (brutto)</th>
                          <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, fontSize: 11, color: '#6A6A6A', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80 }}>% Umsatz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Revenue */}
                        <tr style={{ borderBottom: '1px solid #F0F0F0', background: '#F0FBF0' }}>
                          <td style={{ padding: '9px 16px', color: '#166534', fontWeight: 600 }}>
                            Umsatz (geplant, brutto inkl. 7% MwSt)
                          </td>
                          <td style={{ padding: '9px 16px', textAlign: 'right', color: '#166534', fontWeight: 700 }}>{formatCurrency(rev)}</td>
                          <td style={{ padding: '9px 16px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>100%</td>
                        </tr>

                        {/* Expenses */}
                        {expenseRow('Materialkosten (brutto inkl. 19% MwSt)', material)}
                        {expenseRow('Lohnkosten', labour)}
                        {expenseRow('Variable Energiekosten (Ofen)', energyVar)}
                        {expenseRow('Fixe Energiekosten (Dauerläufer)', energyFix)}
                        {expenseRow('Mietkosten', rent)}

                        {/* Divider: MwSt */}
                        <tr style={{ background: '#FAFAFA' }}>
                          <td colSpan={3} style={{ padding: '6px 16px', fontSize: 10, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #EBEBEB' }}>
                            Mehrwertsteuer
                          </td>
                        </tr>
                        {expenseRow(
                          'Umsatzsteuer (7% auf Umsatz)',
                          umsatzsteuer,
                          `Abführung ans Finanzamt · ${formatCurrency(rev)} × 7/107`
                        )}
                        {creditRow(
                          'Vorsteuer (19% auf Material)',
                          vorsteuer,
                          `Erstattung vom Finanzamt · ${formatCurrency(material)} × 19/119`
                        )}

                        {/* Netto */}
                        <tr style={{ background: netto >= 0 ? '#F0FBF0' : '#FFF5F5', borderTop: '2px solid #EBEBEB' }}>
                          <td style={{ padding: '11px 16px', fontWeight: 800, color: netto >= 0 ? '#166534' : '#9B1C1C', fontSize: 14 }}>
                            Netto (nach MwSt)
                          </td>
                          <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 800, color: netto >= 0 ? '#166534' : '#9B1C1C', fontSize: 14 }}>
                            {formatCurrency(netto)}
                          </td>
                          <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: netto >= 0 ? '#166534' : '#9B1C1C' }}>
                            {pct(netto)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Revenue vs Cost chart + Top Revenue Drivers */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card xl:col-span-2">
                  <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Revenue vs. Cost per Week</h3>
                  <p className="text-[11px] text-[#6A6D70] mb-4">Erwarteter Umsatz (Linie) gegen Material-, Lohn- und Energiekosten (gestapelte Balken)</p>
                  {(outlook?.weeks ?? []).length === 0 ? (
                    <p className="text-xs text-[#6A6A6A] py-8 text-center">Keine geplante Produktion im Zeitraum</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={outlook?.weeks ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                        <Tooltip formatter={(v: any, name: string) => [formatCurrency(Number(v)), name]} contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="materialCost" name="Material" stackId="cost" fill="#FFB3C1" maxBarSize={36} />
                        <Bar dataKey="labourCost" name="Lohn" stackId="cost" fill="#FF385C" maxBarSize={36} />
                        <Bar dataKey="energyCost" name="Energie" stackId="cost" fill="#C2410C" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Line type="monotone" dataKey="revenue" name="Umsatz" stroke="#008A05" strokeWidth={2.5} dot={{ r: 3, fill: '#008A05' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Top Revenue Drivers</h3>
                  <p className="text-[11px] text-[#6A6D70] mb-4">Erwarteter Umsatz je Produkt im Zeitraum</p>
                  {(outlook?.topProducts ?? []).length === 0 ? (
                    <p className="text-xs text-[#6A6A6A] py-4">Keine Daten</p>
                  ) : (
                    <div className="space-y-2.5">
                      {(outlook?.topProducts ?? []).map((p: any) => (
                        <div key={p.name}>
                          <div className="flex items-baseline justify-between text-xs mb-1">
                            <span className="font-medium text-[#222222] truncate pr-2">{p.name}</span>
                            <span className="text-[#6A6A6A] shrink-0">{p.units} Stk · <span className="font-bold text-[#222222]">{formatCurrency(p.revenue)}</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F2F2F2] overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(100, (p.revenue / Math.max(...(outlook?.topProducts ?? []).map((x: any) => x.revenue), 1)) * 100)}%`,
                              background: 'linear-gradient(to right, #008A05, #00A86B)',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Annual Revenue Plan */}
              <div className="card">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Jahresplan 2026 — Umsatz-Ziel vs. Ist</h3>
                    <p className="text-[11px] text-[#6A6D70] mt-0.5">
                      Gestrichelte Linie = Ziel {annualPlan?.targetWeeklyRevenue != null ? `€${(annualPlan.targetWeeklyRevenue / 1000).toFixed(1)}k` : ''}/Woche bei 80% Auslastung · Ab KW 27 (Juli) offen zur Planung
                    </p>
                  </div>
                  {annualPlan?.targetMonthlyRevenue != null && (
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-lg font-bold text-[#222222]">€{(annualPlan.targetMonthlyRevenue / 1000).toFixed(1)}k</p>
                      <p className="text-[10px] text-[#6A6D70]">Ziel / Monat</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-4 mt-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#6A6D70]">
                    <span className="inline-block w-8 h-0.5" style={{ borderTop: '2px dashed #FF385C', display: 'inline-block' }} /> Ziel (80%)
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#6A6D70]">
                    <span className="inline-block w-4 h-3 rounded-sm bg-[#1B66C9] opacity-70" /> Geplanter Umsatz
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={annualPlan?.weeks ?? []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6A6D70' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip formatter={(v: any, name: string) => [`€${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, name]} contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 11 }} labelStyle={{ fontWeight: 600 }} />
                    <Bar dataKey="actual" name="Geplanter Umsatz" fill="#1B66C9" opacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={10} />
                    <Line type="monotone" dataKey="target" name="Ziel (80%)" stroke="#FF385C" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4, fill: '#FF385C' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 2 — INVENTORY
          ══════════════════════════════════════════════════════════════════ */}
          <SectionHeader
            icon={<Package className="w-4 h-4" />}
            label="Inventory"
            sublabel="Lagerbestand, Umschlag, Abschreibungen & Kapitalbindung"
            color="#1B66C9"
            open={openSections.inventory}
            onToggle={() => toggleSection('inventory')}
          />

          {openSections.inventory && (
            <div className="space-y-5 pl-1 pb-4" style={{ borderLeft: '2px solid #EBF3FF', marginLeft: 6, paddingLeft: 20 }}>
              {/* Value KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <StatCard title="Inventory Value" value={formatCurrency(overview?.inventory?.totalValue ?? 0)}
                  subtitle="Raw materials on hand" icon={<TrendingUp className="w-6 h-6" />} color="green" />
                <StatCard title="Finished Goods Value" value={formatCurrency(overview?.finishedGoods?.totalValue ?? 0)}
                  subtitle={`${overview?.finishedGoods?.expiringCount ?? 0} expiring in 3 days`}
                  icon={<BarChart2 className="w-6 h-6" />} color="blue" />
                <StatCard title="Planned Consumption" value={`−${formatCurrency(impact?.totals?.demandValue ?? 0)}`}
                  subtitle={`≈ ${impact?.totals?.reductionPct ?? 0}% of inventory value`}
                  icon={<TrendingDown className="w-6 h-6" />} color="red" />
                <StatCard title="Avg Yield" value={`${efficiency?.avgYield ?? 0}%`}
                  subtitle="Production efficiency" icon={<Zap className="w-6 h-6" />} color="purple" />
              </div>

              {/* Flow KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Inventory Turnover" value={`${kpis?.inventoryFlow?.turnoverAnnual ?? '—'}×`}
                  subtitle={kpis?.inventoryFlow?.daysOfCover != null && kpis.inventoryFlow.daysOfCover < 1000 ? `${kpis.inventoryFlow.daysOfCover} days of stock cover` : 'Too little consumption recorded yet'}
                  icon={<Repeat className="w-6 h-6" />} color="blue" />
                <StatCard title="Wastage Rate (30d)" value={`${kpis?.inventoryFlow?.wastageRatePct ?? 0}%`}
                  subtitle={`${formatCurrency(kpis?.inventoryFlow?.wasteValue30d ?? 0)} written off`}
                  icon={<Trash2 className="w-6 h-6" />} color={(kpis?.inventoryFlow?.wastageRatePct ?? 0) > 5 ? 'red' : 'green'} />
                <StatCard title="Dead Stock" value={formatCurrency(kpis?.deadStock?.value ?? 0)}
                  subtitle={`${kpis?.deadStock?.count ?? 0} items, ${kpis?.deadStock?.sharePct ?? 0}% of inventory — no movement in 30d`}
                  icon={<Snowflake className="w-6 h-6" />} color={(kpis?.deadStock?.sharePct ?? 0) > 30 ? 'orange' : 'blue'} />
                <StatCard title="Low Stock Alerts" value={overview?.inventory?.lowStockCount ?? 0}
                  subtitle="Ingredients below reorder level" icon={<AlertTriangle className="w-6 h-6" />}
                  color={(overview?.inventory?.lowStockCount ?? 0) > 0 ? 'orange' : 'green'} />
              </div>

              {/* Capital efficiency */}
              <div className="card">
                <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Capital Efficiency (30 days)</h3>
                <p className="text-[11px] text-[#6A6D70] mb-4">Cash flowing through inventory — buying vs. using vs. losing</p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3 rounded-2xl text-center" style={{ background: '#EBF3FF' }}>
                    <p className="text-lg font-bold text-[#1B66C9] leading-tight">{formatCurrency(kpis?.inventoryFlow?.purchasedValue30d ?? 0)}</p>
                    <p className="text-[11px] text-[#6A6A6A] mt-0.5">Eingekauft</p>
                  </div>
                  <div className="p-3 rounded-2xl text-center" style={{ background: '#E8F8EE' }}>
                    <p className="text-lg font-bold text-[#008A05] leading-tight">{formatCurrency(kpis?.inventoryFlow?.consumedValue30d ?? 0)}</p>
                    <p className="text-[11px] text-[#6A6A6A] mt-0.5">Verbraucht</p>
                  </div>
                  <div className="p-3 rounded-2xl text-center" style={{ background: '#FFF0EC' }}>
                    <p className="text-lg font-bold text-[#C13515] leading-tight">{formatCurrency(kpis?.inventoryFlow?.wasteValue30d ?? 0)}</p>
                    <p className="text-[11px] text-[#6A6A6A] mt-0.5">Abgeschrieben</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#6A6A6A] mb-2">Largest dead stock positions — capital to free up</p>
                {(kpis?.deadStock?.topItems ?? []).length === 0 ? (
                  <p className="text-xs text-[#6A6A6A] py-3">No dead stock — everything moved within 30 days 👍</p>
                ) : (
                  <div className="space-y-1.5">
                    {(kpis?.deadStock?.topItems ?? []).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#F7F7F7]">
                        <span className="font-medium text-[#222222] truncate pr-2">{d.name}</span>
                        <span className="font-bold text-[#222222] shrink-0">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 3 — PRODUCTS
          ══════════════════════════════════════════════════════════════════ */}
          <SectionHeader
            icon={<ShoppingBag className="w-4 h-4" />}
            label="Products"
            sublabel="Sortiment, Margen, Preisgestaltung & Produktivität"
            color="#6F19C2"
            open={openSections.products}
            onToggle={() => toggleSection('products')}
          />

          {openSections.products && (
            <div className="space-y-5 pl-1 pb-4" style={{ borderLeft: '2px solid #F4EDFF', marginLeft: 6, paddingLeft: 20 }}>
              {/* Portfolio KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                <StatCard title="Ø Portfolio Margin" value={`${kpis?.portfolio?.avgMarginPct ?? '—'}%`}
                  subtitle={`${kpis?.portfolio?.lowMarginCount ?? 0} products below 20%`}
                  icon={<Percent className="w-6 h-6" />} color={(kpis?.portfolio?.avgMarginPct ?? 0) >= 40 ? 'green' : 'orange'} />
                <StatCard title="Products Priced" value={kpis?.portfolio?.productsPriced ?? '—'}
                  subtitle="Active products with pricing set"
                  icon={<Tag className="w-6 h-6" />} color="blue" />
                <StatCard title="Labour Efficiency" value={`${efficiency?.avgYield ?? 0}%`}
                  subtitle="Avg production yield" icon={<Zap className="w-6 h-6" />} color="purple" />
              </div>

              {/* Margin distribution + top products */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Margin Distribution</h3>
                  <p className="text-[11px] text-[#6A6D70] mb-4">
                    {kpis?.portfolio?.productsPriced ?? 0} priced products by margin band — where to reprice or cut
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={kpis?.portfolio?.buckets ?? []}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => [`${v} Produkte`, 'Anzahl']} contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {(kpis?.portfolio?.buckets ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={['#C13515', '#E8A800', '#FF385C', '#008A05'][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs font-semibold text-[#6A6A6A] mt-4 mb-2">Lowest margins — review pricing first</p>
                  <div className="space-y-1.5">
                    {(kpis?.portfolio?.worstMargins ?? []).map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl" style={{ background: m.marginPct < 20 ? '#FFF0EC' : '#F7F7F7' }}>
                        <span className="font-medium text-[#222222] truncate pr-2">{m.name}</span>
                        <span className="shrink-0 text-[#6A6A6A]">
                          {formatCurrency(m.unitCost)} Kosten / {formatCurrency(m.sellingPrice)} VK ·{' '}
                          <span className="font-bold" style={{ color: m.marginPct < 20 ? '#C13515' : m.marginPct < 40 ? '#8A6D00' : '#008A05' }}>
                            {m.marginPct}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4">Top Products by Margin</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={(topProducts ?? []).slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => formatCurrency(v)} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6A6D70' }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Margin']} contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="margin" fill="#FF385C" radius={[0, 6, 6, 0]}>
                        {(topProducts ?? []).slice(0, 6).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Labour vs Output Value */}
              <div className="card">
                <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Labour Hours vs. Output Value</h3>
                <p className="text-[11px] text-[#6A6D70] mb-4">Planned working hours (bars) against sell-value of finished goods (line) per week</p>
                {(labourEfficiency ?? []).every((d: any) => d.labourHours === 0 && d.valueProduced === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-[#6A6D70]">
                    <Zap className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data yet — start planning weeks &amp; completing batches</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <ComposedChart data={labourEfficiency ?? []} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} label={{ value: 'h', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#6A6D70' } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#E76500' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                      <Tooltip contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 11 }}
                        formatter={(v: any, name: string) => name === 'Stunden' ? [`${v}h`, name] : [formatCurrency(Number(v)), name]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="labourHours" name="Stunden" fill="#FF385C" opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Line yAxisId="right" type="monotone" dataKey="valueProduced" name="Warenwert" stroke="#E76500" strokeWidth={2} dot={{ r: 3, fill: '#E76500' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {tab === 'operations' && (
        <>
          {/* ── Time window selector ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-[#6A6A6A]">Zeitraum</span>
            <div className="flex rounded-full border border-[#DDDDDD] overflow-hidden">
              {WINDOWS.map(w => (
                <button
                  key={w.id}
                  onClick={() => setOpsWindow(w.id)}
                  className="px-4 py-1.5 text-sm font-medium transition-colors"
                  style={opsWindow === w.id
                    ? { background: '#222222', color: '#FFFFFF' }
                    : { background: '#FFFFFF', color: '#6A6A6A' }}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#6A6A6A]">
              {ops?.week ?? ''}{ops?.isFallbackWeek ? ' (nächste geplante Woche)' : ''}
            </span>
          </div>

          {/* ── Operations summary banner ───────────────────────────────── */}
          {(() => {
            const units      = opsOutlook?.totals?.unitsPlanned ?? 0;
            const labH       = opsOutlook?.totals?.labourHours ?? 0;
            const capPct     = opsOutlook?.team?.utilizationPct ?? null;
            const ovenH      = ops?.energy?.bakingHours ?? 0;
            const availH     = opsOutlook?.team?.availableHours ?? 0;
            const ovenUtil   = availH > 0 ? Math.round((ovenH / availH) * 100) : null;
            const storagePct = ops?.storage?.overallPct ?? null;
            const expiring   = ops?.storage?.expiring7d?.count ?? 0;
            const overdue    = ops?.labour?.overdueTasks ?? 0;
            const uph        = labH > 0 ? (units / labH).toFixed(1) : null;
            const weekLabel  = ops?.week ?? '';

            const warnings: string[] = [];
            if (capPct != null && capPct > 90) warnings.push('die Kapazitätsauslastung ist sehr hoch — Überlastungsrisiko');
            if (capPct != null && capPct < 40 && units > 0) warnings.push('die Kapazitätsauslastung ist niedrig — Fixkosten werden schlecht ausgelastet');
            if (storagePct != null && storagePct > 100) warnings.push('die Lagerauslastung liegt über 100% — Kapazität prüfen');
            if (overdue > 0) warnings.push(`${overdue} Aufgabe${overdue > 1 ? 'n sind' : ' ist'} überfällig`);
            if (expiring > 0) warnings.push(`${expiring} Charge${expiring > 1 ? 'n laufen' : ' läuft'} in 7 Tagen ab`);

            const overallOk = warnings.length === 0;
            const bgColor = overallOk ? '#F0FAF3' : '#FFF8F0';
            const borderColor = overallOk ? '#B8DFC4' : '#F5C9A0';
            const dotColor = overallOk ? '#008A05' : '#E76500';

            const sentences: string[] = [];
            if (units > 0) sentences.push(`Im Zeitraum ${weekLabel} sind ${units} Stück über ${labH.toFixed(1)} Arbeitsstunden geplant${uph ? ` (Durchsatz ${uph} Stk/h)` : ''}.`);
            if (capPct != null) sentences.push(`Die Kapazitätsauslastung liegt bei ${capPct}%, die Ofenauslastung bei ${ovenUtil ?? '—'}%.`);
            if (storagePct != null) sentences.push(`Das Lager ist zu ${storagePct}% belegt.`);
            if (warnings.length > 0) sentences.push('Achtung: ' + warnings.join(', ') + '.');
            if (sentences.length === 0) sentences.push('Noch keine Produktionsdaten für den gewählten Zeitraum vorhanden.');

            return (
              <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                <p style={{ fontSize: 13, color: '#222222', lineHeight: 1.6, margin: 0 }}>
                  {sentences.join(' ')}
                </p>
              </div>
            );
          })()}

          {/* Efficiency KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={`Labour ${ops?.week ?? ''}${ops?.isFallbackWeek ? ' (nächste geplante Woche)' : ''}`} value={`${ops?.labour?.plannedHours ?? 0} h`}
              subtitle={`${ops?.labour?.doneHours ?? 0} h erledigt · ${ops?.labour?.completionPct ?? 0}% der Aufgaben${(ops?.labour?.overdueTasks ?? 0) > 0 ? ` · ${ops.labour.overdueTasks} überfällig` : ''}`}
              icon={<Clock className="w-6 h-6" />}
              color={(ops?.labour?.overdueTasks ?? 0) > 0 ? 'orange' : 'blue'}
            />
            <StatCard
              title="Ofenzeit (geplant)" value={`${ops?.energy?.bakingHours ?? 0} h`}
              subtitle={`≈ ${ops?.energy?.estKwh ?? 0} kWh / ${formatCurrency(ops?.energy?.estCost ?? 0)} Energie (${ops?.energy?.assumption ?? ''})`}
              icon={<Flame className="w-6 h-6" />} color="orange"
            />
            <StatCard
              title="Produktivität" value={`${ops?.labour?.minPerUnit ?? 0} min/Stk`}
              subtitle={`${ops?.labour?.unitsPlanned ?? 0} Stück geplant in ${ops?.labour?.taskCount ?? 0} Aufgaben`}
              icon={<Timer className="w-6 h-6" />} color="purple"
            />
            <StatCard
              title="Lagerauslastung" value={ops?.storage?.overallPct != null ? `${ops.storage.overallPct}%` : '—'}
              subtitle={`${ops?.storage?.expiring7d?.count ?? 0} Chargen laufen in 7 Tagen ab (${formatCurrency(ops?.storage?.expiring7d?.value ?? 0)})`}
              icon={<Warehouse className="w-6 h-6" />}
              color={(ops?.storage?.overallPct ?? 0) > 85 ? 'red' : 'green'}
            />
          </div>

          {/* ── Derived KPI helpers ──────────────────────────────────────── */}
          {(() => {
            const units        = opsOutlook?.totals?.unitsPlanned ?? 0;
            const labH         = opsOutlook?.totals?.labourHours ?? 0;
            const matCost      = opsOutlook?.totals?.materialCost ?? 0;
            const labCost      = opsOutlook?.totals?.labourCost ?? 0;
            const energyCost   = opsOutlook?.totals?.energyCost ?? 0;
            const totalCost    = opsOutlook?.totals?.totalCost ?? 0;
            const revenue      = opsOutlook?.totals?.revenue ?? 0;
            const gp           = opsOutlook?.totals?.grossProfit ?? 0;
            const tasks        = ops?.labour?.taskCount ?? 0;
            const capPct       = opsOutlook?.team?.utilizationPct ?? null;
            const empCount     = opsOutlook?.team?.employees ?? 0;
            const availH       = opsOutlook?.team?.availableHours ?? 0;
            const bakingH      = ops?.energy?.bakingHours ?? 0;
            const estKwh       = ops?.energy?.estKwh ?? 0;

            const uph          = labH > 0 ? (units / labH).toFixed(1) : '—';
            const ovenUtil     = availH > 0 ? Math.round((bakingH / availH) * 100) : null;
            const hpb          = tasks > 0 ? (labH / tasks).toFixed(1) : '—';
            const cogmUnit     = units > 0 ? (totalCost / units).toFixed(2) : '—';
            const matUnit      = units > 0 ? (matCost / units).toFixed(2) : '—';
            const labUnit      = units > 0 ? (labCost / units).toFixed(2) : '—';
            const energyUnit   = units > 0 ? (energyCost / units).toFixed(3) : '—';
            const kwhUnit      = units > 0 ? (estKwh / units).toFixed(2) : '—';
            const cmUnit       = units > 0 ? (gp / units).toFixed(2) : '—';
            const outPerEmp    = empCount > 0 ? Math.round(units / empCount) : '—';
            const revenuePerH  = labH > 0 ? (revenue / labH).toFixed(2) : '—';
            const donePct      = ops?.labour?.completionPct ?? 0;
            const plannedH     = ops?.labour?.plannedHours ?? 0;
            const overdue      = ops?.labour?.overdueTasks ?? 0;
            const minPerUnit   = ops?.labour?.minPerUnit ?? 0;

            // EoS: variable cost is material, fixed = labour+energy
            const fixedCostTotal   = labCost + energyCost;
            const varCostPerUnit   = units > 0 ? matCost / units : 0;
            const pricePerUnit     = units > 0 ? revenue / units : 0;
            const cmPerUnit        = pricePerUnit - varCostPerUnit;
            const breakEvenUnits   = cmPerUnit > 0 ? Math.ceil(fixedCostTotal / cmPerUnit) : null;
            // Unit cost at 1×, 1.5×, 2×, 3× current volume
            const unitCostCurve = [1, 1.5, 2, 3].map(mult => {
              const vol = Math.round(units * mult);
              const tc  = fixedCostTotal + varCostPerUnit * vol;
              return { label: `${Math.round(mult * 100)}%`, volume: vol, unitCost: vol > 0 ? (tc / vol).toFixed(2) : '—' };
            });

            const NA = <span className="text-[#AAAAAA] text-xs italic">Noch nicht erfasst</span>;
            const Pill = ({ color, label }: { color: string; label: string }) => (
              <span style={{ background: color + '22', color, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{label}</span>
            );

            // ── Recommendation engine ───────────────────────────────────
            type Rec = { priority: 'high' | 'medium' | 'low'; icon: React.ReactNode; title: string; text: string };
            const recs: Rec[] = [];

            if (capPct != null && capPct > 90) {
              recs.push({ priority: 'high', icon: <AlertTriangle className="w-4 h-4" />, title: 'Überlastungsrisiko',
                text: `Die Kapazitätsauslastung liegt bei ${capPct}% — sehr hoch. Zusätzliche Schichten, Personal oder eine Entzerrung der Produktion über mehr Tage prüfen, um Engpässe und Ausfallrisiko zu vermeiden.` });
            } else if (capPct != null && capPct < 40 && units > 0) {
              recs.push({ priority: 'medium', icon: <TrendingDown className="w-4 h-4" />, title: 'Niedrige Auslastung',
                text: `Die Kapazitätsauslastung liegt nur bei ${capPct}%. Mehr Produktionsmenge einplanen oder Personalkapazität reduzieren, um Fixkosten (Lohn: ${formatCurrency(labCost)}) besser auf die Stückzahl zu verteilen.` });
            }

            if (ovenUtil != null && ovenUtil > 85) {
              recs.push({ priority: 'high', icon: <Flame className="w-4 h-4" />, title: 'Ofenkapazität ausgereizt',
                text: `Die Ofenauslastung liegt bei ${ovenUtil}%. Backzeiten über mehr Tage/Schichten verteilen oder einen zweiten Ofen prüfen, um Produktionsstaus zu vermeiden.` });
            } else if (ovenUtil != null && ovenUtil < 20 && bakingH > 0) {
              recs.push({ priority: 'low', icon: <Flame className="w-4 h-4" />, title: 'Ofen unterausgelastet',
                text: `Nur ${ovenUtil}% der Ofenzeit sind genutzt. Mehr Backwaren in bestehende Backzyklen einplanen, um Energieeffizienz pro Charge zu erhöhen.` });
            }

            if (overdue > 0) {
              recs.push({ priority: 'high', icon: <Clock className="w-4 h-4" />, title: 'Überfällige Aufgaben',
                text: `${overdue} Aufgabe${overdue > 1 ? 'n sind' : ' ist'} überfällig. Priorisierung in der Wochenplanung prüfen und ggf. Konditor-Zuweisung anpassen, um Lieferverzögerungen zu vermeiden.` });
            }

            const storagePct = ops?.storage?.overallPct ?? null;
            if (storagePct != null && storagePct > 100) {
              recs.push({ priority: 'high', icon: <Warehouse className="w-4 h-4" />, title: 'Lager überlastet',
                text: `Die Lagerauslastung liegt bei ${storagePct}% — über Kapazität. Zusätzliche Lagerfläche, häufigere Auslieferung oder reduzierte Vorproduktion prüfen.` });
            }

            if (gp < 0) {
              recs.push({ priority: 'high', icon: <PiggyBank className="w-4 h-4" />, title: 'Negativer Rohgewinn',
                text: `Der geplante Rohgewinn ist negativ (${formatCurrency(gp)}). Verkaufspreise, Produktmix oder Materialeinsatz prüfen — insbesondere Produkte mit niedrigem Deckungsbeitrag/Stk (aktuell €${cmUnit}) identifizieren und ggf. aus dem Plan nehmen.` });
            } else if (breakEvenUnits != null && units < breakEvenUnits) {
              recs.push({ priority: 'medium', icon: <Target className="w-4 h-4" />, title: 'Unter Break-Even',
                text: `Aktuelles Volumen (${units} Stk) liegt unter dem Break-Even (${breakEvenUnits} Stk). Produktionsmenge erhöhen oder Fixkosten senken, um in die Gewinnzone zu kommen.` });
            }

            if (matUnit !== '—' && cogmUnit !== '—' && parseFloat(matUnit) / parseFloat(cogmUnit) > 0.5) {
              recs.push({ priority: 'medium', icon: <Package className="w-4 h-4" />, title: 'Hoher Materialkostenanteil',
                text: `Rohstoffkosten machen €${matUnit} von €${cogmUnit} Herstellkosten/Stk aus (${Math.round(parseFloat(matUnit) / parseFloat(cogmUnit) * 100)}%). Lieferantenpreise verhandeln oder Rezepturen auf günstigere Zutaten prüfen.` });
            }

            const expiringCount = ops?.storage?.expiring7d?.count ?? 0;
            if (expiringCount > 0) {
              recs.push({ priority: 'medium', icon: <AlertTriangle className="w-4 h-4" />, title: 'Ablaufende Ware',
                text: `${expiringCount} Charge${expiringCount > 1 ? 'n laufen' : ' läuft'} in den nächsten 7 Tagen ab. Abverkauf priorisieren oder Produktion entsprechend timen, um Verlustquote zu senken.` });
            }

            if (recs.length === 0 && units > 0) {
              recs.push({ priority: 'low', icon: <Award className="w-4 h-4" />, title: 'Alles im grünen Bereich',
                text: 'Keine kritischen Auffälligkeiten erkannt — Auslastung, Lager und Marge liegen im gesunden Bereich.' });
            }

            const prioColor = { high: '#BB0000', medium: '#E76500', low: '#008A05' } as const;
            const prioBg    = { high: '#FFEAEA', medium: '#FFF3E0', low: '#EAF7EE' } as const;
            const prioLabel = { high: 'Hoch', medium: 'Mittel', low: 'Info' } as const;

            return (
              <>
                {/* ═══════════════════════════════════════════════════════
                    EMPFEHLUNGEN
                ═══════════════════════════════════════════════════════ */}
                {recs.length > 0 && (
                  <div className="card">
                    <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1 flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#FF385C]" /> Empfehlungen zur Verbesserung
                    </h3>
                    <p className="text-[11px] text-[#6A6D70] mb-4">Automatisch abgeleitet aus den aktuellen Operations-KPIs ({ops?.week ?? ''})</p>
                    <div className="space-y-2.5">
                      {recs
                        .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                        .map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: prioBg[r.priority] }}>
                          <span style={{ color: prioColor[r.priority], flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-[#222222]">{r.title}</span>
                              <Pill color={prioColor[r.priority]} label={prioLabel[r.priority]} />
                            </div>
                            <p className="text-xs text-[#444444] leading-relaxed">{r.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    1. PRODUKTIONSLEISTUNG
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Activity className="w-4 h-4" />} label="1. Produktionsleistung"
                  sublabel="Output pro Zeiteinheit, Durchsatz & Ofenauslastung"
                  color="#E76500" open={openSections.prod ?? true}
                  onToggle={() => toggleSection('prod')} />
                {(openSections.prod ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #FFF0E0', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Durchsatzrate (Units/h)" value={uph === '—' ? '—' : `${uph} Stk/h`}
                        subtitle={`${units} Stück geplant / ${labH.toFixed(1)} h Arbeit`}
                        icon={<Activity className="w-6 h-6" />} color="orange" />
                      <StatCard title="Geplante Arbeitsstunden" value={`${plannedH} h`}
                        subtitle={`${tasks} Aufgaben · ${minPerUnit} min/Stk · ${donePct}% erledigt`}
                        icon={<Clock className="w-6 h-6" />} color={(overdue > 0) ? 'red' : 'blue'} />
                      <StatCard title="Ofenauslastung" value={ovenUtil != null ? `${ovenUtil}%` : '—'}
                        subtitle={`${bakingH} h Backzeit / ${availH} h verfügbar`}
                        icon={<Flame className="w-6 h-6" />} color={ovenUtil != null && ovenUtil > 85 ? 'red' : 'orange'} />
                      <StatCard title="Batch-Effizienz (h/Batch)" value={hpb === '—' ? '—' : `${hpb} h`}
                        subtitle={`Ø Arbeitsstunden je Produktionsauftrag (${tasks} Batches)`}
                        icon={<Cpu className="w-6 h-6" />} color="purple" />
                    </div>
                    {/* Oven by product */}
                    {(ops?.energy?.byProduct ?? []).length > 0 && (
                      <div className="card">
                        <h4 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-3">🔥 Backzeit je Produkt</h4>
                        <div className="space-y-2">
                          {(ops.energy.byProduct as any[]).map((p: any) => (
                            <div key={p.name}>
                              <div className="flex items-baseline justify-between text-xs mb-1">
                                <span className="font-medium text-[#222222]">{p.name}</span>
                                <span className="text-[#6A6A6A]">{p.hours} h</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#F2F2F2] overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${Math.min(100, (p.hours / Math.max(...(ops.energy.byProduct as any[]).map((x: any) => x.hours), 1)) * 100)}%`,
                                  background: 'linear-gradient(to right,#E76500,#C2410C)',
                                }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    2. QUALITÄT & AUSSCHUSS
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Award className="w-4 h-4" />} label="2. Qualität & Ausschuss"
                  sublabel="Ausschussquote, FPY, Reklamationen — erfordert manuelle Erfassung"
                  color="#5A18A0" open={openSections.quality ?? true}
                  onToggle={() => toggleSection('quality')} />
                {(openSections.quality ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #F0E8FF', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: 'Ausschussquote (%)', sub: 'Anteil verworfener Chargen am Output' },
                        { title: 'First-Pass-Yield (FPY)', sub: 'Anteil fehlerfrei produzierter Einheiten' },
                        { title: 'Reklamationen / Fehler', sub: 'Wiederholungsfehler & Kundenbeschwerden' },
                        { title: 'Wastage-Rate (Rohstoffe)', sub: 'Verschnitt & Überproduktion in %' },
                      ].map(k => (
                        <div key={k.title} className="card flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">{k.title}</span>
                          <div className="mt-1">{NA}</div>
                          <span className="text-[11px] text-[#AAAAAA] mt-1">{k.sub}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#AAAAAA] italic">Qualitätsdaten werden aktuell nicht automatisch erfasst. Füge ein Qualitäts-Erfassungsmodul hinzu, um diese KPIs zu aktivieren.</p>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    3. KOSTEN & WIRTSCHAFTLICHKEIT
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Euro className="w-4 h-4" />} label="3. Kosten & Wirtschaftlichkeit"
                  sublabel="COGM, Rohstoff- & Arbeitskosten je Einheit, Deckungsbeitrag"
                  color="#008A05" open={openSections.costs ?? true}
                  onToggle={() => toggleSection('costs')} />
                {(openSections.costs ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #E8F8EE', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Herstellkosten/Stk (COGM)" value={cogmUnit === '—' ? '—' : `€${cogmUnit}`}
                        subtitle={`Gesamtkosten ${formatCurrency(totalCost)} / ${units} Stück`}
                        icon={<Scale className="w-6 h-6" />} color="green" />
                      <StatCard title="Rohstoffkosten/Stk" value={matUnit === '—' ? '—' : `€${matUnit}`}
                        subtitle={`Material gesamt ${formatCurrency(matCost)}`}
                        icon={<Package className="w-6 h-6" />} color="blue" />
                      <StatCard title="Arbeitskosten/Stk" value={labUnit === '—' ? '—' : `€${labUnit}`}
                        subtitle={`Lohnkosten gesamt ${formatCurrency(labCost)}`}
                        icon={<Users className="w-6 h-6" />} color="purple" />
                      <StatCard title="Deckungsbeitrag/Stk" value={cmUnit === '—' ? '—' : `€${cmUnit}`}
                        subtitle={`Rohgewinn gesamt ${formatCurrency(gp)} · ${opsOutlook?.totals?.grossMarginPct ?? 0}% Marge`}
                        icon={<PiggyBank className="w-6 h-6" />} color={(gp >= 0) ? 'green' : 'red'} />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <StatCard title="Energiekosten/Stk" value={energyUnit === '—' ? '—' : `€${energyUnit}`}
                        subtitle={`Variable Ofenenergie ${formatCurrency(energyCost)}`}
                        icon={<Flame className="w-6 h-6" />} color="orange" />
                      <StatCard title="Umsatz/Arbeitsstunde" value={revenuePerH === '—' ? '—' : `€${revenuePerH}`}
                        subtitle={`Umsatz ${formatCurrency(revenue)} / ${labH.toFixed(1)} h Arbeit`}
                        icon={<TrendingUp className="w-6 h-6" />} color="green" />
                      <div className="card flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Overhead-Allocation/Stk</span>
                        <div className="mt-1">{NA}</div>
                        <span className="text-[11px] text-[#AAAAAA] mt-1">Miete, AfA, Versicherung je Stück — noch nicht erfasst</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    4. ZEIT & EFFIZIENZ
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Timer className="w-4 h-4" />} label="4. Zeit & Effizienz"
                  sublabel="Durchlaufzeit, Taktzeit, OEE"
                  color="#0078C8" open={openSections.time ?? true}
                  onToggle={() => toggleSection('time')} />
                {(openSections.time ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #E0F0FF', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Taktzeit (min/Stk)" value={minPerUnit > 0 ? `${minPerUnit} min` : '—'}
                        subtitle="Ø Planzeit je produzierter Einheit"
                        icon={<Timer className="w-6 h-6" />} color="blue" />
                      {[
                        { title: 'Durchlaufzeit (Lead Time)', sub: 'Zeit von Auftragsstart bis Fertigware' },
                        { title: 'Rüstzeit / Setup Time', sub: 'Einrichtzeiten je Batch oder Produktwechsel' },
                        { title: 'OEE (Overall Equipment Eff.)', sub: 'Verfügbarkeit × Leistung × Qualität' },
                      ].map(k => (
                        <div key={k.title} className="card flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">{k.title}</span>
                          <div className="mt-1">{NA}</div>
                          <span className="text-[11px] text-[#AAAAAA] mt-1">{k.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    5. KAPAZITÄT & PLANUNG
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Target className="w-4 h-4" />} label="5. Kapazität & Planung"
                  sublabel="Auslastung, Plan-vs-Ist, Engpassanalyse"
                  color="#BB0000" open={openSections.capacity ?? true}
                  onToggle={() => toggleSection('capacity')} />
                {(openSections.capacity ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #FFE8E8', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Kapazitätsauslastung" value={capPct != null ? `${capPct}%` : '—'}
                        subtitle={`${labH.toFixed(1)} h verplant von ${availH} h bezahlt (${empCount} Mitarbeiter:innen)`}
                        icon={<Percent className="w-6 h-6" />} color={capPct != null && capPct > 90 ? 'red' : capPct != null && capPct < 40 ? 'orange' : 'green'} />
                      <StatCard title="Plan-Aufgaben" value={tasks > 0 ? `${tasks} Aufgaben` : '—'}
                        subtitle={`${donePct}% erledigt · ${overdue} überfällig`}
                        icon={<Factory className="w-6 h-6" />} color={overdue > 0 ? 'red' : 'blue'} />
                      <StatCard title="Freie Kapazität" value={availH > 0 ? `${(availH - labH).toFixed(1)} h` : '—'}
                        subtitle={`${availH} h bezahlt – ${labH.toFixed(1)} h verplant`}
                        icon={<Clock className="w-6 h-6" />} color="green" />
                      <div className="card flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Engpassanalyse</span>
                        <div className="mt-1">
                          {overdue > 0
                            ? <span style={{ color: '#BB0000', fontWeight: 700, fontSize: 15 }}>{overdue} Aufgabe{overdue > 1 ? 'n' : ''} überfällig</span>
                            : (capPct != null && capPct > 85
                              ? <span style={{ color: '#E76500', fontWeight: 700, fontSize: 15 }}>Hohe Auslastung</span>
                              : <span style={{ color: '#008A05', fontWeight: 600, fontSize: 15 }}>Kein Engpass erkannt</span>
                            )
                          }
                        </div>
                        <span className="text-[11px] text-[#AAAAAA] mt-1">Basierend auf Auslastung & überfälligen Tasks</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    6. LAGER & MATERIALFLUSS
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Warehouse className="w-4 h-4" />} label="6. Lager & Materialfluss"
                  sublabel="Lagerauslastung, ablaufende Chargen, Materialverfügbarkeit"
                  color="#256F3A" open={openSections.storage ?? true}
                  onToggle={() => toggleSection('storage')} />
                {(openSections.storage ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #E0F0E8', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Lagerauslastung gesamt" value={ops?.storage?.overallPct != null ? `${ops.storage.overallPct}%` : '—'}
                        subtitle="Belegung über alle Lagerorte"
                        icon={<Warehouse className="w-6 h-6" />} color={(ops?.storage?.overallPct ?? 0) > 85 ? 'red' : 'green'} />
                      <StatCard title="Ablaufende Chargen (7 Tage)" value={`${ops?.storage?.expiring7d?.count ?? 0} Chargen`}
                        subtitle={`Warenwert ${formatCurrency(ops?.storage?.expiring7d?.value ?? 0)}`}
                        icon={<AlertTriangle className="w-6 h-6" />} color={(ops?.storage?.expiring7d?.count ?? 0) > 0 ? 'orange' : 'green'} />
                      <StatCard title="Niedrigbestand-Alarme" value={`${overview?.inventory?.lowStockCount ?? 0}`}
                        subtitle="Zutaten unter Mindestbestand"
                        icon={<Package className="w-6 h-6" />} color={(overview?.inventory?.lowStockCount ?? 0) > 0 ? 'red' : 'green'} />
                      <div className="card flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Stock-out-Rate</span>
                        <div className="mt-1">{NA}</div>
                        <span className="text-[11px] text-[#AAAAAA] mt-1">Anteil Aufträge, die wg. Materialfehler gestoppt wurden</span>
                      </div>
                    </div>
                    {(ops?.storage?.locations ?? []).length > 0 && (
                      <div className="card">
                        <h4 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-3">📦 Lagerauslastung je Standort</h4>
                        <div className="space-y-2">
                          {(ops.storage.locations as any[]).map((l: any) => (
                            <div key={l.id}>
                              <div className="flex items-baseline justify-between text-xs mb-1">
                                <span className="font-medium text-[#222222]">{l.name}</span>
                                <span className="text-[#6A6A6A]">{l.capacity > 0 ? `${l.used} / ${l.capacity} · ${l.pct}%` : `${l.used} Stück`}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#F2F2F2] overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${Math.min(100, l.pct ?? 0)}%`,
                                  background: (l.pct ?? 0) > 85 ? '#C13515' : (l.pct ?? 0) > 60 ? '#E8A800' : 'linear-gradient(to right,#008A05,#00A86B)',
                                }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    7. LIEFERFÄHIGKEIT
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Truck className="w-4 h-4" />} label="7. Lieferfähigkeit"
                  sublabel="On-Time-Delivery, Perfect Order Rate — erfordert Lieferdatenerfassung"
                  color="#0078C8" open={openSections.delivery ?? false}
                  onToggle={() => toggleSection('delivery')} />
                {(openSections.delivery ?? false) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #E0F0FF', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { title: 'On-Time-Delivery (OTD)', sub: 'Anteil pünktlicher Lieferungen' },
                        { title: 'Perfect Order Rate', sub: 'Vollständig, fehlerfrei & pünktlich geliefert' },
                        { title: 'Backorder-Rate', sub: 'Anteil rückständiger Aufträge' },
                      ].map(k => (
                        <div key={k.title} className="card flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">{k.title}</span>
                          <div className="mt-1">{NA}</div>
                          <span className="text-[11px] text-[#AAAAAA] mt-1">{k.sub}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#AAAAAA] italic">Lieferdaten werden aktuell nicht erfasst. Aktivierbar über ein Auftrags- & Lieferverfolgungsmodul.</p>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    8. PERSONAL & PRODUKTIVITÄT
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<UserCheck className="w-4 h-4" />} label="8. Personal & Produktivität"
                  sublabel="Output je Mitarbeiter, Arbeitsstunden je Batch, Schichtproduktivität"
                  color="#5A18A0" open={openSections.people ?? true}
                  onToggle={() => toggleSection('people')} />
                {(openSections.people ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #F0E8FF', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Output/Mitarbeiter:in" value={outPerEmp === '—' ? '—' : `${outPerEmp} Stk`}
                        subtitle={`${units} Stück / ${empCount} Mitarbeiter:innen`}
                        icon={<UserCheck className="w-6 h-6" />} color="purple" />
                      <StatCard title="Arbeitsstunden/Batch" value={hpb === '—' ? '—' : `${hpb} h`}
                        subtitle={`${labH.toFixed(1)} h Arbeit / ${tasks} Aufgaben`}
                        icon={<Clock className="w-6 h-6" />} color="blue" />
                      <StatCard title="Umsatz/Arbeitsstunde" value={revenuePerH === '—' ? '—' : `€${revenuePerH}`}
                        subtitle="Produktivitätsindex: Umsatz je Lohnstunde"
                        icon={<TrendingUp className="w-6 h-6" />} color="green" />
                      <div className="card flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">Fehlzeitenquote</span>
                        <div className="mt-1">{NA}</div>
                        <span className="text-[11px] text-[#AAAAAA] mt-1">Kranken- & Abwesenheitstage / Sollarbeitstage</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    9. NACHHALTIGKEIT & VERLUSTE
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Leaf className="w-4 h-4" />} label="9. Nachhaltigkeit & Verluste"
                  sublabel="Energieverbrauch, CO₂-Footprint, Verlustquoten"
                  color="#008A05" open={openSections.sustain ?? false}
                  onToggle={() => toggleSection('sustain')} />
                {(openSections.sustain ?? false) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #E8F8EE', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Energieverbrauch/Stk" value={kwhUnit === '—' ? '—' : `${kwhUnit} kWh`}
                        subtitle={`${estKwh} kWh Ofenbetrieb / ${units} Stück`}
                        icon={<Zap className="w-6 h-6" />} color="orange" />
                      {[
                        { title: 'Wasserverbrauch/Stk', sub: 'Liter Wasser je produzierter Einheit' },
                        { title: 'CO₂-Footprint/Produkt', sub: 'kg CO₂-Äquivalent je Einheit (Scope 1+2)' },
                        { title: 'Verlustquote (Rohware)', sub: 'Abfall & Überproduktion in % des Einsatzes' },
                      ].map(k => (
                        <div key={k.title} className="card flex flex-col gap-1">
                          <span className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide">{k.title}</span>
                          <div className="mt-1">{NA}</div>
                          <span className="text-[11px] text-[#AAAAAA] mt-1">{k.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    10. ECONOMIES OF SCALE
                ═══════════════════════════════════════════════════════ */}
                <SectionHeader icon={<Scale className="w-4 h-4" />} label="10. Economies of Scale"
                  sublabel="Break-Even, Unit-Cost-Kurve, Fixkosten-Degression, optimales Volumen"
                  color="#BB0000" open={openSections.eos ?? true}
                  onToggle={() => toggleSection('eos')} />
                {(openSections.eos ?? true) && (
                  <div className="space-y-4 pl-1 pb-4" style={{ borderLeft: '2px solid #FFE8E8', marginLeft: 6, paddingLeft: 20 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Break-Even (Stück)" value={breakEvenUnits != null ? `${breakEvenUnits} Stk` : '—'}
                        subtitle={`Fix-Kosten ${formatCurrency(fixedCostTotal)} / DB je Stk €${cmPerUnit.toFixed(2)}`}
                        icon={<Target className="w-6 h-6" />} color={breakEvenUnits != null && units >= breakEvenUnits ? 'green' : 'red'} />
                      <StatCard title="Aktuelles Volumen" value={`${units} Stk`}
                        subtitle={breakEvenUnits != null ? `${units >= breakEvenUnits ? `+${units - breakEvenUnits} über Break-Even` : `${breakEvenUnits - units} unter Break-Even`}` : 'Break-Even nicht berechenbar'}
                        icon={<BarChart2 className="w-6 h-6" />} color={breakEvenUnits != null && units >= breakEvenUnits ? 'green' : 'orange'} />
                      <StatCard title="Variable Kosten/Stk" value={varCostPerUnit > 0 ? `€${varCostPerUnit.toFixed(2)}` : '—'}
                        subtitle={`Nur Materialkosten · Preis/Stk €${pricePerUnit.toFixed(2)}`}
                        icon={<Package className="w-6 h-6" />} color="blue" />
                      <StatCard title="Fixkosten-Anteil" value={totalCost > 0 ? `${Math.round((fixedCostTotal / totalCost) * 100)}%` : '—'}
                        subtitle={`Fix ${formatCurrency(fixedCostTotal)} / Gesamt ${formatCurrency(totalCost)}`}
                        icon={<Percent className="w-6 h-6" />} color="purple" />
                    </div>
                    {/* Unit cost curve table */}
                    {units > 0 && (
                      <div className="card">
                        <h4 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">📉 Unit-Cost-Kurve — Kosten je Stück bei steigendem Volumen</h4>
                        <p className="text-[11px] text-[#6A6D70] mb-4">Fixkosten werden auf mehr Einheiten verteilt → sinkende Stückkosten (Economies of Scale)</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '1px solid #EEEEEE' }}>
                                {['Volumen', 'Stück', 'Stückkosten', 'vs. jetzt', 'Break-Even?'].map(h => (
                                  <th key={h} className="text-left py-2 pr-6 font-semibold text-[#6A6A6A]">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {unitCostCurve.map((row, i) => {
                                const isBreakEven = breakEvenUnits != null && row.volume >= breakEvenUnits;
                                const isBase = i === 0;
                                return (
                                  <tr key={row.label} style={{ borderBottom: '1px solid #F5F5F5', background: isBase ? '#F9F9F9' : 'transparent' }}>
                                    <td className="py-2 pr-6 font-medium">{row.label} {isBase && <span className="text-[#AAAAAA]">(aktuell)</span>}</td>
                                    <td className="py-2 pr-6">{row.volume.toLocaleString('de-DE')}</td>
                                    <td className="py-2 pr-6 font-semibold">€{row.unitCost}</td>
                                    <td className="py-2 pr-6">
                                      {i > 0 && typeof cogmUnit === 'string' && row.unitCost !== '—'
                                        ? <span style={{ color: '#008A05' }}>−€{(parseFloat(cogmUnit) - parseFloat(row.unitCost as string)).toFixed(2)}</span>
                                        : '—'}
                                    </td>
                                    <td className="py-2">
                                      {isBreakEven
                                        ? <span style={{ color: '#008A05', fontWeight: 700 }}>✓ Ja</span>
                                        : <span style={{ color: '#BB0000' }}>✗ Nein</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Master data summary & Projected Inventory ──────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">🔥 Oven Plan {ops?.week ?? ''}</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Geplante Backzeit je Produkt — Grundlage für Energie- und Schichtplanung</p>
              {(ops?.energy?.byProduct ?? []).length === 0 ? (
                <p className="text-xs text-[#6A6A6A] py-4">Keine Backzeiten in dieser Woche geplant</p>
              ) : (
                <div className="space-y-2.5">
                  {(ops?.energy?.byProduct ?? []).map((p: any) => (
                    <div key={p.name}>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="font-medium text-[#222222]">{p.name}</span>
                        <span className="text-[#6A6A6A]">{p.hours} h</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F2F2F2] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (p.hours / Math.max(...(ops?.energy?.byProduct ?? []).map((x: any) => x.hours), 1)) * 100)}%`,
                            background: 'linear-gradient(to right, #E76500, #C2410C)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">📦 Storage Utilization</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Belegung je Lagerort — Engpässe vor dem nächsten Produktionslauf erkennen</p>
              {(ops?.storage?.locations ?? []).length === 0 ? (
                <p className="text-xs text-[#6A6A6A] py-4">Keine Lagerorte definiert</p>
              ) : (
                <div className="space-y-2.5">
                  {(ops?.storage?.locations ?? []).map((l: any) => (
                    <div key={l.id}>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="font-medium text-[#222222]">{l.name}</span>
                        <span className="text-[#6A6A6A]">
                          {l.capacity > 0 ? `${l.used} / ${l.capacity} · ${l.pct}%` : `${l.used} Stück · keine Kapazität hinterlegt`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F2F2F2] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, l.pct ?? 0)}%`,
                            background: (l.pct ?? 0) > 85 ? '#C13515' : (l.pct ?? 0) > 60 ? '#E8A800' : 'linear-gradient(to right, #008A05, #00A86B)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Master data counts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Ingredients" value={overview?.counts?.ingredients ?? '—'}
              subtitle={`${overview?.inventory?.lowStockCount ?? 0} low stock alerts`}
              icon={<Package className="w-6 h-6" />} color="blue"
            />
            <StatCard title="Recipes" value={overview?.counts?.recipes ?? '—'} icon={<BookOpen className="w-6 h-6" />} color="blue" />
            <StatCard title="Products" value={overview?.counts?.products ?? '—'} icon={<ShoppingBag className="w-6 h-6" />} color="green" />
            <StatCard
              title="Active Plans" value={overview?.counts?.activePlans ?? '—'}
              icon={<Factory className="w-6 h-6" />} color="orange"
            />
          </div>

          {/* Projected inventory reduction from planning */}
          <div className="card">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-5">
              <div>
                <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-[#FF385C]" />
                  Projected Inventory Reduction
                </h3>
                <p className="text-[11px] text-[#6A6D70] mt-1">
                  Estimated ingredient consumption from planned production
                  {impact?.weeks?.length > 0 && <> · <CalendarRange className="inline w-3 h-3 -mt-0.5" /> {impact.weeks.join(', ')}</>}
                  {impact?.productsPlanned > 0 && <> · {impact.productsPlanned} products / {impact.tasksConsidered} tasks</>}
                </p>
              </div>
            </div>

            {!impact || impact.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#6A6D70]">
                <Factory className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">No upcoming planned production — add tasks in Wochenplanung to see the projected stock impact</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl" style={{ background: '#FFF0F3' }}>
                    <p className="text-xs text-[#6A6A6A] font-medium">Projected consumption value</p>
                    <p className="text-[26px] font-bold text-[#E31C5F] leading-tight">−{formatCurrency(impact.totals.demandValue)}</p>
                    <p className="text-xs text-[#6A6A6A] mt-1">
                      ≈ {impact.totals.reductionPct}% of current inventory value ({formatCurrency(impact.totals.currentInventoryValue)})
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, impact.totals.reductionPct)}%`, background: 'linear-gradient(to right, #E61E4D, #D70466)' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl border border-[#EBEBEB]">
                      <p className="text-[22px] font-bold text-[#222222] leading-none">{impact.totals.ingredientsAffected}</p>
                      <p className="text-xs text-[#6A6A6A] mt-1">Zutaten betroffen</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-[#EBEBEB]">
                      <p className="text-[22px] font-bold leading-none" style={{ color: impact.totals.shortages > 0 ? '#C13515' : '#008A05' }}>
                        {impact.totals.shortages}
                      </p>
                      <p className="text-xs text-[#6A6A6A] mt-1">Engpässe (Bestand reicht nicht)</p>
                    </div>
                  </div>
                  {impact.tasksWithoutRecipe > 0 && (
                    <p className="text-[11px] text-[#6A6A6A]">
                      ⚠ {impact.tasksWithoutRecipe} geplante Aufgaben ohne Rezept wurden nicht berücksichtigt.
                    </p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold text-[#6A6A6A] mb-3">Top ingredients by consumption value</p>
                  <div className="space-y-2.5">
                    {impact.items.slice(0, 10).map((item: any) => (
                      <div key={item.id}>
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="font-medium text-[#222222] truncate pr-2">
                            {item.name}
                            {item.shortage && <span className="badge-red ml-2">Fehlt {Math.abs(item.remaining)} {item.unit}</span>}
                            {item.belowReorder && <span className="badge-yellow ml-2">unter Meldebestand</span>}
                          </span>
                          <span className="text-[#6A6A6A] shrink-0">
                            −{item.demand} {item.unit} · {formatCurrency(item.demandValue)} · Rest {item.remaining < 0 ? 0 : item.remaining} {item.unit}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F2F2F2] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.consumptionPct}%`,
                              background: item.shortage ? '#C13515' : item.belowReorder ? '#E8A800' : 'linear-gradient(to right, #E61E4D, #D70466)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Low Stock Alerts */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E76500]" />
                Low Stock Alerts
              </h3>
              {overview?.inventory?.lowStockItems?.length === 0 ? (
                <p className="text-sm text-[#6A6D70] py-4">All stock levels are healthy</p>
              ) : (
                <div className="space-y-2">
                  {overview?.inventory?.lowStockItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#FFF8E1' }}>
                      <div>
                        <p className="text-sm font-medium text-[#32363A]">{item.name}</p>
                        <p className="text-xs text-[#6A6D70]">Reorder level: {item.reorderLevel} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#7A4F00]">{item.currentStock} {item.unit}</p>
                        <span className="badge-yellow">Low Stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock Movement Trend */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-4">Stock Movement (14 days)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend ?? []}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6A6D70' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="stockIn" stroke="#256F3A" name="Stock In" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stockOut" stroke="#FF385C" name="Stock Out" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wastage" stroke="#BB0000" name="Wastage" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Labour vs Units */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">Labour Hours vs. Units Produced</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Planned working hours (bars) against units baked (line) per week</p>
              {(labourEfficiency ?? []).every((d: any) => d.labourHours === 0 && d.unitsProduced === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#6A6D70]">
                  <Zap className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No data yet — start planning weeks &amp; completing batches</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={labourEfficiency ?? []} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} label={{ value: 'h', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#6A6D70' } }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#256F3A' }} axisLine={false} tickLine={false} label={{ value: 'Stk', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#256F3A' } }} />
                    <Tooltip
                      contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 11 }}
                      formatter={(v: any, name: string) => name === 'Stunden' ? [`${v}h`, name] : [`${v} Stk`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="labourHours" name="Stunden" fill="#FF385C" opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="unitsProduced" name="Stück" stroke="#256F3A" strokeWidth={2} dot={{ r: 3, fill: '#256F3A' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <>
          {/* ── Was wurde verkauft ── */}
          <div className="card" style={{ borderColor: '#EBEBEB' }}>
            {/* Header + period toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#222222]">Was wurde verkauft?</h3>
                <p className="text-[11px] text-[#6A6A6A] mt-0.5">Tatsächlich abgebuchte Verkäufe aus dem Lager</p>
              </div>
              <div className="flex rounded-full border border-[#DDDDDD] overflow-hidden">
                {WINDOWS.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSalesWindow(w.id)}
                    className="px-4 py-1.5 text-sm font-medium transition-colors"
                    style={salesWindow === w.id
                      ? { background: '#222222', color: '#FFFFFF' }
                      : { background: '#FFFFFF', color: '#6A6A6A' }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-4" style={{ background: '#E8F8EE' }}>
                <p className="text-[11px] font-semibold text-[#6A6A6A] uppercase tracking-wide mb-1">Umsatz</p>
                <p className="text-3xl font-extrabold text-[#008A05] leading-none">
                  {formatCurrency(salesHistory?.totalRevenue ?? 0)}
                </p>
                <p className="text-xs text-[#6A6A6A] mt-1">
                  {salesWindow === 'week' ? 'letzte 7 Tage' : salesWindow === 'month' ? 'letzte 30 Tage' : 'letztes Jahr'}
                </p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#F7F7F7' }}>
                <p className="text-[11px] font-semibold text-[#6A6A6A] uppercase tracking-wide mb-1">Stück verkauft</p>
                <p className="text-3xl font-extrabold text-[#222222] leading-none">
                  {Math.round(salesHistory?.totalUnits ?? 0)}
                </p>
                <p className="text-xs text-[#6A6A6A] mt-1">
                  {(salesHistory?.topProducts ?? []).length} verschiedene Produkte
                </p>
              </div>
            </div>

            {salesHistory?.totalRevenue === 0 || !salesHistory ? (
              <div className="flex flex-col items-center justify-center py-8 text-[#6A6A6A]">
                <Tag className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">Noch keine Verkäufe im gewählten Zeitraum — nutze den „Verkauft"-Button im Lager</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Chart */}
                <div>
                  <p className="text-[11px] font-semibold text-[#6A6A6A] uppercase tracking-wide mb-3">Verlauf</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={salesHistory?.chart ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6A6D70' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                      <Tooltip
                        formatter={(v: any, name: string) => name === 'revenue' ? [formatCurrency(Number(v)), 'Umsatz'] : [`${v} Stk`, 'Stück']}
                        contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 11 }}
                      />
                      <Bar dataKey="revenue" fill="#008A05" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div>
                  <p className="text-[11px] font-semibold text-[#6A6A6A] uppercase tracking-wide mb-3">Top Produkte</p>
                  <div className="space-y-2">
                    {(salesHistory?.topProducts ?? []).map((p: any, i: number) => {
                      const maxRev = salesHistory?.topProducts?.[0]?.revenue ?? 1;
                      return (
                        <div key={p.id}>
                          <div className="flex items-baseline justify-between text-xs mb-1">
                            <span className="font-medium text-[#222222] truncate pr-2">
                              <span className="text-[#B0B0B0] mr-1.5">#{i + 1}</span>{p.name}
                            </span>
                            <span className="shrink-0 text-[#6A6A6A]">
                              {Math.round(p.units)} Stk · <span className="font-bold text-[#222222]">{formatCurrency(p.revenue)}</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#F2F2F2] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(p.revenue / maxRev) * 100}%`, background: 'linear-gradient(to right, #008A05, #00C853)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sales KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Ready to Sell" value={pipeline?.totals?.readyUnits ?? '—'}
              subtitle={`${formatCurrency(pipeline?.totals?.readyValue ?? 0)} Verkaufswert · ${pipeline?.totals?.potentialMarginPct ?? 0}% pot. Marge · ${pipeline?.totals?.reservedUnits ?? 0} reserviert`}
              icon={<ShoppingBag className="w-6 h-6" />} color="green"
            />
            <StatCard
              title="Value at Risk" value={formatCurrency(pipeline?.totals?.atRiskValue ?? 0)}
              subtitle={`${pipeline?.totals?.expiringSoon ?? 0} Produkte mit MHD ≤ 3 Tage — zuerst verkaufen`}
              icon={<Clock className="w-6 h-6" />}
              color={(pipeline?.totals?.atRiskValue ?? 0) > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Sortiment verfügbar"
              value={`${pipeline?.totals?.assortment?.inStock ?? 0} / ${pipeline?.totals?.assortment?.totalActive ?? 0}`}
              subtitle={`${pipeline?.totals?.assortment?.totalActive ? Math.round((pipeline.totals.assortment.inStock / pipeline.totals.assortment.totalActive) * 100) : 0}% der aktiven Produkte sofort lieferbar`}
              icon={<Tag className="w-6 h-6" />}
              color={(pipeline?.totals?.assortment?.inStock ?? 0) / Math.max(1, pipeline?.totals?.assortment?.totalActive ?? 1) < 0.25 ? 'orange' : 'blue'}
            />
            <StatCard
              title="In Production" value={pipeline?.totals?.incomingUnits ?? 0}
              subtitle={`${formatCurrency(pipeline?.totals?.incomingValue ?? 0)} kommen aus der Wochenplanung`}
              icon={<Factory className="w-6 h-6" />} color="purple"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Sell-by urgency */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">⏰ Sell-By Urgency</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">MHD ≤ 7 Tage — aktiv anbieten, bündeln oder rabattieren bevor es Abschreibung wird</p>
              {(pipeline?.urgent ?? []).length === 0 ? (
                <p className="text-xs text-[#6A6A6A] py-4">Nichts läuft in den nächsten 7 Tagen ab 👍</p>
              ) : (
                <div className="space-y-2">
                  {(pipeline?.urgent ?? []).map((p: any) => (
                    <div
                      key={p.productId}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: p.expiryStatus === 'critical' ? '#FFF0EC' : p.expiryStatus === 'soon' ? '#FFF8E1' : '#F7F7F7' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#222222] truncate">{p.name}</p>
                        <p className="text-xs text-[#6A6A6A]">{p.available} Stück · {formatCurrency(p.value)} Verkaufswert</p>
                      </div>
                      <span className={p.expiryStatus === 'critical' ? 'badge-red shrink-0' : 'badge-yellow shrink-0'}>
                        {p.daysToExpiry <= 0 ? 'heute' : `${p.daysToExpiry} Tag${p.daysToExpiry === 1 ? '' : 'e'}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Availability forecast */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">📅 Availability Forecast</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Verkaufbare Stückzahl — Bestand jetzt plus Zugänge aus der Wochenplanung</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { week: 'Jetzt', units: pipeline?.totals?.readyUnits ?? 0, value: pipeline?.totals?.readyValue ?? 0 },
                  ...(pipeline?.byWeek ?? []),
                ]}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EDEFF0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6A6D70' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any, name: string) => name === 'units' ? [`${v} Stück`, 'Verfügbar'] : [formatCurrency(Number(v)), 'Wert']}
                    contentStyle={{ border: '1px solid #D9D9D9', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="units" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {[{ week: 'Jetzt' }, ...(pipeline?.byWeek ?? [])].map((d: any, i: number) => (
                      <Cell key={i} fill={d.week === 'Jetzt' ? '#008A05' : '#FF385C'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-[#6A6A6A] mt-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: '#008A05' }} /> auf Lager
                <span className="inline-block w-2.5 h-2.5 rounded-full ml-3 mr-1 align-middle" style={{ background: '#FF385C' }} /> geplante Produktion
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Ready now */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">🎂 Ready to Sell</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Finished cakes in storage, available right now</p>
              {(pipeline?.ready ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#6A6D70]">
                  <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">Nothing in finished-goods storage yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(pipeline?.ready ?? []).map((p: any) => (
                    <div key={p.productId} className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EBEBEB] hover:shadow-md transition-shadow">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#222222] truncate">{p.name}</p>
                        <p className="text-xs text-[#6A6A6A] mt-0.5">
                          {p.available} verfügbar{p.reserved > 0 && <> · {p.reserved} reserviert</>}
                          {p.locations.length > 0 && <> · {p.locations.join(', ')}</>}
                        </p>
                        {p.daysToExpiry !== null && (
                          <span className={p.expiryStatus === 'critical' ? 'badge-red mt-1' : p.expiryStatus === 'soon' ? 'badge-yellow mt-1' : 'badge-gray mt-1'}>
                            MHD in {p.daysToExpiry} {p.daysToExpiry === 1 ? 'Tag' : 'Tagen'}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-[#222222]">{formatCurrency(p.value)}</p>
                        <p className="text-xs text-[#6A6A6A]">{formatCurrency(p.sellingPrice)} / Stk</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming pipeline */}
            <div className="card">
              <h3 className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-1">🏭 Coming Up (Pipeline)</h3>
              <p className="text-[11px] text-[#6A6D70] mb-4">Cakes in planned production — sellable soon</p>
              {(pipeline?.incoming ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#6A6D70]">
                  <Factory className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No planned production — check Wochenplanung</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(pipeline?.incoming ?? []).map((p: any) => (
                    <div key={p.productId} className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EBEBEB] hover:shadow-md transition-shadow">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#222222] truncate">{p.name}</p>
                        <p className="text-xs text-[#6A6A6A] mt-0.5">
                          {p.quantity} Stück geplant · {p.weeks.join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-[#008A05]">+{formatCurrency(p.value)}</p>
                        <p className="text-xs text-[#6A6A6A]">erwarteter Wert</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
