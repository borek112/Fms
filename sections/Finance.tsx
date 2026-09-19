import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { useFarm } from '@/store/FarmContext';
import { Card, fmtNum, fmtPLN, SectionTitle } from '@/components/common';

const PRICES: Record<string, number> = { 'Pszenica ozima': 850, 'Rzepak ozimy': 1950, 'Kukurydza': 720, 'Burak cukrowy': 180, 'Jęczmień ozimy': 700, 'Soja': 2100, 'Marchew': 650, 'Lucerna': 400, 'Pszenżyto': 760, 'Ziemniak': 700, 'Pietruszka': 900, 'Żyto': 640 };
const PIE_COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#fb7185', '#84cc16', '#94a3b8'];

export default function Finance() {
  const { state } = useFarm();
  const [whatIf, setWhatIf] = useState({ price: 0, fuel: 0, fert: 0, yield: 0 }); // % zmian

  const perField = useMemo(() => {
    return state.fields.map((f) => {
      const fc = state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
      const costs = state.treatments.filter((t) => t.fieldId === f.id && t.season === 2026).reduce((a, t) => a + t.cost, 0) + f.area * 900;
      const revenue = fc ? fc.plannedYield * f.area * (PRICES[fc.cropName] || 700) : 0;
      return { f, fc, costs, revenue, profit: revenue - costs, costHa: costs / f.area, marginHa: (revenue - costs) / f.area, roi: costs > 0 ? ((revenue - costs) / costs) * 100 : 0 };
    }).sort((a, b) => b.marginHa - a.marginHa);
  }, [state]);

  const totals = useMemo(() => {
    const costs = perField.reduce((a, x) => a + x.costs, 0);
    const revenue = perField.reduce((a, x) => a + x.revenue, 0);
    return { costs, revenue, profit: revenue - costs };
  }, [perField]);

  const whatIfResult = useMemo(() => {
    const rev = totals.revenue * (1 + whatIf.price / 100) * (1 + whatIf.yield / 100);
    const fuelCost = 62000 * (1 + whatIf.fuel / 100);
    const fertCost = 210000 * (1 + whatIf.fert / 100);
    const other = totals.costs - 62000 - 210000;
    const costs = fuelCost + fertCost + other;
    return { rev, costs, profit: rev - costs };
  }, [totals, whatIf]);

  const costStructure = [
    { name: 'Nawozy', value: 210000 }, { name: 'ŚOR', value: 118000 }, { name: 'Nasiona', value: 86000 },
    { name: 'Paliwo', value: 62000 }, { name: 'Usługi', value: 54000 }, { name: 'Amortyzacja', value: 148000 },
    { name: 'Praca', value: 72000 }, { name: 'Inne', value: 62000 },
  ];
  const fuelTrend = [
    { m: 'Mar', l: 980 }, { m: 'Kwi', l: 2350 }, { m: 'Maj', l: 1890 }, { m: 'Cze', l: 1420 }, { m: 'Lip', l: 3100 }, { m: 'Sie', l: 1650 },
  ];
  const yieldChart = useMemo(() => {
    const m = new Map<string, { s2025: number[]; s2026: number[] }>();
    state.cropHistory.filter((h) => h.season === 2025).forEach((h) => {
      const e = m.get(h.crop) || { s2025: [], s2026: [] }; e.s2025.push(h.yield); m.set(h.crop, e);
    });
    state.fieldCrops.filter((c) => c.season === 2026).forEach((c) => {
      const e = m.get(c.cropName) || { s2025: [], s2026: [] }; e.s2026.push(c.plannedYield); m.set(c.cropName, e);
    });
    return [...m.entries()].slice(0, 8).map(([crop, v]) => ({
      crop,
      '2025': v.s2025.length ? Math.round((v.s2025.reduce((a, b) => a + b, 0) / v.s2025.length) * 10) / 10 : 0,
      '2026 (plan)': v.s2026.length ? Math.round((v.s2026.reduce((a, b) => a + b, 0) / v.s2026.length) * 10) / 10 : 0,
    }));
  }, [state]);

  return (
    <div className="space-y-4">
      <SectionTitle title="💰 Finanse i Rentowność" sub="Ekonomia każdego pola, ranking rentowności i symulator scenariuszy" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="!p-3"><div className="text-xs text-slate-400">Koszty sezonu 2026</div><div className="text-2xl font-bold text-red-400 mt-1">{fmtPLN(totals.costs)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-slate-400">Przychody (prognoza)</div><div className="text-2xl font-bold text-emerald-400 mt-1">{fmtPLN(totals.revenue)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-slate-400">Prognozowany zysk</div><div className={`text-2xl font-bold mt-1 ${totals.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPLN(totals.profit)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-slate-400">ROI gospodarstwa</div><div className="text-2xl font-bold text-sky-400 mt-1">{fmtNum((totals.profit / Math.max(totals.costs, 1)) * 100, 1)}%</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-semibold text-slate-100 mb-2">🏆 Najbardziej rentowne pola (marża/ha)</h4>
          <div className="space-y-2">
            {perField.map((x, i) => (
              <div key={x.f.id} className="flex items-center gap-3">
                <span className="w-6 text-slate-500 text-sm">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-100 truncate">{x.f.name} <span className="text-xs text-slate-500">· {x.fc?.cropName || '—'}</span></span>
                    <span className={x.marginHa >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{fmtPLN(x.marginHa)}/ha</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 mt-1">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, Math.min(100, (x.marginHa / Math.max(perField[0]?.marginHa || 1, 1)) * 100))}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-slate-100 mb-2">💸 Największe koszty (struktura)</h4>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={costStructure} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`} fontSize={11}>
                  {costStructure.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => fmtPLN(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-semibold text-slate-100 mb-2">⛽ Zużycie paliwa (litry/miesiąc)</h4>
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={fuelTrend}>
                <XAxis dataKey="m" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Line type="monotone" dataKey="l" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold text-slate-100 mb-2">🌾 Plon z hektara — 2025 vs 2026 (plan)</h4>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={yieldChart}>
                <XAxis dataKey="crop" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={55} /><YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => `${v} t/ha`} />
                <Legend />
                <Bar dataKey="2025" fill="#64748b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="2026 (plan)" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h4 className="font-semibold text-slate-100 mb-1">🔮 Symulator „Co jeśli?”</h4>
        <p className="text-xs text-slate-500 mb-4">Zmień parametry rynkowe — system przeliczy prognozowany zysk gospodarstwa.</p>
        <div className="grid sm:grid-cols-4 gap-4">
          {([['price', 'Cena płodów', '%'], ['yield', 'Plon', '%'], ['fuel', 'Cena paliwa', '%'], ['fert', 'Cena nawozów', '%']] as const).map(([k, label]) => (
            <div key={k}>
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span className="text-emerald-400 font-semibold">{whatIf[k] > 0 ? '+' : ''}{whatIf[k]}%</span></div>
              <input type="range" min={-30} max={30} value={whatIf[k]} onChange={(e) => setWhatIf({ ...whatIf, [k]: +e.target.value })} className="w-full accent-emerald-500" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 text-center">
            <div className="text-xs text-slate-400">Przychody</div>
            <div className="text-lg font-bold text-emerald-400">{fmtPLN(whatIfResult.rev)}</div>
            <div className="text-[11px] text-slate-500">{whatIfResult.rev - totals.revenue >= 0 ? '+' : ''}{fmtPLN(whatIfResult.rev - totals.revenue)}</div>
          </div>
          <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 text-center">
            <div className="text-xs text-slate-400">Koszty</div>
            <div className="text-lg font-bold text-red-400">{fmtPLN(whatIfResult.costs)}</div>
            <div className="text-[11px] text-slate-500">{whatIfResult.costs - totals.costs >= 0 ? '+' : ''}{fmtPLN(whatIfResult.costs - totals.costs)}</div>
          </div>
          <div className="rounded-lg bg-emerald-900/20 border border-emerald-600/40 p-3 text-center">
            <div className="text-xs text-slate-400">Prognozowany zysk</div>
            <div className={`text-lg font-bold ${whatIfResult.profit >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>{fmtPLN(whatIfResult.profit)}</div>
            <div className="text-[11px] text-slate-500">bazowo: {fmtPLN(totals.profit)}</div>
          </div>
        </div>
      </Card>

      <Card>
        <h4 className="font-semibold text-slate-100 mb-2">📋 Ekonomia pól — szczegóły</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
              <th className="py-2 pr-3">Pole</th><th className="pr-3">Uprawa</th><th className="pr-3 text-right">Koszt/ha</th><th className="pr-3 text-right">Koszt całk.</th><th className="pr-3 text-right">Przychód</th><th className="pr-3 text-right">Dochód</th><th className="text-right">ROI</th>
            </tr></thead>
            <tbody>
              {perField.map((x) => (
                <tr key={x.f.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 text-slate-100">{x.f.name}</td>
                  <td className="pr-3 text-slate-400">{x.fc?.cropName || '—'}</td>
                  <td className="pr-3 text-right text-slate-300">{fmtPLN(x.costHa)}</td>
                  <td className="pr-3 text-right text-slate-300">{fmtPLN(x.costs)}</td>
                  <td className="pr-3 text-right text-emerald-300">{fmtPLN(x.revenue)}</td>
                  <td className={`pr-3 text-right font-medium ${x.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPLN(x.profit)}</td>
                  <td className={`text-right ${x.roi >= 0 ? 'text-sky-400' : 'text-red-400'}`}>{fmtNum(x.roi, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
