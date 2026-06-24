import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, ChefHat, FlameKindling, Package, Euro, CheckCircle2 } from 'lucide-react';
import { recipesApi } from '../../api/client';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/format';

// ─── STEP PARSER ──────────────────────────────────────────────────────────────
// Splits a notes string into an array of steps.
// Supports:
//   "1. Backofen ..."   numbered
//   "- Zucker ..."      bullet
//   blank-line blocks   as paragraphs
interface Step {
  number: number | null;
  text: string;
}

function parseSteps(notes: string): Step[] {
  if (!notes?.trim()) return [];

  const lines = notes.split('\n');
  const steps: Step[] = [];
  let counter = 0;
  let currentText = '';
  let currentNumber: number | null = null;

  const flush = () => {
    const t = currentText.trim();
    if (t) {
      steps.push({ number: currentNumber, text: t });
    }
    currentText = '';
    currentNumber = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Numbered step: "1." or "1)" at start
    const numMatch = line.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      flush();
      counter = parseInt(numMatch[1], 10);
      currentNumber = counter;
      currentText = numMatch[2];
      continue;
    }

    // Bullet step: "- " or "• " at start
    const bulletMatch = line.match(/^[-•]\s+(.*)/);
    if (bulletMatch) {
      flush();
      counter++;
      currentNumber = counter;
      currentText = bulletMatch[1];
      continue;
    }

    // Empty line = separator
    if (line.trim() === '') {
      flush();
      continue;
    }

    // Continuation line — append to current step
    if (currentText) {
      currentText += ' ' + line.trim();
    } else {
      // Paragraph without a number
      flush();
      counter++;
      currentNumber = null;
      currentText = line.trim();
    }
  }

  flush();
  return steps;
}

// ─── STEP CARD ────────────────────────────────────────────────────────────────

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  const [done, setDone] = useState(false);
  const num = step.number ?? index + 1;

  return (
    <div className="flex gap-4">
      {/* Left: number + connector line */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
        <button
          onClick={() => setDone(d => !d)}
          className="flex items-center justify-center rounded-full font-bold text-sm transition-all shrink-0"
          style={{
            width: 36, height: 36,
            background: done ? '#256F3A' : '#FFF0F3',
            color: done ? '#fff' : '#FF385C',
            border: `2px solid ${done ? '#256F3A' : '#FF385C'}`,
          }}
          title="Als erledigt markieren"
        >
          {done ? <CheckCircle2 className="w-4 h-4" /> : num}
        </button>
        {index < total - 1 && (
          <div className="flex-1 w-0.5 my-1" style={{ background: done ? '#A3D9A5' : '#D0E8FF', minHeight: 16 }} />
        )}
      </div>

      {/* Right: content */}
      <div
        className="flex-1 pb-5 leading-relaxed text-sm transition-all"
        style={{ color: done ? '#89919A' : '#32363A', textDecoration: done ? 'line-through' : 'none' }}
      >
        {step.text}
      </div>
    </div>
  );
}

// ─── DETAIL PAGE ──────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id!).then(r => r.data),
  });
  const { data: versions = [] } = useQuery({
    queryKey: ['recipe-versions', id],
    queryFn: () => recipesApi.versions(id!).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-[#6A6D70] text-sm">Laden…</div>
  );
  if (!recipe) return null;

  const totalMaterial = recipe.components?.reduce(
    (sum: number, c: any) => sum + Number(c.quantity) * Number(c.ingredient?.unitCost || 0), 0
  ) || 0;
  const totalCost = totalMaterial + Number(recipe.laborCost) + Number(recipe.overheadCost);

  const steps = parseSteps(recipe.notes ?? '');
  const labourMin = Number(recipe.labourTimeMinutes ?? 0);
  const bakingMin = Number(recipe.bakingTimeMinutes ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/recipes')} className="btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#32363A] truncate">{recipe.name}</h1>
          <p className="text-[#6A6D70] text-sm">{recipe.code} · Version {recipe.version}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${recipe.isActive ? 'bg-[#F1FAF5] text-[#256F3A] border border-[#A3D9A5]' : 'bg-[#F0F0F0] text-[#89919A]'}`}>
          {recipe.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Package className="w-4 h-4" />, label: 'Menge', value: `${recipe.yield} ${recipe.yieldUnit}` },
          { icon: <ChefHat className="w-4 h-4" />, label: 'Arbeitszeit', value: labourMin > 0 ? `${labourMin} min` : '—' },
          { icon: <FlameKindling className="w-4 h-4" />, label: 'Backzeit', value: bakingMin > 0 ? `${bakingMin} min` : '—' },
          { icon: <Euro className="w-4 h-4" />, label: 'Materialkosten', value: formatCurrency(totalMaterial) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="card flex items-center gap-3 py-3">
            <div className="p-2 rounded-lg bg-[#FFF0F3] text-[#FF385C]">{icon}</div>
            <div>
              <p className="text-xs text-[#6A6D70]">{label}</p>
              <p className="text-sm font-semibold text-[#32363A]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: procedure + ingredients */}
        <div className="lg:col-span-2 space-y-6">

          {/* Zubereitungsanleitung */}
          <div className="card">
            <h2 className="font-semibold text-[#32363A] mb-1">Zubereitungsanleitung</h2>
            {recipe.description && (
              <p className="text-sm text-[#6A6D70] mb-4">{recipe.description}</p>
            )}

            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <ChefHat className="w-8 h-8 text-[#EDEFF0]" />
                <p className="text-sm text-[#89919A]">Noch keine Anleitung hinterlegt.</p>
                <p className="text-xs text-[#89919A]">Rezept bearbeiten → Zubereitungsanleitung ausfüllen.</p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#6A6D70]">{steps.length} Schritte · auf Schritt klicken zum Abhaken</span>
                  {(labourMin + bakingMin) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#6A6D70]">
                      <Clock className="w-3 h-3" />
                      Gesamt: {labourMin + bakingMin} min
                    </span>
                  )}
                </div>
                <div>
                  {steps.map((step, i) => (
                    <StepCard key={i} step={step} index={i} total={steps.length} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ingredients table */}
          <div className="card">
            <h2 className="font-semibold text-[#32363A] mb-4">
              Zutaten
              <span className="ml-2 text-xs font-normal text-[#6A6D70]">({recipe.components?.length ?? 0} Positionen)</span>
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#F0F4FF', borderBottom: '2px solid #D9D9D9' }}>
                  <th className="text-left py-2 px-3 font-semibold text-[#32363A]">Zutat</th>
                  <th className="text-right py-2 px-3 font-semibold text-[#32363A]">Menge</th>
                  <th className="text-right py-2 px-3 font-semibold text-[#32363A]">Einheit</th>
                  <th className="text-right py-2 px-3 font-semibold text-[#32363A]">€/Einheit</th>
                  <th className="text-right py-2 px-3 font-semibold text-[#32363A]">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {recipe.components?.map((c: any, i: number) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #EDEFF0' }}>
                    <td className="py-2 px-3 font-medium text-[#32363A]">{c.ingredient?.name}</td>
                    <td className="py-2 px-3 text-right text-[#6A6D70]">{Number(c.quantity).toFixed(4)}</td>
                    <td className="py-2 px-3 text-right text-[#6A6D70]">{c.ingredient?.unit}</td>
                    <td className="py-2 px-3 text-right text-[#6A6D70]">{formatCurrency(Number(c.ingredient?.unitCost), 4)}</td>
                    <td className="py-2 px-3 text-right font-medium text-[#32363A]">
                      {formatCurrency(Number(c.quantity) * Number(c.ingredient?.unitCost), 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#E8F5E9', borderTop: '2px solid #A3D9A5' }}>
                  <td className="py-2 px-3 font-semibold text-[#256F3A]" colSpan={4}>Rohmaterialkosten gesamt</td>
                  <td className="py-2 px-3 text-right font-bold text-[#256F3A]">{formatCurrency(totalMaterial, 4)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right column: cost + versions */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-[#32363A] mb-4">Kostenkalkulation</h2>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Rohmaterial',  value: totalMaterial,               color: undefined },
                { label: 'Lohnkosten',   value: Number(recipe.laborCost),    color: undefined },
                { label: 'Gemeinkosten', value: Number(recipe.overheadCost), color: undefined },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1 border-b border-[#F5F6F7]">
                  <span className="text-[#6A6D70]">{label}</span>
                  <span className="font-medium text-[#32363A]">{formatCurrency(value, 4)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold">
                <span className="text-[#32363A]">Gesamtkosten / Charge</span>
                <span className="text-[#FF385C]">{formatCurrency(totalCost, 4)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#6A6D70] pt-1">
                <span>Kosten pro Stück</span>
                <span className="font-medium">{formatCurrency(totalCost / Number(recipe.yield), 4)}</span>
              </div>
            </div>
          </div>

          {/* Time overview */}
          {(labourMin > 0 || bakingMin > 0) && (
            <div className="card">
              <h2 className="font-semibold text-[#32363A] mb-3">Zeitplan</h2>
              <div className="space-y-3 text-sm">
                {labourMin > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-[#FFF0F3] text-[#FF385C]"><ChefHat className="w-3.5 h-3.5" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#6A6D70]">Arbeitszeit</span>
                        <span className="font-medium text-[#32363A]">{labourMin} min</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
                        <div className="h-full rounded-full" style={{ width: `${(labourMin / (labourMin + bakingMin)) * 100}%`, background: '#FF385C' }} />
                      </div>
                    </div>
                  </div>
                )}
                {bakingMin > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-[#FFF4E5] text-[#E76500]"><FlameKindling className="w-3.5 h-3.5" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#6A6D70]">Backzeit</span>
                        <span className="font-medium text-[#32363A]">{bakingMin} min</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EDEFF0' }}>
                        <div className="h-full rounded-full" style={{ width: `${(bakingMin / (labourMin + bakingMin)) * 100}%`, background: '#E76500' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-[#EDEFF0] text-xs font-medium">
                  <span className="text-[#6A6D70]">Gesamtzeit</span>
                  <span className="text-[#32363A]">{labourMin + bakingMin} min</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="font-semibold text-[#32363A] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#89919A]" /> Versionshistorie
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {versions.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-[#EDEFF0]">
                  <div>
                    <span className="text-sm font-medium text-[#32363A]">v{v.version}</span>
                    {v.changeNotes && <p className="text-xs text-[#6A6D70]">{v.changeNotes}</p>}
                  </div>
                  <span className="text-xs text-[#89919A]">{format(new Date(v.createdAt), 'dd.MM.yyyy')}</span>
                </div>
              ))}
              {versions.length === 0 && <p className="text-sm text-[#89919A]">Keine Versionshistorie</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
