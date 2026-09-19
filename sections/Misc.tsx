import { useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, fmtDate, SectionTitle } from '@/components/common';

// -------------------- ALERTY --------------------
export function Alerts() {
  const { state, markAlertRead, snoozeAlert, deleteAlert } = useFarm();
  const [cat, setCat] = useState('wszystkie');
  const cats = ['wszystkie', 'pogodowe', 'agronomiczne', 'magazynowe', 'finansowe', 'serwisowe', 'terminowe'];
  const list = state.alerts.filter((a) => (cat === 'wszystkie' || a.category === cat) && !a.snoozed);
  const tone: Record<string, 'ok' | 'warn' | 'bad' | 'info'> = { info: 'info', 'ostrzeżenie': 'warn', krytyczne: 'bad' };

  return (
    <div className="space-y-4">
      <SectionTitle title="🔔 Centrum Powiadomień" sub={`${state.alerts.filter((a) => !a.read).length} nieprzeczytanych`} />
      <div className="flex gap-1.5 flex-wrap">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1 rounded-full text-xs border ${cat === c ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id} className={`!p-3 ${a.read ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={tone[a.priority]}>{a.priority === 'krytyczne' ? '🔴' : a.priority === 'ostrzeżenie' ? '🟡' : '🟢'} {a.priority}</Badge>
              <div className="flex-1 min-w-[200px]">
                <div className={`text-sm ${a.read ? 'text-slate-400' : 'text-slate-100 font-medium'}`}>{a.title}</div>
                <div className="text-xs text-slate-500">{fmtDate(a.date)} · {a.category} · źródło: {a.source}</div>
              </div>
              <div className="flex gap-1.5">
                {!a.read && <Btn variant="outline" className="!py-1 !px-2.5 text-xs" onClick={() => markAlertRead(a.id)}>✓ Przeczytane</Btn>}
                <Btn variant="ghost" className="!py-1 !px-2.5 text-xs" onClick={() => snoozeAlert(a.id)}>⏰ Odłóż</Btn>
                <Btn variant="danger" className="!py-1 !px-2.5 text-xs" onClick={() => deleteAlert(a.id)}>🗑️</Btn>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card><p className="text-sm text-slate-400 text-center py-6">Brak alertów w tej kategorii. 🎉</p></Card>}
      </div>
    </div>
  );
}

// -------------------- USTAWIENIA --------------------
export function Settings() {
  const { state, switchFarm, loadDemo, resetAll, clearAll, notify } = useFarm();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-4">
      <SectionTitle title="⚙️ Ustawienia" sub="Profil gospodarstwa, dane i konfiguracja systemu" />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-semibold text-slate-100 mb-3">🏡 Gospodarstwa</h4>
          <div className="space-y-2">
            {state.farms.map((f) => (
              <button key={f.id} onClick={() => { switchFarm(f.id); notify(`Przełączono na: ${f.name}`); }}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${f.id === state.activeFarmId ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-100 text-sm">{f.name}</div>
                    <div className="text-xs text-slate-400">{f.owner} · {f.location}</div>
                  </div>
                  {f.id === state.activeFarmId && <Badge tone="ok">aktywne</Badge>}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Przełącznik gospodarstw dostępny też w górnym pasku. W wersji produkcyjnej każde gospodarstwo będzie miało osobną bazę danych.</p>
        </Card>

        <Card>
          <h4 className="font-semibold text-slate-100 mb-3">🧪 Dane demonstracyjne</h4>
          <div className="space-y-2">
            <Btn className="w-full" onClick={loadDemo}>Załaduj dane demonstracyjne</Btn>
            <Btn variant="outline" className="w-full" onClick={() => setConfirmReset(true)}>Zresetuj dane do stanu DEMO</Btn>
            <Btn variant="danger" className="w-full" onClick={() => setConfirmClear(true)}>Wyczyść wszystkie dane</Btn>
          </div>
          <p className="text-xs text-slate-500 mt-3">Dane zapisywane są lokalnie w przeglądarce (LocalStorage) — architektura warstwy danych jest przygotowana pod podłączenie Supabase / Firebase / PostgreSQL.</p>
        </Card>

        <Card>
          <h4 className="font-semibold text-slate-100 mb-3">📏 Jednostki i formaty</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['Waluta', 'PLN'], ['Powierzchnia', 'ha'], ['Masa', 'kg / t'], ['Dawki', 'kg/ha, l/ha'], ['Paliwo', 'litry'], ['Czas pracy', 'MTH'], ['Temperatura', '°C'], ['Wiatr', 'm/s'], ['Opady', 'mm'], ['Język', 'Polski']].map(([k, v]) => (
              <div key={k} className="flex justify-between rounded bg-slate-900/50 border border-slate-700/40 px-3 py-2">
                <span className="text-slate-400">{k}</span><span className="text-slate-100">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-slate-100 mb-3">🔌 Integracje (przygotowane)</h4>
          <div className="space-y-2 text-sm">
            {[
              ['🌦️ API pogodowe (OpenWeather / IMGW)', 'warstwa WeatherService gotowa — wstrzyknij klucz API'],
              ['🗺️ Mapy (Leaflet / Mapbox)', 'komponent mapy z warstwami — podmień renderer'],
              ['🛰️ Dane satelitarne Sentinel-2 (NDVI/NDRE)', 'moduł Precision Ag'],
              ['🗄️ Supabase / Firebase / PostgreSQL', 'repozytoria danych zamiast LocalStorage'],
              ['🤖 API AI (LLM)', 'Agro AI — interfejs kopilota gotowy'],
              ['📷 AI Vision — rozpoznawanie objawów', 'moduł Ochrona Roślin'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="text-slate-100">{t}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={resetAll} text="Przywrócić pełny zestaw danych demonstracyjnych? Bieżące zmiany zostaną nadpisane." />
      <Confirm open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clearAll} text="Usunąć WSZYSTKIE dane (pola, zabiegi, magazyn, maszyny)? Tej operacji nie można cofnąć." />
    </div>
  );
}
