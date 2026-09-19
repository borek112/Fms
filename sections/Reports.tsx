import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, fmtDate, fmtNum, fmtPLN, SectionTitle, Select } from '@/components/common';

export default function Reports() {
  const { state } = useFarm();
  const [type, setType] = useState<'zabiegi' | 'pole' | 'sezon' | 'arimr'>('zabiegi');
  const [fieldId, setFieldId] = useState('wszystkie');
  const [season, setSeason] = useState('2026');

  const rows = useMemo(() => {
    return state.treatments
      .filter((t) => (fieldId === 'wszystkie' || t.fieldId === fieldId) && String(t.season) === season)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => ({
        ...t,
        fieldName: state.fields.find((f) => f.id === t.fieldId)?.name || '—',
      }));
  }, [state, fieldId, season]);

  const exportCSV = () => {
    const head = 'Data;Pole;Uprawa;Typ zabiegu;Środek;Dawka;Powierzchnia (ha);Operator;Koszt (PLN)';
    const lines = rows.map((r) => {
      const f = state.fields.find((x) => x.id === r.fieldId);
      return [r.date, r.fieldName, r.crop, r.type, r.productName || '—', r.dose || '—', f?.area ?? '—', r.operator || '—', Math.round(r.cost)].join(';');
    });
    const blob = new Blob(['﻿' + [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `raport_zabiegow_${season}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Raport zabiegów ${season}</title><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #ccc;padding:5px;text-align:left}th{background:#eee}</style></head><body>
      <h1>Raport zabiegów agrotechnicznych — sezon ${season}</h1>
      <p>${state.farms.find((f) => f.id === state.activeFarmId)?.name} · wygenerowano ${new Date().toLocaleDateString('pl-PL')}</p>
      <table><tr><th>Data</th><th>Pole</th><th>Uprawa</th><th>Zabieg</th><th>Środek</th><th>Dawka</th><th>Operator</th><th>Koszt</th></tr>
      ${rows.map((r) => `<tr><td>${r.date}</td><td>${r.fieldName}</td><td>${r.crop}</td><td>${r.type}</td><td>${r.productName || '—'}</td><td>${r.dose ?? '—'}</td><td>${r.operator || '—'}</td><td>${Math.round(r.cost)} zł</td></tr>`).join('')}
      </table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="📊 Analizy i Raporty" sub="Generator raportów z eksportem PDF/CSV i moduł dokumentacji ARiMR"
        right={<div className="flex gap-2"><Btn variant="outline" onClick={exportCSV}>⬇ CSV</Btn><Btn variant="outline" onClick={exportPDF}>⬇ PDF (druk)</Btn></div>} />

      <div className="flex gap-1 border-b border-slate-700/50 pb-1 overflow-x-auto">
        {[['zabiegi', '🧾 Raport zabiegów'], ['pole', '🟩 Raport pola'], ['sezon', '📅 Podsumowanie sezonu'], ['arimr', '🏛️ ARiMR i ekoschematy']].map(([k, l]) => (
          <button key={k} onClick={() => setType(k as typeof type)} className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg ${type === k ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {type === 'zabiegi' && (
        <Card>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select label="Pole" value={fieldId} onChange={(e) => setFieldId(e.target.value)} className="!w-56">
              <option value="wszystkie">wszystkie pola</option>
              {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Select label="Sezon" value={season} onChange={(e) => setSeason(e.target.value)} className="!w-32">
              {['2026', '2025', '2024'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
                <th className="py-2 pr-3">Data</th><th className="pr-3">Pole</th><th className="pr-3">Uprawa</th><th className="pr-3">Zabieg</th><th className="pr-3">Środek</th><th className="pr-3">Dawka</th><th className="pr-3">Operator</th><th className="text-right">Koszt</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="pr-3 text-slate-100">{r.fieldName}</td>
                    <td className="pr-3 text-slate-400">{r.crop}</td>
                    <td className="pr-3"><Badge tone={r.type === 'oprysk' ? 'warn' : r.type === 'zbiór' ? 'ok' : 'info'}>{r.type}</Badge></td>
                    <td className="pr-3 text-slate-300">{r.productName || '—'}</td>
                    <td className="pr-3 text-slate-300">{r.dose ? `${r.dose} ${r.type === 'oprysk' ? 'l/ha' : 'kg/ha'}` : '—'}</td>
                    <td className="pr-3 text-slate-400">{r.operator || '—'}</td>
                    <td className="text-right text-slate-200">{fmtPLN(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Brak zabiegów dla wybranych kryteriów.</p>}
          </div>
          <div className="mt-3 text-sm text-slate-300 text-right">Razem: <b className="text-emerald-400">{fmtPLN(rows.reduce((a, r) => a + r.cost, 0))}</b> · {rows.length} zabiegów</div>
        </Card>
      )}

      {type === 'pole' && (
        <Card>
          <Select label="Pole" value={fieldId === 'wszystkie' ? state.fields[0]?.id || '' : fieldId} onChange={(e) => setFieldId(e.target.value)} className="!w-64 mb-4">
            {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          {(() => {
            const f = state.fields.find((x) => x.id === (fieldId === 'wszystkie' ? state.fields[0]?.id : fieldId));
            if (!f) return <p className="text-slate-400 text-sm">Brak pól.</p>;
            const hist = state.cropHistory.filter((h) => h.fieldId === f.id).sort((a, b) => a.season - b.season);
            const fc = state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
            return (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-3">
                  <div className="text-xs text-slate-500 uppercase mb-2">Dane ewidencyjne</div>
                  <p>🟩 <b>{f.name}</b> — {fmtNum(f.area)} ha</p>
                  <p className="text-slate-400 mt-1">Działka {f.parcelNo}, obręb {f.district}</p>
                  <p className="text-slate-400">{f.soilType}, pH {f.pH}</p>
                  <p className="text-slate-400">Zasobność: P {f.P}, K {f.K}, Mg {f.Mg}</p>
                </div>
                <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-3">
                  <div className="text-xs text-slate-500 uppercase mb-2">Historia produkcji</div>
                  {hist.map((h) => <p key={h.id} className="text-slate-300">{h.season}: {h.crop} — {fmtNum(h.yield)} t/ha · wynik {fmtPLN(h.revenue - h.costs)}</p>)}
                  {fc && <p className="text-emerald-300">2026: {fc.cropName} ({fc.variety}) — plan {fc.plannedYield} t/ha</p>}
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {type === 'sezon' && (
        <Card>
          <div className="grid sm:grid-cols-3 gap-3">
            {(['2026', '2025', '2024'] as const).map((s) => {
              const tr = state.treatments.filter((t) => String(t.season) === s);
              const hist = state.cropHistory.filter((h) => String(h.season) === s);
              const costs = tr.reduce((a, t) => a + t.cost, 0) + hist.reduce((a, h) => a + h.costs, 0);
              const rev = hist.reduce((a, h) => a + h.revenue, 0);
              return (
                <div key={s} className={`rounded-lg border p-4 ${s === '2026' ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-700/60 bg-slate-900/40'}`}>
                  <div className="font-bold text-slate-100 text-lg">Sezon {s}</div>
                  <div className="text-sm text-slate-300 mt-2 space-y-1">
                    <div>Zabiegi: <b>{tr.length}</b></div>
                    <div>Koszty zabiegów: {fmtPLN(costs)}</div>
                    {rev > 0 && <div>Przychody: {fmtPLN(rev)}</div>}
                    {s === '2026' && <div className="text-xs text-slate-500">sezon bieżący — dane częściowe</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {type === 'arimr' && (
        <Card>
          <h4 className="font-semibold text-slate-100 mb-2">🏛️ Moduł ARiMR i ekoschematy</h4>
          <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-xs text-amber-200 mb-4">
            ⚠️ Dokumenty generowane w tym module mają charakter poglądowy (DEMO). Nie są zweryfikowane z aktualnymi przepisami i nie stanowią dokumentacji zgodnej z wymogami ARiMR. Przed złożeniem wniosku sprawdź aktualne wytyczne.
          </div>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {[
              { t: 'Ewidencja działek rolnych', d: 'Lista działek z powierzchniami i obrębami — gotowa do weryfikacji we wniosku.', ok: true },
              { t: 'Rejestr zabiegów dla ekoschematów', d: 'Eksport zabiegów na żądanie (CSV) — pomocniczy przy rozliczeniach.', ok: true },
              { t: 'Plan nawożenia azotem', d: 'Szkic planu N na podstawie planowanych plonów (wymaga weryfikacji doradczej).', ok: true },
              { t: 'Integracja z aplikacją „Zgłoś szkodę”', d: 'Wymaga połączenia z systemami ARiMR — funkcja przygotowana architektonicznie.', ok: false },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-slate-100">{x.t}</span>
                  <Badge tone={x.ok ? 'ok' : 'muted'}>{x.ok ? 'dostępne' : 'przygotowane'}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{x.d}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
