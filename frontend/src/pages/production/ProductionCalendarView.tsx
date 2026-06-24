import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfISOWeek, endOfISOWeek, addWeeks, subWeeks, addMonths, subMonths, getISOWeek, getISOWeekYear, startOfYear, addDays, getMonth, getYear, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Cake } from 'lucide-react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function planColor(plan: any | undefined) {
  if (!plan) return { bg: '#F5F5F5', border: '#EDEFF0', text: '#9EA5A8', dot: '#C8CACC' };
  if (plan.completionPct === 100) return { bg: '#E8F5E9', border: '#A8D5B5', text: '#256F3A', dot: '#256F3A' };
  if (plan.status === 'CONFIRMED' || plan.status === 'IN_PROGRESS') return { bg: '#FFF0F3', border: '#A0C8F5', text: '#FF385C', dot: '#FF385C' };
  if (plan.status === 'COMPLETED') return { bg: '#E8F5E9', border: '#A8D5B5', text: '#256F3A', dot: '#256F3A' };
  if (plan.status === 'DRAFT') return { bg: '#FEF3CD', border: '#F5D87A', text: '#E76500', dot: '#E76500' };
  return { bg: '#F5F5F5', border: '#EDEFF0', text: '#9EA5A8', dot: '#C8CACC' };
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Entwurf', CONFIRMED: 'Bestätigt', IN_PROGRESS: 'Läuft', COMPLETED: 'Abgeschlossen', CANCELLED: 'Storniert' };

// Build a map: "year-week" → plan
// planDate from backend is UTC midnight of the week start (e.g. "2026-06-21T22:00:00Z" = Mon 22 Jun in UTC+2).
// To avoid timezone-shift bugs we add 3 days (Mon→Thu) so getISOWeekYear always lands inside the correct ISO year.
function plansByYearWeek(plans: any[]) {
  const map = new Map<string, any>();
  for (const p of plans) {
    if (!p.weekNumber || !p.planDate) continue;
    const midWeek = new Date(new Date(p.planDate).getTime() + 3 * 86_400_000);
    const year = getISOWeekYear(midWeek);
    map.set(`${year}-${p.weekNumber}`, p);
  }
  return map;
}

// Get all ISO weeks that fall within a given month
function weeksInMonth(year: number, month: number) {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(new Date(year, month, 1));
  const weeks: { weekNum: number; weekYear: number; start: Date; end: Date }[] = [];
  let cur = startOfISOWeek(first);
  while (cur <= last) {
    const end = endOfISOWeek(cur);
    weeks.push({ weekNum: getISOWeek(cur), weekYear: getISOWeekYear(cur), start: cur, end });
    cur = addWeeks(cur, 1);
  }
  return weeks;
}

// All weeks in a year
function weeksInYear(year: number) {
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in W1
  let cur = startOfISOWeek(jan4);
  const weeks: { weekNum: number; start: Date }[] = [];
  while (getISOWeekYear(cur) === year) {
    weeks.push({ weekNum: getISOWeek(cur), start: cur });
    cur = addWeeks(cur, 1);
  }
  return weeks;
}

// ─── DETAIL POPOVER ───────────────────────────────────────────────────────────

function WeekDetailPopover({ plan, onClose, onNavigate }: { plan: any; onClose: () => void; onNavigate: (id: string) => void }) {
  const c = planColor(plan);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[420px] max-h-[80vh] overflow-auto p-5 z-10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-[#6A6D70] font-medium uppercase tracking-wide mb-0.5">
              KW {plan.weekNumber} · {plan.planDate ? format(new Date(plan.planDate), 'dd. MMM yyyy') : ''}
            </div>
            <div className="text-base font-semibold text-[#222222]">Produktionsplan</div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            {STATUS_LABEL[plan.status] ?? plan.status}
          </span>
        </div>

        {/* Completion bar */}
        {plan.completionPct != null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#6A6D70]">Fertigstellung</span>
              <div className="flex items-center gap-1.5">
                <Cake className="w-3 h-3" style={{ color: c.dot }} />
                <span className="text-xs font-semibold" style={{ color: c.dot }}>{plan.completionPct}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${plan.completionPct}%`, background: c.dot }} />
            </div>
          </div>
        )}

        {/* Product lines */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">Produkte ({plan.lines?.length ?? 0})</div>
          {plan.lines?.length > 0 ? (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {plan.lines.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between bg-[#F5F6F7] rounded-lg px-3 py-2">
                  <span className="text-sm text-[#222222]">{l.product?.name ?? l.productId}</span>
                  <span className="text-xs font-semibold text-[#FF385C] ml-3">× {l.plannedQuantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9EA5A8] italic">Keine Produkte geplant</p>
          )}
        </div>

        {plan.notes && (
          <div className="mb-4 text-xs text-[#6A6D70] bg-[#F5F6F7] rounded-lg px-3 py-2">{plan.notes}</div>
        )}

        <div className="flex gap-2 pt-3 border-t border-[#EDEFF0]">
          <button onClick={() => onNavigate(plan.id)} className="btn-primary flex-1 text-sm">Details öffnen</button>
          <button onClick={onClose} className="btn-ghost text-sm px-4">Schließen</button>
        </div>
      </div>
    </div>
  );
}

// ─── YEARLY VIEW ──────────────────────────────────────────────────────────────

function YearlyView({ year, planMap, onWeekClick, onYearChange }: {
  year: number;
  planMap: Map<string, any>;
  onWeekClick: (plan: any, weekNum: number, weekYear: number) => void;
  onYearChange: (y: number) => void;
}) {
  return (
    <div>
      {/* Year navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onYearChange(year - 1)} className="btn-ghost p-1.5"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-lg font-semibold text-[#222222] w-16 text-center">{year}</span>
        <button onClick={() => onYearChange(year + 1)} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* 4×3 month grid */}
      <div className="grid grid-cols-4 gap-4">
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const weeks = weeksInMonth(year, monthIdx);
          return (
            <div key={monthIdx} className="bg-white rounded-xl border border-[#EDEFF0] p-3 shadow-sm">
              <div className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">{monthName}</div>
              <div className="space-y-1">
                {weeks.map(({ weekNum, weekYear, start }) => {
                  const key = `${weekYear}-${weekNum}`;
                  const plan = planMap.get(key);
                  const c = planColor(plan);
                  const isCurrentMonth = isSameMonth(start, new Date(year, monthIdx, 1)) || isSameMonth(endOfISOWeek(start), new Date(year, monthIdx, 1));
                  return (
                    <div
                      key={key}
                      onClick={() => onWeekClick(plan, weekNum, weekYear)}
                      title={plan ? `KW${weekNum}: ${STATUS_LABEL[plan.status] ?? plan.status}` : `KW${weekNum}: Kein Plan`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 cursor-pointer hover:opacity-80 transition-all group"
                      style={{ background: isCurrentMonth ? c.bg : '#FAFAFA', border: `1px solid ${isCurrentMonth ? c.border : '#EDEFF0'}` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isCurrentMonth ? c.dot : '#D5D8DA' }} />
                      <span className="text-xs font-medium" style={{ color: isCurrentMonth ? c.text : '#C8CACC' }}>KW {String(weekNum).padStart(2, '0')}</span>
                      {plan && isCurrentMonth && plan.completionPct != null && (
                        <div className="ml-auto flex items-center gap-1">
                          <div className="w-8 h-1 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
                            <div className="h-full rounded-full" style={{ width: `${plan.completionPct}%`, background: c.dot }} />
                          </div>
                        </div>
                      )}
                      {plan && isCurrentMonth && plan.lines?.length > 0 && (
                        <span className="ml-auto text-xs font-semibold" style={{ color: c.dot }}>{plan.lines.length}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-5 text-xs text-[#6A6D70]">
        {[
          { color: '#C8CACC', label: 'Kein Plan' },
          { color: '#E76500', label: 'Entwurf' },
          { color: '#FF385C', label: 'Bestätigt' },
          { color: '#256F3A', label: 'Abgeschlossen' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MONTHLY VIEW ─────────────────────────────────────────────────────────────

function MonthlyView({ year, month, planMap, onWeekClick, onMonthChange }: {
  year: number; month: number;
  planMap: Map<string, any>;
  onWeekClick: (plan: any, weekNum: number, weekYear: number) => void;
  onMonthChange: (y: number, m: number) => void;
}) {
  const weeks = weeksInMonth(year, month);

  const prev = () => { const d = subMonths(new Date(year, month, 1), 1); onMonthChange(getYear(d), getMonth(d)); };
  const next = () => { const d = addMonths(new Date(year, month, 1), 1); onMonthChange(getYear(d), getMonth(d)); };

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={prev} className="btn-ghost p-1.5"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-lg font-semibold text-[#222222] w-44 text-center">{MONTH_NAMES[month]} {year}</span>
        <button onClick={next} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        <div className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide text-center py-1">KW</div>
        {DAY_SHORT.map(d => (
          <div key={d} className="text-xs font-semibold text-[#6A6D70] uppercase tracking-wide text-center py-1">{d}</div>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-2">
        {weeks.map(({ weekNum, weekYear, start }) => {
          const key = `${weekYear}-${weekNum}`;
          const plan = planMap.get(key);
          const c = planColor(plan);
          const days = Array.from({ length: 6 }, (_, i) => addDays(start, i));

          return (
            <div key={key} className="grid grid-cols-7 gap-2 items-stretch">
              {/* Week number cell */}
              <div
                onClick={() => onWeekClick(plan, weekNum, weekYear)}
                className="rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-all min-h-[80px] border"
                style={{ background: c.bg, borderColor: c.border }}
              >
                <div className="w-2 h-2 rounded-full mb-1" style={{ background: c.dot }} />
                <span className="text-xs font-bold" style={{ color: c.text }}>KW</span>
                <span className="text-sm font-bold" style={{ color: c.text }}>{String(weekNum).padStart(2, '0')}</span>
                {plan?.completionPct != null && (
                  <span className="text-xs mt-1 font-medium" style={{ color: c.text }}>{plan.completionPct}%</span>
                )}
              </div>

              {/* Day cells */}
              {days.map((day, i) => {
                const inMonth = getMonth(day) === month;
                return (
                  <div
                    key={i}
                    onClick={() => onWeekClick(plan, weekNum, weekYear)}
                    className="rounded-xl border p-2 cursor-pointer hover:opacity-80 transition-all min-h-[80px]"
                    style={{
                      background: inMonth ? (plan ? c.bg : 'white') : '#FAFAFA',
                      borderColor: inMonth ? (plan ? c.border : '#EDEFF0') : '#F0F1F2',
                    }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: inMonth ? '#222222' : '#C8CACC' }}>
                      {format(day, 'd')}
                    </div>
                    {plan && inMonth && (
                      <div className="space-y-0.5">
                        {plan.lines?.slice(0, 2).map((l: any) => (
                          <div key={l.id} className="text-xs truncate font-medium leading-tight" style={{ color: c.text }}>
                            {l.product?.name ?? '—'}
                          </div>
                        ))}
                        {(plan.lines?.length ?? 0) > 2 && (
                          <div className="text-xs" style={{ color: c.text }}>+{plan.lines.length - 2} mehr</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEKLY VIEW ──────────────────────────────────────────────────────────────

function WeeklyView({ weekNum, weekYear, planMap, onWeekChange, onPlanClick }: {
  weekNum: number; weekYear: number;
  planMap: Map<string, any>;
  onWeekChange: (wn: number, wy: number) => void;
  onPlanClick: (plan: any) => void;
}) {
  const key = `${weekYear}-${weekNum}`;
  const plan = planMap.get(key);

  // Compute week start from ISO week
  const jan4 = new Date(weekYear, 0, 4);
  const weekStart = addWeeks(startOfISOWeek(jan4), weekNum - getISOWeek(jan4));
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const prevWeek = () => {
    const prev = subWeeks(weekStart, 1);
    onWeekChange(getISOWeek(prev), getISOWeekYear(prev));
  };
  const nextWeek = () => {
    const next = addWeeks(weekStart, 1);
    onWeekChange(getISOWeek(next), getISOWeekYear(next));
  };

  const c = planColor(plan);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={prevWeek} className="btn-ghost p-1.5"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-lg font-semibold text-[#222222] w-56 text-center">
          KW {String(weekNum).padStart(2, '0')} · {format(weekStart, 'dd. MMM')} – {format(addDays(weekStart, 5), 'dd. MMM yyyy')}
        </span>
        <button onClick={nextWeek} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {plan ? (
        <>
          {/* Plan status bar */}
          <div
            className="rounded-xl border p-4 mb-5 flex items-center justify-between cursor-pointer hover:opacity-90 transition-all"
            style={{ background: c.bg, borderColor: c.border }}
            onClick={() => onPlanClick(plan)}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: c.dot }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: c.text }}>{STATUS_LABEL[plan.status] ?? plan.status}</div>
                <div className="text-xs text-[#6A6D70]">{plan.lines?.length ?? 0} Produkte · {plan.notes || 'Kein Kommentar'}</div>
              </div>
            </div>
            {plan.completionPct != null && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
                  <div className="h-full rounded-full" style={{ width: `${plan.completionPct}%`, background: c.dot }} />
                </div>
                <div className="flex items-center gap-1">
                  <Cake className="w-3.5 h-3.5" style={{ color: c.dot }} />
                  <span className="text-sm font-bold" style={{ color: c.dot }}>{plan.completionPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-6 gap-3">
            {days.map((day, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#EDEFF0] overflow-hidden shadow-sm">
                <div className="px-3 py-2 border-b border-[#EDEFF0]" style={{ background: c.bg }}>
                  <div className="text-xs font-semibold" style={{ color: c.text }}>{DAY_SHORT[i]}</div>
                  <div className="text-base font-bold text-[#222222]">{format(day, 'd')}</div>
                  <div className="text-xs text-[#6A6D70]">{format(day, 'MMM')}</div>
                </div>
                <div className="p-2 space-y-1.5 min-h-[120px]">
                  {plan.lines?.map((l: any) => (
                    <div key={l.id} className="rounded-lg px-2 py-1.5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                      <div className="text-xs font-semibold leading-tight" style={{ color: c.text }}>{l.product?.name ?? l.productId}</div>
                      <div className="text-xs text-[#6A6D70]">× {l.plannedQuantity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[#EDEFF0]">
          <div className="w-12 h-12 rounded-full bg-[#F5F6F7] flex items-center justify-center mb-3">
            <Cake className="w-6 h-6 text-[#C8CACC]" />
          </div>
          <p className="text-sm font-medium text-[#6A6D70]">Kein Produktionsplan für KW {weekNum}</p>
          <p className="text-xs text-[#9EA5A8] mt-1">{format(weekStart, 'dd. MMM')} – {format(addDays(weekStart, 5), 'dd. MMM yyyy')}</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

type CalView = 'year' | 'month' | 'week';

export default function ProductionCalendarView({ plans }: { plans: any[] }) {
  const navigate = useNavigate();
  const today = new Date();

  const [calView, setCalView] = useState<CalView>('month');
  const [year, setYear] = useState(getYear(today));
  const [month, setMonth] = useState(getMonth(today));
  const [weekNum, setWeekNum] = useState(getISOWeek(today));
  const [weekYear, setWeekYear] = useState(getISOWeekYear(today));
  const [popoverPlan, setPopoverPlan] = useState<any>(null);

  const planMap = useMemo(() => plansByYearWeek(plans), [plans]);

  const handleWeekClick = (plan: any, wn: number, wy: number) => {
    if (!plan) {
      // Navigate to week view to show "no plan" state
      setWeekNum(wn); setWeekYear(wy); setCalView('week');
      return;
    }
    setPopoverPlan(plan);
  };

  const VIEW_LABELS: { key: CalView; label: string }[] = [
    { key: 'year', label: 'Jahr' },
    { key: 'month', label: 'Monat' },
    { key: 'week', label: 'Woche' },
  ];

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-1 mb-6 bg-[#F5F6F7] rounded-lg p-1 w-fit">
        {VIEW_LABELS.map(v => (
          <button
            key={v.key}
            onClick={() => setCalView(v.key)}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
            style={calView === v.key
              ? { background: 'white', color: '#FF385C', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#6A6D70' }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {calView === 'year' && (
        <YearlyView
          year={year}
          planMap={planMap}
          onYearChange={setYear}
          onWeekClick={(plan, wn, wy) => {
            if (plan) { setPopoverPlan(plan); }
            else { setWeekNum(wn); setWeekYear(wy); setCalView('week'); }
          }}
        />
      )}

      {calView === 'month' && (
        <MonthlyView
          year={year} month={month}
          planMap={planMap}
          onWeekClick={handleWeekClick}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
        />
      )}

      {calView === 'week' && (
        <WeeklyView
          weekNum={weekNum} weekYear={weekYear}
          planMap={planMap}
          onWeekChange={(wn, wy) => { setWeekNum(wn); setWeekYear(wy); }}
          onPlanClick={setPopoverPlan}
        />
      )}

      {/* Detail popover */}
      {popoverPlan && (
        <WeekDetailPopover
          plan={popoverPlan}
          onClose={() => setPopoverPlan(null)}
          onNavigate={(id) => { setPopoverPlan(null); navigate(`/production/plans/${id}`); }}
        />
      )}
    </div>
  );
}
