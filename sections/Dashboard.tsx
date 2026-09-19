import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useFarm } from '@/store/FarmContext';
import { useWeather, centroid } from '@/hooks/useWeather';
import DecisionCenter from '@/components/DecisionCenter';
import { Badge, Btn, Card, fmtNum, fmtPLN, Kpi } from '@/components/common';
import MapView from '@/components/MapView';
import type { Nav } from '@/App';

const CROP_COLORS: Record<string, string> = { 'Pszenica ozima': '#f59e0b', 'Rzepak ozimy': '#facc15', 'Kukurydza': '#84cc16', 'Burak cukrowy': '#f472b6', 'Jęczmień ozimy': '#fb923c', 'Soja': '#4ade80', 'Marchew': '#fb7185', 'Lucerna': '#34d399', 'Pszenżyto': '#a78bfa', 'Ziemniak': '#c084fc', 'Pietruszka': '#2dd4bf', 'Żyto': '#94a3b8' };

export function MiniMap({ onFieldClick }: { onFieldClick?: (id: string) => void }) {
  const { state } = useFarm();
  return (
    <MapView
      fields={state.fields}
      colorFor={(f) => CROP_COLORS[state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026)?.cropName || ''] || '#64748b'}
      labelFor={(f) => state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026)?.cropName || 'bez uprawy'}
      onSelect={onFieldClick}
      height="260px"
    />
  );
}

export default function Dashboard({ nav }: { nav: Nav }) {
  const { state, updateTask, notify } = useFarm();
  const [postpone, setPostpone] = useState<string | null>(null);
  const today = '2026-08-06';
  const coord = useMemo(() => centroid(state.fields), [state.fields]);
  const wx = useWeather(coord[0], coord[1]);
  const w = wx.today;

  const data = useMemo(() => {
    const area = state.fields.reduce((a, f) => a + f.area, 0);
    const crops2026 = state.fieldCrops.filter((c) => c.season === 2026);
    const whValue = state.warehouse.reduce((a, x) => a + x.stock * x.price, 0);
    const fuel = state.fuelTanks.reduce((a, t) => a + t.current, 0);
    const fuelCap = state.fuelTanks.reduce((a, t) => a + t.capacity, 0);
    const leaseCost = (state.leases || []).reduce((a, l) => a + l.area * l.pricePerHa, 0);
    let plannedYieldT = 0, revenue = 0;
    const priceT: Record<string, number> = { 'Pszenica ozima': 850, 'Rzepak ozimy': 1950, 'Kukurydza': 720, 'Burak cukrowy': 180, 'Jęczmień ozimy': 700, 'Soja': 2100, 'Marchew': 650, 'Lucerna': 400, 'Pszenżyto': 760, 'Ziemniak': 700, 'Pietruszka': 900, 'Żyto': 640 };
    crops2026.forEach((c) => {
      const f = state.fields.find((x) => x.id === c.fieldId);
      if (f) { plannedYieldT += c.plannedYield * f.area; revenue += c.plannedYield * f.area * (priceT[c.cropName] || 700); }
    });
    const costs = state.treatments.filter((t) => t.season === 2026).reduce((a, t) => a + t.cost, 0) + area * 900 + leaseCost;
    const costHa = area > 0 ? costs / area : 0;
    const profit = revenue - costs;
    return { area, fields: state.fields.length, crops: new Set(crops2026.map((c) => c.cropName)).size, whValue, fuel, fuelCap, plannedYieldT, revenue, costHa, marginHa: area > 0 ? profit / area : 0, profit, leaseCost, leaseArea: (state.leases || []).reduce((a, l) => a + l.area, 0) };
  }, [state]);

  const todaysTasks = state.tasks.filter((t) => t.status !== 'wykonane').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8);
  const unreadAlerts = state.alerts.filter((a) => !a.read && !a.snoozed).slice(0, 6);

  const chartProfit = [
    { miesiąc: 'Mar', koszty: 128000, przychody: 0 },
    { miesiąc: 'Kwi', koszty: 310000, przychody: 0 },
    { miesiąc: 'Maj', koszty: 465000, przychody: 0 },
    { miesiąc: 'Cze', koszty: 545000, przychody: 0 },
    { miesiąc: 'Lip', koszty: 690000, przychody: 420000 },
    { miesiąc: 'Sie', koszty: 735000, przychody: 880000 },
    { miesiąc: 'Prognoza', koszty: 812000, przychody: Math.round(data.revenue) },
  ];
  const chartCostByCrop = useMemo(() => {
    const m = new Map<string, number>();
    state.treatments.filter((t) => t.season === 2026).forEach((t) => m.set(t.crop, (m.get(t.crop) || 0) + t.cost));
    return [...m.entries()].map(([uprawa, koszt]) => ({ uprawa, koszt: Math.round(koszt) })).sort((a, b) => b.koszt - a.koszt).slice(0, 8);
  }, [state]);

  const prioTone: Record<string, 'ok' | 'warn' | 'bad' | 'info'> = { niski: 'info', 'średni': 'ok', wysoki: 'warn', krytyczny: 'bad' };
  const alTone: Record<string, 'ok' | 'warn' | 'bad' | 'info'> = { info: 'info', 'ostrzeżenie': 'warn', krytyczne: 'bad' };

  return (
    <div className="space-y-4" data-testid="dashboard">
      {/* Nagłówek gospodarstwa */}
      <Card className="bg-gradient-to-r from-emerald-900/40 to-slate-800/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">🏡 {state.farms.find((f) => f.id === state.activeFarmId)?.name}</h1>
            <p className="text-sm text-slate-400">Środa, 6 sierpnia 2026 · sezon 2026</p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div className="text-4xl">{w.icon}</div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{w.temp}°C</div>
              <div className="text-xs text-slate-400">{w.desc} <Badge tone={wx.source === 'live' ? 'ok' : 'info'}>{wx.source === 'live' ? 'LIVE' : 'DEMO'}</Badge></div>
            </div>
            <div className="hidden sm:block text-xs text-slate-400 space-y-1">
              <div>💧 Wilgotność: {w.humidity}%</div>
              <div>🌬️ Wiatr: {w.wind} m/s</div>
              <div>🌧️ Opady: {w.rain} mm</div>
            </div>
            <Badge tone="ok">Gospodarstwo aktywne</Badge>
          </div>
        </div>
      </Card>

      {/* SZYBKI START — Praca w Polu */}
      <button
        data-testid="quickstart-fieldpilot"
        onClick={() => nav.go('polowa')}
        className="w-full text-left rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-800/40 to-sky-900/30 p-4 hover:border-emerald-400 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚜</span>
            <div>
              <div className="font-black text-emerald-300">FMS FIELD PILOT · PRACA W POLU</div>
              <div className="text-xs text-slate-400">Profesjonalna nawigacja GNSS — linie AB, lightbar, pokrycie</div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">ROZPOCZNIJ NAWIGACJĘ →</span>
        </div>
      </button>

      {/* CENTRUM DECYZYJNE */}
      <DecisionCenter nav={nav} />

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Areał całkowity" value={`${fmtNum(data.area)} ha`} icon="🗺️" />
        <Kpi label="Pola" value={String(data.fields)} icon="🟩" sub={`${data.crops} upraw w sezonie`} />
        <Kpi label="Dzierżawy" value={`${fmtNum(data.leaseArea)} ha`} icon="📑" tone="info" sub={`${fmtPLN(data.leaseCost)}/rok`} />
        <Kpi label="Wartość magazynu" value={fmtPLN(data.whValue)} icon="📦" tone="info" />
        <Kpi label="Paliwo" value={`${fmtNum(data.fuel / 1000)} tys. l`} icon="⛽" tone={data.fuel / data.fuelCap < 0.35 ? 'warn' : 'default'} sub={`${Math.round((data.fuel / data.fuelCap) * 100)}% pojemności`} />
        <Kpi label="Przewidywany plon" value={`${fmtNum(data.plannedYieldT / 1000, 2)} tys. t`} icon="🌾" />
        <Kpi label="Przewidywany przychód" value={fmtPLN(data.revenue)} icon="💰" tone="ok" />
        <Kpi label="Koszt/ha" value={fmtPLN(data.costHa)} icon="📉" />
        <Kpi label="Marża/ha" value={fmtPLN(data.marginHa)} icon="📈" tone={data.marginHa > 0 ? 'ok' : 'bad'} />
        <Kpi label="Przewidywany zysk" value={fmtPLN(data.profit)} icon="🏦" tone={data.profit > 0 ? 'ok' : 'bad'} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Mapa */}
        <Card className="lg:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-100">Mapa gospodarstwa</h3>
            <Btn variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => nav.go('gis')}>Otwórz GIS →</Btn>
          </div>
          <MiniMap onFieldClick={(id) => nav.go('gis', id)} />
        </Card>

        {/* Zadania dnia */}
        <Card className="lg:col-span-5">
          <h3 className="font-semibold text-slate-100 mb-3">✅ Co należy zrobić dzisiaj?</h3>
          {todaysTasks.length === 0 && <p className="text-sm text-slate-400">Brak zadań — wszystko wykonane. 🎉</p>}
          <div className="space-y-2">
            {todaysTasks.map((t) => {
              const f = state.fields.find((x) => x.id === t.fieldId);
              const fc = f && state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
              const overdue = t.dueDate < today;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
                  <Badge tone={prioTone[t.priority]}>{t.priority}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-100 truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {overdue ? <span className="text-red-400">⚠ po terminie · </span> : null}
                      termin {t.dueDate.slice(5).split('-').reverse().join('.')} {f ? `· ${f.name}` : ''}{fc ? ` · ${fc.cropName}` : ''} · {t.status}
                    </div>
                  </div>
                  {postpone === t.id ? (
                    <input type="date" autoFocus defaultValue={t.dueDate} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                      onChange={(e) => { if (e.target.value) { updateTask({ ...t, dueDate: e.target.value }); notify('Zadanie przełożone'); } setPostpone(null); }} />
                  ) : (
                    <div className="flex gap-1.5">
                      <Btn className="!px-2.5 !py-1 text-xs" onClick={() => { updateTask({ ...t, status: 'wykonane' }); notify('Zadanie wykonane ✔'); }}>Wykonaj</Btn>
                      <Btn variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setPostpone(t.id)}>Przełóż</Btn>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Alerty */}
        <Card className="lg:col-span-3">
          <h3 className="font-semibold text-slate-100 mb-3">🔔 Najważniejsze alerty</h3>
          <div className="space-y-2">
            {unreadAlerts.map((a) => (
              <button key={a.id} onClick={() => nav.go('alerts')} className="w-full text-left rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5 hover:border-slate-500 transition-colors">
                <Badge tone={alTone[a.priority]}>{a.priority === 'krytyczne' ? '🔴' : a.priority === 'ostrzeżenie' ? '🟡' : '🟢'} {a.category}</Badge>
                <div className="text-xs text-slate-200 mt-1.5 leading-snug">{a.title}</div>
              </button>
            ))}
            {unreadAlerts.length === 0 && <p className="text-sm text-slate-400">Brak nowych alertów.</p>}
          </div>
        </Card>
      </div>

      {/* Wykresy */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-slate-100 mb-2">📊 Rentowność gospodarstwa — sezon 2026</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={chartProfit}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="miesiąc" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => fmtPLN(v)} />
                <Legend />
                <Area type="monotone" dataKey="przychody" stroke="#10b981" fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="koszty" stroke="#ef4444" fill="url(#gK)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-100 mb-2">💸 Koszt produkcji według upraw (sezon 2026)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={chartCostByCrop}>
                <XAxis dataKey="uprawa" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => fmtPLN(v)} />
                <Bar dataKey="koszt" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Dolny pas: pogoda / magazyn / maszyny / plony */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <h4 className="text-sm font-semibold text-slate-200 mb-2">🌦️ Prognoza {wx.source === 'live' ? '(Open-Meteo)' : '(DEMO)'}</h4>
          {wx.days.slice(0, 4).map((d) => (
            <div key={d.date} className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-700/40 last:border-0">
              <span>{d.icon} {d.date.slice(5).split('-').reverse().join('.')}</span><span>{d.temp}°C · {d.wind} m/s · {d.rain} mm</span>
            </div>
          ))}
          <Btn variant="ghost" className="w-full mt-2 !py-1.5 text-xs" onClick={() => nav.go('pogoda')}>Okno opryskowe →</Btn>
        </Card>
        <Card>
          <h4 className="text-sm font-semibold text-slate-200 mb-2">📦 Niskie stany magazynowe</h4>
          {state.warehouse.filter((wi) => wi.stock <= wi.minStock).slice(0, 4).map((wi) => (
            <div key={wi.id} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
              <span className="text-slate-300 truncate mr-2">{wi.name}</span>
              <span className={wi.stock === 0 ? 'text-red-400 font-semibold' : 'text-amber-400'}>{fmtNum(wi.stock, 0)} {wi.unit}</span>
            </div>
          ))}
          <Btn variant="ghost" className="w-full mt-2 !py-1.5 text-xs" onClick={() => nav.go('magazyn')}>Magazyn →</Btn>
        </Card>
        <Card>
          <h4 className="text-sm font-semibold text-slate-200 mb-2">🚜 Maszyny — serwis</h4>
          {state.machines.filter((m) => m.nextServiceMth - m.mth < 100).slice(0, 4).map((m) => (
            <div key={m.id} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
              <span className="text-slate-300 truncate mr-2">{m.name}</span>
              <span className="text-amber-400">za {m.nextServiceMth - m.mth} MTH</span>
            </div>
          ))}
          <Btn variant="ghost" className="w-full mt-2 !py-1.5 text-xs" onClick={() => nav.go('maszyny')}>Flota →</Btn>
        </Card>
        <Card>
          <h4 className="text-sm font-semibold text-slate-200 mb-2">🌾 Plon z hektara (2025)</h4>
          {state.cropHistory.filter((h) => h.season === 2025).slice(0, 4).map((h) => {
            const f = state.fields.find((x) => x.id === h.fieldId);
            return (
              <div key={h.id} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                <span className="text-slate-300 truncate mr-2">{h.crop} · {f?.name}</span>
                <span className="text-emerald-400">{fmtNum(h.yield)} t/ha</span>
              </div>
            );
          })}
          <Btn variant="ghost" className="w-full mt-2 !py-1.5 text-xs" onClick={() => nav.go('analizy')}>Analizy →</Btn>
        </Card>
      </div>

      {/* PWA hint */}
      <Card className="!py-3 flex items-center justify-between text-xs text-slate-400">
        <span>📱 Zainstaluj jako aplikację (PWA): menu przeglądarki → „Dodaj do ekranu głównego”. Działa też offline.</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />Tryb offline gotowy</span>
      </Card>
    </div>
  );
}
