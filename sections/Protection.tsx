import { useMemo, useState } from 'react';
import { THREATS } from '@/data/demo';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, EmptyState, SectionTitle, Select } from '@/components/common';
import type { Threat } from '@/types';

const SYMPTOMS: { s: string; map: string[] }[] = [
  { s: 'Żółknięcie liści', map: ['t4', 't8', 't1'] },
  { s: 'Plamy na liściach', map: ['t5', 't10'] },
  { s: 'Deformacje', map: ['t9', 't11'] },
  { s: 'Dziury w liściach/strąkach', map: ['t9', 't11'] },
  { s: 'Uszkodzenia łodygi', map: ['t7', 't11'] },
  { s: 'Zahamowanie wzrostu', map: ['t1', 't3', 't8'] },
  { s: 'Więdnięcie pędów', map: ['t12', 't10'] },
  { s: 'Biały nalot', map: ['t4', 't7', 't10'] },
];

export default function Protection() {
  const { state } = useFarm();
  const [tab, setTab] = useState<'atlas' | 'diagnoza'>('atlas');
  const [kind, setKind] = useState('wszystkie');
  const [crop, setCrop] = useState('wszystkie');
  const [open, setOpen] = useState<Threat | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const crops = ['wszystkie', ...new Set(THREATS.flatMap((t) => t.crops))];
  const filtered = THREATS.filter((t) => (kind === 'wszystkie' || t.kind === kind) && (crop === 'wszystkie' || t.crops.includes(crop)));

  const diagnosis = useMemo(() => {
    if (picked.length === 0) return [];
    const score = new Map<string, number>();
    picked.forEach((s) => SYMPTOMS.find((x) => x.s === s)?.map.forEach((id) => score.set(id, (score.get(id) || 0) + 1)));
    return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id, sc]) => ({ threat: THREATS.find((t) => t.id === id)!, score: sc }));
  }, [picked]);

  return (
    <div className="space-y-4">
      <SectionTitle title="🐛 Ochrona Roślin — Agro Pest Atlas" sub="Baza zagrożeń, diagnostyka objawowa i substancje czynne" />
      <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-xs text-amber-200">
        ⚠️ Informacje mają charakter poglądowy. Przed zastosowaniem środka ochrony roślin zawsze sprawdź aktualną etykietę, rejestrację w rejestrze MRiRW i obowiązujące przepisy. Rekomendacje nie stanowią gwarantowanej porady.
      </div>

      <div className="flex gap-1 border-b border-slate-700/50 pb-1">
        {[['atlas', '📖 Atlas zagrożeń'], ['diagnoza', '🔍 Co widzę na polu?']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)} className={`px-3 py-2 text-sm rounded-t-lg ${tab === k ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {tab === 'atlas' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1.5">
              {['wszystkie', 'chwast', 'choroba', 'szkodnik'].map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`px-3 py-1 rounded-full text-xs border ${kind === k ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{k}</button>
              ))}
            </div>
            <Select label="" value={crop} onChange={(e) => setCrop(e.target.value)} className="!w-56">
              {crops.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <button key={t.id} onClick={() => setOpen(t)} className="text-left">
                <Card className="hover:border-emerald-500/60 transition-colors h-full">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{t.emoji}</span>
                    <Badge tone={t.kind === 'choroba' ? 'bad' : t.kind === 'szkodnik' ? 'warn' : 'ok'}>{t.kind}</Badge>
                  </div>
                  <h4 className="font-semibold text-slate-100 mt-2">{t.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                  <div className="text-xs text-slate-500 mt-2">Uprawy: {t.crops.join(', ')}</div>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'diagnoza' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <h4 className="font-semibold text-slate-100 mb-3">🔍 Co widzę na polu?</h4>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(({ s }) => (
                <button key={s} onClick={() => setPicked((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${picked.includes(s) ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-dashed border-slate-600 p-4 text-center">
              <div className="text-3xl mb-1">📷</div>
              <p className="text-sm text-slate-300">Prześlij zdjęcie objawów</p>
              <p className="text-xs text-slate-500 mt-1">Moduł AI Vision — przygotowany pod przyszłą integrację rozpoznawania obrazu.</p>
              <Btn variant="outline" className="mt-3" onClick={() => alert('Funkcja AI Vision wymaga podłączenia zewnętrznego API — moduł jest przygotowany architektonicznie.')}>Wybierz zdjęcie…</Btn>
            </div>
          </Card>
          <Card>
            <h4 className="font-semibold text-slate-100 mb-3">Potencjalne przyczyny</h4>
            {diagnosis.length === 0 && <EmptyState icon="🩺" text="Zaznacz objawy, aby zobaczyć możliwe przyczyny." />}
            <div className="space-y-2">
              {diagnosis.map(({ threat, score }) => (
                <button key={threat.id} onClick={() => setOpen(threat)} className="w-full text-left rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 hover:border-emerald-500/60">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-100">{threat.emoji} {threat.name}</span>
                    <Badge tone={score >= 2 ? 'warn' : 'muted'}>{score >= 2 ? 'wysokie prawdopodobieństwo' : 'możliwe'}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{threat.conditions}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Szczegóły zagrożenia */}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setOpen(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 sticky top-0 bg-slate-900">
              <h3 className="font-semibold text-slate-100">{open.emoji} {open.name}</h3>
              <button onClick={() => setOpen(null)} className="text-slate-400 hover:text-slate-100 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex gap-2"><Badge tone={open.kind === 'choroba' ? 'bad' : open.kind === 'szkodnik' ? 'warn' : 'ok'}>{open.kind}</Badge><Badge tone="info">{open.bbch}</Badge></div>
              <Sec t="Opis" v={open.description} />
              <Sec t="Objawy" v={open.symptoms.join(' · ')} />
              <Sec t="Warunki występowania" v={open.conditions} />
              <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 space-y-1.5">
                <div className="text-xs text-slate-500 uppercase">Zwalczanie (informacyjnie)</div>
                <Sec t="Substancje czynne" v={open.substances} />
                <Sec t="Mechanizm działania" v={open.mechanism} />
                <Sec t="Grupa HRAC/FRAC/IRAC" v={open.group} />
                <Sec t="Karencja" v={open.preharvest} />
              </div>
              <Sec t="Prewencja" v={open.prevention} />
              <p className="text-xs text-amber-300/90 border border-amber-500/30 bg-amber-900/20 rounded-lg p-2">⚠️ Zawsze sprawdź aktualną etykietę środka i rejestr środków ochrony roślin MRiRW. Dane poglądowe — {state.farms[0].name}, moduł DEMO.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sec({ t, v }: { t: string; v: string }) {
  return <div><span className="text-slate-500 text-xs uppercase">{t}</span><p className="text-slate-200 mt-0.5">{v}</p></div>;
}
