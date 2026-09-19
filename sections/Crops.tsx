import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { CROP_CATALOG } from '@/data/demo';
import { Badge, Btn, Card, fmtNum , SectionTitle } from '@/components/common';
import type { Nav } from '@/App';

const BBCH_STAGES = [
  { range: '00–09', name: 'Kiełkowanie' }, { range: '10–19', name: 'Wschody / liście' },
  { range: '20–29', name: 'Krzewienie' }, { range: '30–39', name: 'Strzelanie w źdźbło' },
  { range: '40–49', name: 'Młoszenie' }, { range: '50–59', name: 'Wykłaszanie / pąki' },
  { range: '60–69', name: 'Kwitnienie' }, { range: '70–79', name: 'Rozwój owoców/ziarna' },
  { range: '80–89', name: 'Dojrzewanie' }, { range: '90–99', name: 'Dojrzałość zbiorcza' },
];

export default function Crops({ nav }: { nav: Nav }) {
  const { state } = useFarm();
  const [tab, setTab] = useState<'baza' | 'bbch' | 'plodozmian'>('baza');
  const [catFilter, setCatFilter] = useState('wszystkie');
  const cats = ['wszystkie', ...new Set(CROP_CATALOG.map((c) => c.category))];

  return (
    <div className="space-y-4">
      <SectionTitle title="🌱 Uprawy i Płodozmian" sub="Baza upraw, skala BBCH i planer rotacji" />
      <div className="flex gap-1 border-b border-slate-700/50 pb-1">
        {[['baza', '📚 Baza upraw'], ['bbch', '📏 Skala BBCH'], ['plodozmian', '🔄 Planer płodozmianu']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)} className={`px-3 py-2 text-sm rounded-t-lg ${tab === k ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {tab === 'baza' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1 rounded-full text-xs border ${catFilter === c ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{c}</button>)}
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {CROP_CATALOG.filter((c) => catFilter === 'wszystkie' || c.category === catFilter).map((c) => {
              const onFields = state.fieldCrops.filter((fc) => fc.cropName === c.name && fc.season === 2026);
              const area = onFields.reduce((a, fc) => a + (state.fields.find((f) => f.id === fc.fieldId)?.area || 0), 0);
              return (
                <Card key={c.name} className="hover:border-slate-500 transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-slate-100">{c.name}</h4>
                    <Badge tone="muted">{c.category}</Badge>
                  </div>
                  {area > 0 && <div className="text-xs text-emerald-400 mt-1">● {fmtNum(area)} ha na {onFields.length} {onFields.length === 1 ? 'polu' : 'polach'} (2026)</div>}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                    <Row k="Termin siewu" v={c.sowingWindow} />
                    <Row k="Norma siewu" v={c.seedRate} />
                    <Row k="MTZ" v={`${c.mtz} g`} />
                    <Row k="Obsada" v={c.density} />
                    <Row k="Potencjał plonu" v={`${c.potentialYield} t/ha`} />
                    <Row k="Koszt produkcji" v={`${c.productionCost} zł/ha`} />
                  </div>
                  <div className="text-xs text-slate-400 mt-2">🧪 {c.fertReq}</div>
                  {area > 0 && <Btn variant="ghost" className="w-full mt-3 !py-1.5 text-xs" onClick={() => nav.go('gis', onFields[0].fieldId)}>Zobacz pola →</Btn>}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === 'bbch' && (
        <Card>
          <h4 className="font-semibold text-slate-100 mb-4">📏 Wizualna oś BBCH — aktualne fazy upraw (2026)</h4>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 mb-6">
            {BBCH_STAGES.map((s, i) => (
              <div key={s.range} className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-2 text-center">
                <div className="text-[10px] text-emerald-400 font-mono">{s.range}</div>
                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{s.name}</div>
                <div className="text-lg">{['🌰', '🌱', '🌿', '🌾', '🌾', '🌼', '🌸', '🫛', '🌾', '🧺'][i]}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {state.fieldCrops.filter((fc) => fc.season === 2026).map((fc) => {
              const f = state.fields.find((x) => x.id === fc.fieldId);
              const pct = Math.min(100, (fc.bbch / 99) * 100);
              return (
                <div key={fc.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200">{f?.name} — {fc.cropName} ({fc.variety})</span>
                    <span className="text-emerald-400 font-mono">BBCH {fc.bbch}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800 relative">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400" style={{ width: `${pct}%` }} />
                    <div className="absolute -top-1 w-0.5 h-4 bg-amber-400 rounded" style={{ left: `calc(${pct}% - 1px)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'plodozmian' && <RotationPlanner />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-slate-200 text-right">{v}</span></div>;
}

function RotationPlanner() {
  const { state } = useFarm();
  const analysis = useMemo(() => {
    const legumes = ['Soja', 'Groch', 'Łubin', 'Lucerna'];
    const cereals = ['Pszenica ozima', 'Pszenica jara', 'Jęczmień ozimy', 'Żyto', 'Pszenżyto', 'Kukurydza'];
    return state.fields.map((f) => {
      const h2024 = state.cropHistory.find((h) => h.fieldId === f.id && h.season === 2024)?.crop;
      const h2025 = state.cropHistory.find((h) => h.fieldId === f.id && h.season === 2025)?.crop;
      const now = state.fieldCrops.find((fc) => fc.fieldId === f.id && fc.season === 2026)?.cropName;
      const issues: { msg: string; tone: 'bad' | 'warn' }[] = [];
      if (h2025 === now) issues.push({ msg: `Zbyt częste następstwo: ${now} po ${h2025}`, tone: 'bad' });
      if (cereals.includes(now || '') && cereals.includes(h2025 || '') && cereals.includes(h2024 || '')) issues.push({ msg: 'Monokultura zbożowa 3. rok z rzędu — ryzyko chorób płodozmianowych i zmęczenia gleby', tone: 'bad' });
      if (h2025 === 'Rzepak ozimy' && cereals.includes(now || '')) issues.push({ msg: 'Ryzyko samosiewów rzepaku w zbożu', tone: 'warn' });
      if ((now === 'Burak cukrowy' || now === 'Ziemniak') && (h2024 === now || h2025 === now)) issues.push({ msg: 'Zbyt krótka przerwa dla okopowych (min. 3–4 lata)', tone: 'bad' });
      if (cereals.includes(now || '') && f.pH < 5.8) issues.push({ msg: 'Niskie pH ogranicza plonowanie zbóż — rozważ wapnowanie', tone: 'warn' });
      const suggestions: string[] = [];
      if (cereals.includes(now || '') && cereals.includes(h2025 || '')) suggestions.push(...legumes.slice(0, 2));
      if (now === 'Rzepak ozimy' || h2025 === 'Rzepak ozimy') suggestions.push('Pszenica ozima');
      if (suggestions.length === 0 && cereals.includes(now || '')) suggestions.push('Groch');
      return { field: f, h2024, h2025, now, issues, suggestions: [...new Set(suggestions)].slice(0, 2) };
    });
  }, [state]);

  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-1">🔄 Planer płodozmianu — sezony 2024–2026</h4>
      <p className="text-xs text-slate-500 mb-4">System wykrywa zbyt częste następstwo, choroby płodozmianowe, zmęczenie gleby, ryzyko samosiewów i proponuje alternatywy.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
              <th className="py-2 pr-3">Pole</th><th className="pr-3">2024</th><th className="pr-3">2025</th><th className="pr-3">2026</th><th>Ocena i rekomendacje</th>
            </tr>
          </thead>
          <tbody>
            {analysis.map((a) => (
              <tr key={a.field.id} className="border-b border-slate-800/60 align-top">
                <td className="py-2.5 pr-3 font-medium text-slate-100 whitespace-nowrap">{a.field.name}<div className="text-xs text-slate-500 font-normal">{fmtNum(a.field.area)} ha</div></td>
                <td className="pr-3 text-slate-300">{a.h2024}</td>
                <td className="pr-3 text-slate-300">{a.h2025}</td>
                <td className="pr-3 text-emerald-300 font-medium">{a.now}</td>
                <td className="py-2.5">
                  {a.issues.length === 0 ? <Badge tone="ok">✓ prawidłowa rotacja</Badge> : (
                    <div className="space-y-1">
                      {a.issues.map((i, x) => <div key={x} className="text-xs"><Badge tone={i.tone}>{i.tone === 'bad' ? '🔴' : '🟡'}</Badge> <span className="text-slate-300">{i.msg}</span></div>)}
                    </div>
                  )}
                  {a.suggestions.length > 0 && <div className="text-xs text-slate-400 mt-1">💡 Alternatywa na 2027: <span className="text-sky-300">{a.suggestions.join(' lub ')}</span></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
