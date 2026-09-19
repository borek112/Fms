import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, EmptyState, fmtDate, fmtNum, fmtPLN, SectionTitle, Select, ProgressBar } from '@/components/common';
import MapView from '@/components/MapView';
import type { Nav } from '@/App';

const PRICE_T: Record<string, number> = { 'Pszenica ozima': 850, 'Rzepak ozimy': 1950, 'Kukurydza': 720, 'Burak cukrowy': 180, 'Jęczmień ozimy': 700, 'Soja': 2100, 'Marchew': 650, 'Lucerna': 400, 'Pszenżyto': 760, 'Ziemniak': 700, 'Pietruszka': 900, 'Żyto': 640 };

function trend(prev?: number, cur?: number): { arrow: string; tone: string } {
  if (prev == null || cur == null) return { arrow: '→', tone: 'text-slate-400' };
  const d = cur - prev;
  const rel = prev !== 0 ? Math.abs(d / prev) : 0;
  if (rel < 0.03) return { arrow: '→', tone: 'text-slate-400' };
  return d > 0 ? { arrow: '↑', tone: 'text-emerald-400' } : { arrow: '↓', tone: 'text-red-400' };
}

export default function FieldProfile({ nav, focusId }: { nav: Nav; focusId?: string }) {
  const { state } = useFarm();
  const [fieldId, setFieldId] = useState(focusId || state.fields[0]?.id || '');
  const field = state.fields.find((f) => f.id === fieldId);

  const model = useMemo(() => {
    if (!field) return null;
    const fc = state.fieldCrops.find((c) => c.fieldId === field.id && c.season === 2026);
    const history = state.cropHistory.filter((h) => h.fieldId === field.id).sort((a, b) => a.season - b.season);
    const treatments = state.treatments.filter((t) => t.fieldId === field.id).sort((a, b) => b.date.localeCompare(a.date));
    const lease = (state.leases || []).find((l) => l.fieldId === field.id);
    const costs2026 = treatments.filter((t) => t.season === 2026).reduce((a, t) => a + t.cost, 0) + field.area * 900 + (lease ? lease.area * lease.pricePerHa : 0);
    const revenue2026 = fc ? fc.plannedYield * field.area * (PRICE_T[fc.cropName] || 700) : 0;

    // Osie czasu: historia (real) + bieżący plan
    const timeline = [
      ...history.map((h) => ({ season: h.season, crop: h.crop, yieldV: h.yield, costs: h.costs, revenue: h.revenue, live: false })),
    ];
    if (fc) timeline.push({ season: 2026, crop: fc.cropName, yieldV: fc.plannedYield, costs: costs2026, revenue: revenue2026, live: true });

    const y = timeline.map((t) => t.yieldV);
    const costHaArr = timeline.map((t) => (t.costs && field.area ? t.costs / field.area : undefined));
    const marginHaArr = timeline.map((t) => ((t.revenue - t.costs) / field.area));
    const n = timeline.length;
    return {
      fc, history, treatments, lease, timeline,
      costs2026, revenue2026, marginHa2026: (revenue2026 - costs2026) / field.area,
      trends: {
        yield: trend(y[n - 2], y[n - 1]),
        costHa: trend(costHaArr[n - 2], costHaArr[n - 1]),
        margin: trend(marginHaArr[n - 2], marginHaArr[n - 1]),
      },
    };
  }, [field, state]);

  return (
    <div className="space-y-4" data-testid="field-profile">
      <SectionTitle title="🌾 Cyfrowy Bliźniak Pola" sub="Digital Field Profile — pełny profil, historia i trendy pola na podstawie realnych danych FMS" />

      <Card className="!p-3">
        <div className="max-w-md">
          <Select label="Wybierz pole" value={fieldId} onChange={(e) => setFieldId(e.target.value)} data-testid="profile-field-select">
            {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtNum(f.area)} ha)</option>)}
          </Select>
        </div>
      </Card>

      {!field && <Card><EmptyState icon="🌾" text="To gospodarstwo nie ma jeszcze pól. Dodaj pole w module GIS." action={<Btn onClick={() => nav.go('gis')}>Otwórz GIS →</Btn>} /></Card>}

      {field && model && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <h3 className="font-semibold text-slate-100 mb-2">🗺️ Geometria i lokalizacja</h3>
              <MapView fields={[field]} colorFor={() => '#10b981'} labelFor={() => model.fc?.cropName || 'bez uprawy'} selectedId={field.id} height="300px" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                <Cell label="Powierzchnia" value={`${fmtNum(field.area)} ha`} />
                <Cell label="Działka" value={field.parcelNo} />
                <Cell label="Obręb" value={field.district} />
                <Cell label="Status" value={model.lease ? 'dzierżawa' : 'własne'} tone={model.lease ? 'warn' : 'ok'} />
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-100 mb-2">🧪 Profil glebowy</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Cell label="Typ gleby" value={field.soilType} />
                <Cell label="pH" value={String(field.pH)} tone={field.pH < 5.8 ? 'warn' : 'default'} />
                <Cell label="Fosfor (P)" value={field.P} tone={field.P.includes('niska') ? 'warn' : 'default'} />
                <Cell label="Potas (K)" value={field.K} tone={field.K.includes('niska') ? 'warn' : 'default'} />
                <Cell label="Magnez (Mg)" value={field.Mg} tone={field.Mg.includes('niska') ? 'warn' : 'default'} />
                <Cell label="Uprawa 2026" value={model.fc ? model.fc.cropName : '—'} />
              </div>
              {model.lease && (
                <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/15 p-2.5 text-xs text-amber-200">
                  📑 Dzierżawa: {model.lease.landlord} · {fmtPLN(model.lease.pricePerHa)}/ha/rok · do {fmtDate(model.lease.endDate)}
                  <Btn variant="ghost" className="!py-1 !px-2 text-[11px] mt-2" onClick={() => nav.go('dzierzawy')}>Szczegóły dzierżawy →</Btn>
                </div>
              )}
            </Card>
          </div>

          {/* TRENDY POLOWE */}
          <Card>
            <h3 className="font-semibold text-slate-100 mb-3">📈 Trend polowy <span className="text-xs font-normal text-slate-500">(z historii pola — porównanie ostatnich sezonów)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TrendBox label="Plon" arrow={model.trends.yield.arrow} tone={model.trends.yield.tone} value={model.fc ? `${fmtNum(model.fc.plannedYield)} t/ha` : '—'} />
              <TrendBox label="Koszt/ha" arrow={model.trends.costHa.arrow} tone={model.trends.costHa.arrow === '↑' ? 'text-red-400' : model.trends.costHa.arrow === '↓' ? 'text-emerald-400' : 'text-slate-400'} value={fmtPLN(model.costs2026 / field.area)} />
              <TrendBox label="Marża/ha" arrow={model.trends.margin.arrow} tone={model.trends.margin.tone} value={fmtPLN(model.marginHa2026)} />
              <TrendBox label="NDVI (teledetekcja)" arrow="→" tone="text-slate-400" value="brak danych" note="Sentinel-2 przygotowane do integracji" />
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* OS CZASU */}
            <Card>
              <h3 className="font-semibold text-slate-100 mb-3">🕘 Historia pola — oś czasu</h3>
              {model.timeline.length === 0 && <EmptyState icon="🕘" text="Brak historii — przypisz uprawę w GIS." />}
              <div className="space-y-2">
                {[...model.timeline].reverse().map((y) => (
                  <div key={y.season} className={`rounded-lg border p-3 ${y.live ? 'border-emerald-500/60 bg-emerald-900/10' : 'border-slate-700/60 bg-slate-900/40'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-100">{y.season} · 🌱 {y.crop}</span>
                      {y.live && <Badge tone="ok">plan 2026</Badge>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-slate-400">
                      <span>Plon: <b className="text-slate-200">{y.yieldV ? `${fmtNum(y.yieldV)} t/ha` : '—'}</b></span>
                      <span>Koszty: <b className="text-slate-200">{fmtPLN(y.costs)}</b></span>
                      <span>Przychód: <b className="text-slate-200">{fmtPLN(y.revenue)}</b></span>
                      <span>Wynik: <b className={y.revenue - y.costs >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPLN(y.revenue - y.costs)}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* PLONY */}
            <Card>
              <h3 className="font-semibold text-slate-100 mb-3">🌾 Plony wg sezonów</h3>
              {model.timeline.length === 0 ? <EmptyState icon="🌾" text="Brak danych o plonach." /> : (
                <div className="space-y-2">
                  {[...model.timeline].reverse().map((y) => (
                    <div key={y.season} className="flex items-center gap-3">
                      <span className="w-12 text-sm text-slate-400">{y.season}</span>
                      <div className="flex-1"><ProgressBar value={y.yieldV || 0} max={Math.max(...model.timeline.map((t) => t.yieldV || 0), 1)} tone={y.live ? 'warn' : 'ok'} /></div>
                      <span className="w-24 text-right text-sm text-slate-200">{y.yieldV ? `${fmtNum(y.yieldV)} t/ha` : '—'}{y.live ? ' (plan)' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-slate-700/40 pt-3">
                <div className="text-sm text-slate-300 mb-2">Ostatnie zabiegi ({model.treatments.length})</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {model.treatments.slice(0, 6).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 w-20">{fmtDate(t.date)}</span>
                      <Badge tone={t.type === 'oprysk' ? 'warn' : t.type === 'zbiór' ? 'ok' : 'info'}>{t.type}</Badge>
                      <span className="text-slate-300 truncate">{t.productName || t.notes || '—'}</span>
                      <span className="ml-auto text-slate-400">{fmtPLN(t.cost)}</span>
                    </div>
                  ))}
                  {model.treatments.length === 0 && <p className="text-xs text-slate-500">Brak zabiegów.</p>}
                </div>
                <Btn variant="ghost" className="!py-1.5 text-xs mt-2" onClick={() => nav.go('dziennik')}>Otwórz Dziennik Polowy →</Btn>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn' | 'bad' }) {
  const c: Record<string, string> = { default: 'text-slate-100', ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' };
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${c[tone]}`}>{value}</div>
    </div>
  );
}

function TrendBox({ label, arrow, tone, value, note }: { label: string; arrow: string; tone: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="text-[11px] text-slate-500 uppercase">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-bold text-slate-100">{value}</span>
        <span className={`text-xl font-black ${tone}`}>{arrow}</span>
      </div>
      {note && <div className="text-[10px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}
