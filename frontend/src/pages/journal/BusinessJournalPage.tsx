import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { journalApi } from '../../api/client';
import {
  Package, CalendarDays, ChefHat, CheckCircle2, Warehouse, ShoppingBag,
  ScrollText, Plus, Minus, Hash,
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {
  label: string; sublabel: string;
  icon: any; color: string; bg: string; border: string;
}> = {
  ING: { label: 'ING', sublabel: 'Zutat',     icon: Package,      color: '#1B66C9', bg: '#EBF3FF', border: '#B8D4FF' },
  PLN: { label: 'PLN', sublabel: 'Geplant',   icon: CalendarDays, color: '#7B5EA7', bg: '#F4EDFF', border: '#D4C0FF' },
  BCK: { label: 'BCK', sublabel: 'Im Backen', icon: ChefHat,      color: '#E76500', bg: '#FFF3E8', border: '#FECDA0' },
  BRT: { label: 'BRT', sublabel: 'Fertig',    icon: CheckCircle2, color: '#008A05', bg: '#E8F8EE', border: '#A8E6B2' },
  ELG: { label: 'ELG', sublabel: 'Gelagert',  icon: Warehouse,    color: '#6F19C2', bg: '#F0ECFF', border: '#C8B0FF' },
  VKF: { label: 'VKF', sublabel: 'Verkauft',  icon: ShoppingBag,  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const PIPELINE: string[] = ['ING', 'PLN', 'BCK', 'BRT', 'ELG', 'VKF'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return format(new Date(iso), 'HH:mm', { locale: de });
}
function fmtDate(iso: string) {
  return format(new Date(iso), 'dd. MMM yyyy', { locale: de });
}

interface Entry {
  id: string;
  status: string;
  productName?: string;
  productId?: string;
  batchNumber?: string;
  quantity?: number;
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

interface ProductGroup {
  key: string;           // productId or productName
  productName: string;
  productId?: string;
  latestStatus: string;
  batchNumbers: string[];
  totalQty: number;
  doneMask: Set<string>; // which stages have ≥1 event
  events: Entry[];
}

function groupByProduct(entries: Entry[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();

  for (const e of entries) {
    const key = e.productId ?? e.productName ?? 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        key,
        productName: e.productName ?? '—',
        productId: e.productId,
        latestStatus: e.status,
        batchNumbers: [],
        totalQty: 0,
        doneMask: new Set(),
        events: [],
      });
    }
    const g = map.get(key)!;
    g.doneMask.add(e.status);
    g.events.push(e);
    if (e.batchNumber && !g.batchNumbers.includes(e.batchNumber)) {
      g.batchNumbers.push(e.batchNumber);
    }
  }

  // Set latestStatus = furthest stage in pipeline that has an event
  for (const g of map.values()) {
    for (let i = PIPELINE.length - 1; i >= 0; i--) {
      if (g.doneMask.has(PIPELINE[i])) { g.latestStatus = PIPELINE[i]; break; }
    }
    // total qty = sum of ELG or BRT events (last meaningful quantity)
    const elg = g.events.filter(e => e.status === 'ELG');
    if (elg.length > 0) {
      g.totalQty = elg.reduce((s, e) => s + (e.quantity ?? 0), 0);
    } else {
      const brt = g.events.filter(e => e.status === 'BRT');
      g.totalQty = brt.reduce((s, e) => s + (e.quantity ?? 0), 0);
    }
  }

  // Sort: VKF last, else by recency of latest event
  return [...map.values()].sort((a, b) => {
    const aIdx = PIPELINE.indexOf(a.latestStatus);
    const bIdx = PIPELINE.indexOf(b.latestStatus);
    if (aIdx !== bIdx) return bIdx - aIdx;
    return new Date(b.events[0].createdAt).getTime() - new Date(a.events[0].createdAt).getTime();
  });
}

// ── Pipeline strip ────────────────────────────────────────────────────────────

function PipelineStrip({ doneMask, latestStatus }: { doneMask: Set<string>; latestStatus: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {PIPELINE.map((s, i) => {
        const m = STATUS_META[s];
        const done = doneMask.has(s);
        const active = s === latestStatus;
        const Icon = m.icon;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '4px 8px',
              borderRadius: 10,
              background: active ? m.color : done ? m.bg : 'transparent',
              border: active ? `1.5px solid ${m.color}` : done ? `1px solid ${m.border}` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              <Icon style={{ width: 12, height: 12, color: active ? '#FFFFFF' : done ? m.color : '#DDDDDD' }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                color: active ? '#FFFFFF' : done ? m.color : '#CCCCCC',
              }}>
                {s}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{
                width: 14, height: 1.5,
                background: doneMask.has(PIPELINE[i + 1]) ? '#D0D0D0' : '#EBEBEB',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ group }: { group: ProductGroup }) {
  const [open, setOpen] = useState(false);
  const m = STATUS_META[group.latestStatus] ?? STATUS_META.PLN;
  const Icon = m.icon;

  return (
    <div style={{
      border: `1.5px solid ${open ? m.color + '55' : '#EBEBEB'}`,
      borderRadius: 18,
      background: '#FFFFFF',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* ── Card header (always visible) ── */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Status icon */}
        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: m.bg, border: `1.5px solid ${m.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 20, height: 20, color: m.color }} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#222222', marginBottom: 2 }}>
            {group.productName}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Batch pill(s) */}
            {group.batchNumbers.slice(0, 2).map(bn => (
              <span key={bn} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, color: '#6A6A6A',
                background: '#F7F7F7', border: '1px solid #EBEBEB',
                borderRadius: 9999, padding: '2px 8px', fontFamily: 'monospace',
              }}>
                <Hash style={{ width: 9, height: 9 }} />{bn}
              </span>
            ))}
            {/* Quantity */}
            {group.totalQty > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: m.color,
                background: m.bg, borderRadius: 6, padding: '2px 7px',
              }}>
                {group.totalQty} Stk
              </span>
            )}
            {/* Event count */}
            <span style={{ fontSize: 11, color: '#B0B0B0' }}>
              {group.events.length} {group.events.length === 1 ? 'Ereignis' : 'Ereignisse'}
            </span>
          </div>
        </div>

        {/* Pipeline strip */}
        <div style={{ flexShrink: 0, display: 'none' }} className="pipeline-strip-desktop">
          <PipelineStrip doneMask={group.doneMask} latestStatus={group.latestStatus} />
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${open ? m.color : '#EBEBEB'}`,
            background: open ? m.color : '#F7F7F7',
            color: open ? '#FFFFFF' : '#6A6A6A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {open
            ? <Minus style={{ width: 15, height: 15 }} />
            : <Plus  style={{ width: 15, height: 15 }} />
          }
        </button>
      </div>

      {/* Pipeline strip (below header, always visible) */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex',
      }}>
        <PipelineStrip doneMask={group.doneMask} latestStatus={group.latestStatus} />
      </div>

      {/* ── Expanded timeline ── */}
      {open && (
        <div style={{ borderTop: '1.5px solid #F0F0F0', padding: '16px 16px 16px 20px' }}>
          {/* Timeline label */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#B0B0B0', letterSpacing: '0.08em', marginBottom: 12 }}>
            VERLAUF · {group.events.length} EINTRÄGE
          </div>

          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 13, top: 8, bottom: 8,
              width: 1.5, background: '#F0F0F0',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...group.events].reverse().map((ev) => {
                const em = STATUS_META[ev.status] ?? STATUS_META.PLN;
                const EIcon = em.icon;
                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {/* Icon dot */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                      background: em.bg, border: `1.5px solid ${em.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                    }}>
                      <EIcon style={{ width: 13, height: 13, color: em.color }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                          color: em.color, background: em.bg,
                          border: `1px solid ${em.border}`,
                          borderRadius: 9999, padding: '1px 7px',
                        }}>
                          {em.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#222222' }}>
                          {em.sublabel}
                        </span>
                        {ev.quantity != null && (
                          <span style={{ fontSize: 11, color: em.color, fontWeight: 700 }}>
                            {ev.quantity} Stk
                          </span>
                        )}
                        {ev.performedBy && (
                          <span style={{ fontSize: 11, color: '#6A6A6A' }}>
                            👤 {ev.performedBy}
                          </span>
                        )}
                      </div>
                      {ev.notes && (
                        <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 2 }}>
                          {ev.notes}
                        </div>
                      )}
                      {ev.batchNumber && (
                        <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2, fontFamily: 'monospace' }}>
                          #{ev.batchNumber}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: 10, color: '#B0B0B0', flexShrink: 0, textAlign: 'right', paddingTop: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#444444' }}>{fmtTime(ev.createdAt)}</div>
                      <div>{fmtDate(ev.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pipeline summary ──────────────────────────────────────────────────────────

function PipelineSummary({ counts }: { counts: Record<string, number> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {PIPELINE.map(s => {
        const m = STATUS_META[s];
        const Icon = m.icon;
        const n = counts[s] ?? 0;
        return (
          <div key={s} style={{
            background: n > 0 ? m.bg : '#F7F7F7',
            border: `1.5px solid ${n > 0 ? m.border : '#EBEBEB'}`,
            borderRadius: 14, padding: '10px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <Icon style={{ width: 16, height: 16, color: n > 0 ? m.color : '#CCCCCC' }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: n > 0 ? m.color : '#DDDDDD', lineHeight: 1 }}>{n}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: n > 0 ? m.color : '#CCCCCC', letterSpacing: '0.06em' }}>{s}</span>
            <span style={{ fontSize: 9, color: n > 0 ? m.color + 'AA' : '#CCCCCC', textAlign: 'center', lineHeight: 1.3 }}>
              {m.sublabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BusinessJournalPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['journal', filterStatus],
    queryFn: () =>
      journalApi.list({ status: filterStatus || undefined, limit: 500 }).then(r => r.data),
    refetchInterval: 15000,
  });

  const entries: Entry[] = data?.entries ?? [];
  const counts: Record<string, number> = data?.counts ?? {};
  const groups = groupByProduct(entries);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, background: '#222222',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ScrollText style={{ width: 22, height: 22, color: '#FFFFFF' }} />
        </div>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: '#222222', margin: 0 }}>Business Journal</h1>
          <p style={{ fontSize: 13, color: '#6A6A6A', margin: 0, marginTop: 2 }}>
            Produktstatus von der Zutat bis zum Verkauf — tap <strong>+</strong> für den vollständigen Verlauf
          </p>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#B0B0B0', letterSpacing: '0.08em', marginBottom: 10 }}>
          GESAMTÜBERSICHT · {groups.length} PRODUKTE AKTIV
        </div>
        <PipelineSummary counts={counts} />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('')}
          style={{
            padding: '6px 16px', borderRadius: 9999, border: '1.5px solid',
            borderColor: filterStatus === '' ? '#222222' : '#EBEBEB',
            background: filterStatus === '' ? '#222222' : '#FFFFFF',
            color: filterStatus === '' ? '#FFFFFF' : '#6A6A6A',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Alle Produkte
        </button>
        {PIPELINE.map(s => {
          const m = STATUS_META[s];
          const active = filterStatus === s;
          return (
            <button key={s} onClick={() => setFilterStatus(active ? '' : s)}
              style={{
                padding: '5px 13px', borderRadius: 9999,
                border: `1.5px solid ${active ? m.color : m.border}`,
                background: active ? m.color : m.bg,
                color: active ? '#FFFFFF' : m.color,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {s} · {m.sublabel}
            </button>
          );
        })}
      </div>

      {/* Product cards */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse" style={{ height: 96, borderRadius: 18, background: '#F7F7F7' }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ScrollText style={{ width: 40, height: 40, color: '#DDDDDD', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: '#222222', margin: 0 }}>Noch keine Einträge</p>
          <p style={{ fontSize: 13, color: '#6A6A6A', margin: '4px 0 0' }}>
            Ereignisse werden automatisch geloggt sobald Aktionen stattfinden.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => <ProductCard key={g.key} group={g} />)}
        </div>
      )}
    </div>
  );
}
