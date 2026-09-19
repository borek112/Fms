import { useMemo, useRef, useState, useEffect } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, fmtNum, fmtPLN, fmtDate } from '@/components/common';

interface Msg { role: 'user' | 'ai'; text: string }

const SUGGESTED = [
  'Co powinienem zrobić dzisiaj?',
  'Które pola wymagają uwagi?',
  'Które zabiegi wykonałem w tym tygodniu?',
  'Ile kosztowały dzierżawy?',
  'Jak wygląda historia pola Pole Północne?',
  'Które maszyny wymagają serwisu?',
  'Ile nawozu potrzebuję na 50 ha?',
  'Które pole jest najbardziej rentowne?',
];

const TODAY = '2026-08-06';
const PRICE_T: Record<string, number> = { 'Pszenica ozima': 850, 'Rzepak ozimy': 1950, 'Kukurydza': 720, 'Burak cukrowy': 180, 'Jęczmień ozimy': 700, 'Soja': 2100, 'Marchew': 650, 'Lucerna': 400, 'Pszenżyto': 760, 'Ziemniak': 700, 'Pietruszka': 900, 'Żyto': 640 };

export default function AI() {
  const { state } = useFarm();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: 'Cześć! Jestem Agro AI 3.0 — asystent gospodarstwa. Działam lokalnie: analizuję TWOJE realne dane FMS (pola, uprawy, zabiegi, nawożenie, magazyn, maszyny, dzierżawy, koszty, plony, historię pól). Nie zmyślam — jeśli czegoś brakuje w danych, powiem Ci tego wprost. O co zapytasz?' }]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const findField = (s: string) => {
    const byName = state.fields.find((f) => s.includes(f.name.toLowerCase()));
    if (byName) return byName;
    const num = parseInt(s.match(/pol[a-z]*\s*(\d+)/)?.[1] || '0');
    return num > 0 ? state.fields[num - 1] : undefined;
  };

  const answer = useMemo(() => (q: string): string => {
    const s = q.toLowerCase();

    if (s.includes('dzisiaj') || s.includes('dziś') || s.includes('co powinienem')) {
      const tasks = state.tasks.filter((t) => t.dueDate <= TODAY && t.status !== 'wykonane');
      const crit = state.alerts.filter((a) => !a.read && a.priority === 'krytyczne');
      const parts: string[] = [];
      parts.push(tasks.length ? `📋 Zadania na dziś (${tasks.length}):\n${tasks.map((t) => `• ${t.title} — priorytet ${t.priority}${t.fieldId ? `, ${state.fields.find((f) => f.id === t.fieldId)?.name}` : ''}`).join('\n')}` : '📋 Brak zaległych zadań na dziś. 🎉');
      if (crit.length) parts.push(`\n🔴 Krytyczne alerty:\n${crit.map((a) => `• ${a.title}`).join('\n')}`);
      parts.push('\n💡 Sprawdź moduł Pogoda — okno zabiegowe liczone jest na żywo (Open-Meteo) dla wybranego pola.');
      return parts.join('\n');
    }

    if ((s.includes('tydzie') || s.includes('tygodni') || s.includes('ostatni')) && (s.includes('zabieg') || s.includes('wykona') || s.includes('robi'))) {
      const from = new Date(TODAY + 'T00:00:00'); from.setDate(from.getDate() - 7);
      const iso = from.toISOString().slice(0, 10);
      const tr = state.treatments.filter((t) => t.date >= iso && t.date <= TODAY).sort((a, b) => b.date.localeCompare(a.date));
      if (!tr.length) return `W ostatnich 7 dniach (${iso} – ${TODAY}) nie zarejestrowano żadnych zabiegów w dzienniku.`;
      const cost = tr.reduce((a, t) => a + t.cost, 0);
      return `Zabiegi w ostatnim tygodniu (${tr.length}), łączny koszt ${fmtPLN(cost)}:\n${tr.map((t) => `• ${fmtDate(t.date)} — ${t.type}${t.productName ? ` (${t.productName})` : ''} · ${state.fields.find((f) => f.id === t.fieldId)?.name || '—'} · ${fmtPLN(t.cost)}`).join('\n')}`;
    }

    if (s.includes('dzierżaw') || s.includes('dzierzaw')) {
      const L = state.leases || [];
      if (!L.length) return 'Nie masz jeszcze żadnych umów dzierżawy. Dodaj je w module Dzierżawy, a policzę czynsz i koszt/ha.';
      const area = L.reduce((a, l) => a + l.area, 0);
      const annual = L.reduce((a, l) => a + l.area * l.pricePerHa, 0);
      const outstanding = L.reduce((a, l) => a + Math.max(0, l.area * l.pricePerHa - l.paidThisYear), 0);
      return `Masz ${L.length} umów dzierżawy na ${fmtNum(area)} ha.\n💰 Czynsz roczny łącznie: ${fmtPLN(annual)} (średnio ${fmtPLN(annual / Math.max(area, 1))}/ha).\n${outstanding > 0 ? `⚠️ Do zapłaty w 2026: ${fmtPLN(outstanding)}.` : '✅ Wszystkie płatności na 2026 uregulowane.'}\n${L.map((l) => `• ${l.landlord} — ${fmtNum(l.area)} ha · ${fmtPLN(l.pricePerHa)}/ha · do ${fmtDate(l.endDate)}`).join('\n')}`;
    }

    if (s.includes('histori')) {
      const f = findField(s);
      if (!f) return 'Podaj nazwę pola, np. „historia pola Pole Północne”, a pokażę oś czasu (uprawy, plony, koszty, wynik).';
      const h = state.cropHistory.filter((x) => x.fieldId === f.id).sort((a, b) => b.season - a.season);
      const fc = state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
      const rows = [...(fc ? [`• 2026 (plan) — ${fc.cropName}, plan ${fmtNum(fc.plannedYield)} t/ha`] : []), ...h.map((x) => `• ${x.season} — ${x.crop}, plon ${fmtNum(x.yield)} t/ha, wynik ${fmtPLN(x.revenue - x.costs)}`)];
      return `Historia pola „${f.name}” (${fmtNum(f.area)} ha, gleba ${f.soilType}, pH ${f.pH}):\n${rows.join('\n') || '• brak zapisanej historii'}`;
    }

    if (s.includes('uwag') || s.includes('uwagę')) {
      const alerts = state.alerts.filter((a) => !a.read && a.priority !== 'info');
      return `Sytuacje wymagające uwagi (${alerts.length} alertów):\n${alerts.map((a) => `${a.priority === 'krytyczne' ? '🔴' : '🟡'} ${a.title}`).join('\n') || '• brak krytycznych alertów'}`;
    }

    if (s.includes('nawoz') && /\d+/.test(s)) {
      const ha = parseFloat(s.match(/(\d+[.,]?\d*)/)?.[1].replace(',', '.') || '0');
      const dose = 250;
      const stock = state.warehouse.find((w) => w.name.toLowerCase().includes('saletra'))?.stock || 0;
      const need = dose * ha;
      return `Przy dawce ~250 kg/ha saletry amonowej 34%, na ${ha} ha potrzeba ok. ${fmtNum(need / 1000, 2)} t (${fmtNum(need, 0)} kg).\nW magazynie masz ${fmtNum(stock, 0)} kg — ${stock >= need ? '✅ wystarczy.' : `⚠️ brakuje ${fmtNum(need - stock, 0)} kg.`}\nDokładną dawkę policz w module Nawożenie.`;
    }

    if (s.includes('rentown') || s.includes('marż') || s.includes('najbardziej')) {
      const per = state.fields.map((f) => {
        const fc = state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
        const costs = state.treatments.filter((t) => t.fieldId === f.id && t.season === 2026).reduce((a, t) => a + t.cost, 0) + f.area * 900;
        const rev = fc ? fc.plannedYield * f.area * (PRICE_T[fc.cropName] || 700) : 0;
        return { name: f.name, margin: (rev - costs) / f.area };
      }).sort((a, b) => b.margin - a.margin);
      if (!per.length) return 'Brak pól do analizy.';
      return `Ranking rentowności (marża/ha, prognoza 2026):\n${per.slice(0, 6).map((x, i) => `${i + 1}. ${x.name} — ${fmtPLN(x.margin)}/ha`).join('\n')}\nSzczegóły: moduł Finanse / Cyfrowy Bliźniak Pola.`;
    }

    if (s.includes('koszt') && (s.includes('pol') || findField(s))) {
      const f = findField(s);
      if (f) {
        const tr = state.treatments.filter((t) => t.fieldId === f.id && t.season === 2026);
        const c = tr.reduce((a, t) => a + t.cost, 0);
        return `Koszty pola „${f.name}” w sezonie 2026: ${fmtPLN(c)} z ${tr.length} zabiegów (+ koszty stałe ~${fmtPLN(f.area * 900)}).\nKoszt/ha: ${fmtPLN((c + f.area * 900) / f.area)}.`;
      }
    }

    if (s.includes('paliw')) {
      const fuel = state.fuelTanks.reduce((a, t) => a + t.current, 0);
      const used = state.fuelTanks.flatMap((t) => t.history).filter((h) => h.type === 'zużycie').reduce((a, h) => a + h.qty, 0);
      return `Stan paliwa: ${fmtNum(fuel, 0)} l ON w ${state.fuelTanks.length} zbiornikach.\nZarejestrowane zużycie: ${fmtNum(used, 0)} l.\nSzczegóły: Magazyn → paliwo.`;
    }

    if (s.includes('magazyn') || s.includes('stan')) {
      const low = state.warehouse.filter((w) => w.stock <= w.minStock);
      const val = state.warehouse.reduce((a, w) => a + w.stock * w.price, 0);
      return `Magazyn: ${state.warehouse.length} produktów, wartość ${fmtPLN(val)}.\n⚠️ Niskie stany (${low.length}): ${low.map((w) => `${w.name} (${fmtNum(w.stock, 0)} ${w.unit})`).join(', ') || 'brak'}.\nPłody: ${state.grain.map((g) => `${g.crop} ${fmtNum(g.qty, 0)} t`).join(', ') || 'brak'}.`;
    }

    if (s.includes('serwis') || s.includes('maszyn')) {
      const need = state.machines.filter((m) => m.nextServiceMth - m.mth < 150);
      return `Maszyny wymagające serwisu (<150 MTH do przeglądu):\n${need.map((m) => `• ${m.name} — za ${m.nextServiceMth - m.mth} MTH (stan ${fmtNum(m.mth, 0)} MTH)`).join('\n') || '• wszystkie maszyny sprawne'}`;
    }

    if (s.includes('zabieg') || s.includes('pol')) {
      const f = findField(s);
      if (f) {
        const tr = state.treatments.filter((t) => t.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
        return `Zabiegi na polu „${f.name}” (${tr.length}):\n${tr.slice(0, 8).map((t) => `• ${fmtDate(t.date)} — ${t.type}${t.productName ? ` (${t.productName})` : ''}`).join('\n') || '• brak zabiegów'}`;
      }
      return 'Nie znalazłem tego pola. Podaj numer („pole 3”) lub dokładną nazwę.';
    }

    if (s.includes('plon')) {
      const tot = state.fieldCrops.filter((c) => c.season === 2026).reduce((a, c) => {
        const f = state.fields.find((x) => x.id === c.fieldId);
        return a + (f ? c.plannedYield * f.area : 0);
      }, 0);
      return `Przewidywany łączny plon sezonu 2026: ok. ${fmtNum(tot / 1000, 2)} tys. t przy areale ${fmtNum(state.fields.reduce((a, f) => a + f.area, 0))} ha.`;
    }

    return 'Rozumiem pytania o: zadania na dziś, pola wymagające uwagi, zabiegi z tego tygodnia, dzierżawy, historię i koszty pola, rentowność, nawozy, paliwo, magazyn, serwis maszyn oraz plony. Zadaj pytanie używając nazwy pola lub liczby — a jeśli danych zabraknie, powiem Ci których.';
  }, [state]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'ai', text: answer(q) }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[480px]" data-testid="ai-section">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🤖 Agro AI 3.0 — Copilot Gospodarstwa</h2>
          <p className="text-sm text-slate-400">Lokalny silnik regułowy na Twoich danych FMS</p>
        </div>
        <Badge tone="ok">LOKALNY · bez wysyłania danych</Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1" data-testid="ai-messages">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-emerald-600/80 text-white rounded-br-md' : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-bl-md'}`}>
              {m.role === 'ai' && <span className="mr-1.5">🤖</span>}{m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3">
        <div className="flex gap-1.5 flex-wrap mb-2">
          {SUGGESTED.map((q) => (
            <button key={q} data-testid="ai-suggestion" onClick={() => ask(q)} className="px-2.5 py-1 rounded-full text-xs border border-slate-600 text-slate-300 hover:border-emerald-500 transition-colors">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} data-testid="ai-input" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="Zapytaj o gospodarstwo…" className="flex-1 bg-slate-800/70 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500" />
          <button onClick={() => ask(input)} data-testid="ai-send" className="px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors">Wyślij</button>
        </div>
      </div>
    </div>
  );
}
