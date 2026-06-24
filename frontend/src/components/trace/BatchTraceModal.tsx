import { useQuery } from '@tanstack/react-query';
import {
  Package, ChefHat, Warehouse, ShoppingBag, ArrowUpDown,
  CheckCircle2, Clock, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { useState } from 'react';
import { traceApi } from '../../api/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const STEP_META: Record<string, { icon: any; color: string; bg: string }> = {
  ingredients: { icon: Package,      color: '#1B66C9', bg: '#EBF3FF' },
  production:  { icon: ChefHat,      color: '#E76500', bg: '#FFF3E8' },
  storage:     { icon: Warehouse,    color: '#6F19C2', bg: '#F4EDFF' },
  sold:        { icon: ShoppingBag,  color: '#008A05', bg: '#E8F8EE' },
  movement:    { icon: ArrowUpDown,  color: '#6A6A6A', bg: '#F7F7F7' },
};

function stepMeta(step: string) {
  if (step === 'ingredients') return STEP_META.ingredients;
  if (step === 'production' || step.startsWith('stage_')) return STEP_META.production;
  if (step === 'storage') return STEP_META.storage;
  if (step.startsWith('movement_')) return STEP_META.movement;
  return STEP_META.movement;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try { return format(new Date(iso), 'dd. MMM yyyy · HH:mm', { locale: de }); }
  catch { return iso; }
}

export default function BatchTraceModal({
  storageRecordId, batchNumber, productName, onClose,
}: {
  storageRecordId: string;
  batchNumber: string;
  productName: string;
  onClose: () => void;
}) {
  const { data: trace, isLoading } = useQuery({
    queryKey: ['batch-trace', storageRecordId],
    queryFn: () => traceApi.getBatch(storageRecordId).then(r => r.data),
  });

  const [expanded, setExpanded] = useState<string | null>('ingredients');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 580,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #EBEBEB',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B0B0B0', letterSpacing: '0.08em', marginBottom: 2 }}>
              PRODUKTVERLAUF
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#222222' }}>{productName}</div>
            <div style={{ fontSize: 12, color: '#6A6A6A', marginTop: 2, fontFamily: 'monospace' }}>
              Charge {batchNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid #EBEBEB',
              background: '#F7F7F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14, color: '#6A6A6A' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#B0B0B0', fontSize: 13 }}>
              Verlauf wird geladen…
            </div>
          ) : !trace ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#B0B0B0', fontSize: 13 }}>
              Keine Daten gefunden.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical connector line */}
              <div style={{
                position: 'absolute', left: 19, top: 20, bottom: 20,
                width: 2, background: '#F0F0F0', zIndex: 0,
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(trace.events ?? []).map((ev: any) => {
                  const meta = stepMeta(ev.step);
                  const Icon = meta.icon;
                  const isOpen = expanded === ev.step;
                  const hasDetails = (ev.details?.length ?? 0) > 0 || ev.who;

                  return (
                    <div key={ev.step} style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
                      {/* Icon node */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: ev.status === 'done' ? meta.bg : '#F7F7F7',
                        border: `2px solid ${ev.status === 'done' ? meta.color + '33' : '#EBEBEB'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon style={{ width: 18, height: 18, color: ev.status === 'done' ? meta.color : '#CCCCCC' }} />
                      </div>

                      {/* Content card */}
                      <div style={{
                        flex: 1, minWidth: 0,
                        background: '#FFFFFF', border: '1px solid #EBEBEB', borderRadius: 14,
                        overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => hasDetails && setExpanded(isOpen ? null : ev.step)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', background: 'none', border: 'none',
                            cursor: hasDetails ? 'pointer' : 'default', textAlign: 'left',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#222222' }}>{ev.label}</span>
                              {ev.status === 'done'
                                ? <CheckCircle2 style={{ width: 13, height: 13, color: meta.color, flexShrink: 0 }} />
                                : <Clock style={{ width: 13, height: 13, color: '#CCCCCC', flexShrink: 0 }} />
                              }
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                              {ev.sublabel && (
                                <span style={{ fontSize: 11, color: '#6A6A6A' }}>{ev.sublabel}</span>
                              )}
                              {ev.at && (
                                <span style={{ fontSize: 11, color: '#B0B0B0' }}>{fmtDate(ev.at)}</span>
                              )}
                              {ev.who && (
                                <span style={{
                                  fontSize: 11, fontWeight: 700, color: meta.color,
                                  background: meta.bg, borderRadius: 6, padding: '1px 6px',
                                }}>
                                  👤 {ev.who}
                                </span>
                              )}
                            </div>
                          </div>
                          {hasDetails && (
                            isOpen
                              ? <ChevronUp style={{ width: 14, height: 14, color: '#B0B0B0', flexShrink: 0 }} />
                              : <ChevronDown style={{ width: 14, height: 14, color: '#B0B0B0', flexShrink: 0 }} />
                          )}
                        </button>

                        {/* Expanded detail */}
                        {isOpen && hasDetails && (
                          <div style={{
                            borderTop: '1px solid #F0F0F0', padding: '10px 14px',
                            background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 5,
                          }}>
                            {ev.step === 'ingredients' && (ev.details ?? []).map((d: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#222222', fontWeight: 500 }}>{d.name}</span>
                                <span style={{ color: '#6A6A6A' }}>{d.quantity} {d.unit}</span>
                              </div>
                            ))}
                            {ev.step === 'storage' && (ev.details ?? []).map((d: any, i: number) => (
                              <div key={i} style={{ fontSize: 12, color: '#6A6A6A' }}>
                                {d.batchNumber && <span>Charge: <strong style={{ color: '#222222', fontFamily: 'monospace' }}>{d.batchNumber}</strong></span>}
                                {d.quantity !== undefined && <span style={{ marginLeft: 10 }}>{d.quantity} Stück eingelagert</span>}
                                {d.expiryDate && <span style={{ marginLeft: 10 }}>MHD: <strong style={{ color: '#222222' }}>{fmtDate(d.expiryDate)}</strong></span>}
                              </div>
                            ))}
                            {(ev.step.startsWith('movement_') || ev.step === 'production') && (ev.details ?? []).map((d: any, i: number) => (
                              <div key={i} style={{ fontSize: 12, color: '#6A6A6A' }}>
                                {d.quantity !== undefined && <span>{d.quantity} Stück</span>}
                                {d.estimatedMinutes > 0 && <span style={{ marginLeft: 10 }}>⏱ {d.estimatedMinutes} min</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #EBEBEB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#B0B0B0' }}>
            {trace?.isActive === false ? 'Charge vollständig abverkauft' : `Noch ${trace?.currentQty ?? 0} Stück auf Lager`}
          </span>
          <button onClick={onClose} style={{
            padding: '8px 20px', background: '#222222', color: '#FFFFFF',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
