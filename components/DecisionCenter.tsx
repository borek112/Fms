import { useMemo } from 'react';
import { useFarm } from '@/store/FarmContext';
import { useWeather, centroid, sprayVerdict } from '@/hooks/useWeather';
import { Card, fmtNum } from '@/components/common';
import type { Nav } from '@/App';

const TODAY = '2026-08-06';

interface Item { id: string; text: string; sub: string; go: () => void }

/** Centrum Decyzyjne — TODAY: 🔴 PILNE / 🟠 DO WYKONANIA / 🟢 WYKONANE, wyliczane z realnych danych FMS. */
export default function DecisionCenter({ nav }: { nav: Nav }) {
  const { state } = useFarm();
  const coord = useMemo(() => centroid(state.fields), [state.fields]);
  const wx = useWeather(coord[0], coord[1]);

  const { urgent, todo, done } = useMemo(() => {
    const urgent: Item[] = [];
    const todo: Item[] = [];
    const done: Item[] = [];
    const daysTo = (iso: string) => Math.round((new Date(iso + 'T00:00:00').getTime() - new Date(TODAY + 'T00:00:00').getTime()) / 86400000);

    // Zadania
    state.tasks.forEach((t) => {
      const f = state.fields.find((x) => x.id === t.fieldId);
      const sub = `zadanie${f ? ` · ${f.name}` : ''} · termin ${t.dueDate}`;
      if (t.status === 'wykonane') { done.push({ id: t.id, text: t.title, sub, go: () => nav.go('pracownicy') }); return; }
      const dd = daysTo(t.dueDate);
      if (dd < 0 || t.priority === 'krytyczny') urgent.push({ id: t.id, text: t.title, sub: dd < 0 ? `${sub} · ⚠ po terminie` : sub, go: () => nav.go('pracownicy') });
      else if (dd <= 7) todo.push({ id: t.id, text: t.title, sub, go: () => nav.go('pracownicy') });
    });

    // Alerty
    state.alerts.filter((a) => !a.snoozed).forEach((a) => {
      const item: Item = { id: a.id, text: a.title, sub: `alert · ${a.category}`, go: () => nav.go('alerts') };
      if (a.read) return;
      if (a.priority === 'krytyczne') urgent.push(item);
      else if (a.priority === 'ostrzeżenie') todo.push(item);
    });

    // Magazyn — braki
    state.warehouse.forEach((w) => {
      if (w.stock === 0 && w.minStock > 0) urgent.push({ id: 'wh' + w.id, text: `Brak: ${w.name}`, sub: `magazyn · minimum ${fmtNum(w.minStock, 0)} ${w.unit}`, go: () => nav.go('magazyn') });
      else if (w.stock <= w.minStock) todo.push({ id: 'wh' + w.id, text: `Niski stan: ${w.name}`, sub: `magazyn · ${fmtNum(w.stock, 0)}/${fmtNum(w.minStock, 0)} ${w.unit}`, go: () => nav.go('magazyn') });
    });

    // Maszyny — serwis
    state.machines.forEach((m) => {
      const left = m.nextServiceMth - m.mth;
      if (left <= 0) urgent.push({ id: 'm' + m.id, text: `Przegląd: ${m.name}`, sub: `flota · przekroczono o ${Math.abs(left)} MTH`, go: () => nav.go('maszyny') });
      else if (left < 60) todo.push({ id: 'm' + m.id, text: `Zbliża się serwis: ${m.name}`, sub: `flota · za ${left} MTH`, go: () => nav.go('maszyny') });
    });

    // Dzierżawy — wygasające / niezapłacone
    (state.leases || []).forEach((l) => {
      const dd = daysTo(l.endDate);
      const due = Math.round(l.area * l.pricePerHa);
      if (dd >= 0 && dd < 90) urgent.push({ id: 'l' + l.id, text: `Umowa dzierżawy wygasa: ${l.landlord}`, sub: `dzierżawa · dz. ${l.parcelNo} · za ${dd} dni`, go: () => nav.go('dzierzawy') });
      else if (l.paidThisYear < due) todo.push({ id: 'l' + l.id, text: `Płatność dzierżawy: ${l.landlord}`, sub: `dzierżawa · pozostało ${fmtNum(due - l.paidThisYear, 0)} zł`, go: () => nav.go('dzierzawy') });
    });

    return { urgent, todo, done };
  }, [state, nav]);

  const v = sprayVerdict(wx.today);
  const cols: { key: string; title: string; icon: string; items: Item[]; cls: string; badge: string }[] = [
    { key: 'urgent', title: 'PILNE', icon: '🔴', items: urgent, cls: 'border-red-500/40 bg-red-950/20', badge: 'bg-red-500/20 text-red-300' },
    { key: 'todo', title: 'DO WYKONANIA', icon: '🟠', items: todo, cls: 'border-amber-500/40 bg-amber-950/15', badge: 'bg-amber-500/20 text-amber-300' },
    { key: 'done', title: 'WYKONANE', icon: '🟢', items: done, cls: 'border-emerald-500/40 bg-emerald-950/15', badge: 'bg-emerald-500/20 text-emerald-300' },
  ];

  return (
    <Card data-testid="decision-center" className="!p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-black text-slate-100 tracking-tight">🧠 CENTRUM DECYZYJNE · DZIŚ</h3>
        <button
          data-testid="decision-spray-window"
          onClick={() => nav.go('pogoda')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${v.tone === 'ok' ? 'border-emerald-500/50 text-emerald-300 bg-emerald-900/20' : v.tone === 'warn' ? 'border-amber-500/50 text-amber-300 bg-amber-900/20' : 'border-red-500/50 text-red-300 bg-red-900/20'}`}
        >
          {v.tone === 'ok' ? '🟢' : v.tone === 'warn' ? '🟡' : '🔴'} Okno zabiegu: {v.label} {wx.source === 'live' ? '· LIVE' : '· DEMO'}
        </button>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {cols.map((c) => (
          <div key={c.key} data-testid={`decision-col-${c.key}`} className={`rounded-xl border ${c.cls} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-100">{c.icon} {c.title}</span>
              <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${c.badge}`}>{c.items.length}</span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {c.items.length === 0 && <p className="text-xs text-slate-500 py-3 text-center">— brak —</p>}
              {c.items.slice(0, 12).map((it) => (
                <button key={it.id} data-testid={`decision-item-${it.id}`} onClick={it.go} className="w-full text-left rounded-lg border border-slate-700/50 bg-slate-900/40 p-2 hover:border-slate-500 transition-colors">
                  <div className="text-xs text-slate-100 leading-snug">{it.text}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{it.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
