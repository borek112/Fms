import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { useWeather, fieldCentroid, sprayVerdict } from '@/hooks/useWeather';
import { Badge, Card, fmtDate, Select, SectionTitle } from '@/components/common';

export default function Weather() {
  const { state } = useFarm();
  const [fieldId, setFieldId] = useState(state.fields[0]?.id || '');
  const field = state.fields.find((f) => f.id === fieldId);
  const [lat, lng] = useMemo(() => fieldCentroid(field), [field]);
  const wx = useWeather(lat, lng);
  const today = wx.today;
  const v = sprayVerdict(today);
  const tones = { ok: 'border-emerald-500/50 bg-emerald-900/20', warn: 'border-amber-500/50 bg-amber-900/20', bad: 'border-red-500/50 bg-red-900/20' };
  const badgeT = { ok: 'ok', warn: 'warn', bad: 'bad' } as const;

  return (
    <div className="space-y-4" data-testid="weather-section">
      <SectionTitle
        title="🌦️ Pogoda i Okna Zabiegowe"
        sub={wx.source === 'live' ? `Dane na żywo z Open-Meteo dla współrzędnych ${wx.place[0].toFixed(3)}, ${wx.place[1].toFixed(3)}` : 'Brak połączenia — dane demonstracyjne (DEMO)'}
        right={<Badge tone={wx.source === 'live' ? 'ok' : 'info'}>{wx.source === 'live' ? '🟢 LIVE · Open-Meteo' : '🟠 DANE DEMO'}</Badge>}
      />

      {state.fields.length > 0 && (
        <Card className="!p-3">
          <div className="max-w-sm">
            <Select label="Pogoda dla pola" value={fieldId} onChange={(e) => setFieldId(e.target.value)} data-testid="weather-field-select">
              {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
        </Card>
      )}

      <Card className={`border ${tones[v.tone]}`} data-testid="weather-today">
        <div className="flex flex-wrap items-center gap-5">
          <div className="text-6xl">{today.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Czy mogę dziś opryskiwać{field ? ` na polu ${field.name}` : ''}?</h3>
            <div className={`text-2xl font-black mt-1 ${v.tone === 'ok' ? 'text-emerald-400' : v.tone === 'warn' ? 'text-amber-400' : 'text-red-400'}`}>
              {v.tone === 'ok' ? '🟢' : v.tone === 'warn' ? '🟡' : '🔴'} {v.label}
            </div>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-x-6 gap-y-1 text-sm text-slate-300">
            <span>🌡️ {today.temp}°C (min. {today.tempMin}°C)</span>
            <span>🌬️ {today.wind} m/s</span>
            <span>💨 porywy {today.gusts} m/s</span>
            <span>💧 {today.humidity}%</span>
            <span>🌧️ {today.rain} mm</span>
            <span>{today.desc}</span>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-700/40 pt-3">
          <div className="text-xs text-slate-400 uppercase mb-1.5">Dlaczego? (system nie decyduje za rolnika — podaje parametry i uzasadnienie)</div>
          <ul className="text-sm text-slate-200 space-y-1">
            {v.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {wx.days.map((d) => {
          const dv = sprayVerdict(d);
          return (
            <Card key={d.date} className="!p-3 text-center">
              <div className="text-xs text-slate-400">{fmtDate(d.date)}</div>
              <div className="text-3xl my-1.5">{d.icon}</div>
              <div className="font-bold text-slate-100">{d.temp}°C <span className="text-xs font-normal text-slate-500">/ {d.tempMin}°</span></div>
              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                <div>🌬️ {d.wind} m/s (porywy {d.gusts})</div>
                <div>💧 {d.humidity}% · 🌧️ {d.rain} mm</div>
              </div>
              <div className="mt-2"><Badge tone={badgeT[dv.tone]}>{dv.tone === 'ok' ? '🟢 oprysk OK' : dv.tone === 'warn' ? '🟡 warunkowo' : '🔴 nie opryskiwać'}</Badge></div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h4 className="font-semibold text-slate-100 mb-2">📅 Okna zabiegowe — podsumowanie tygodnia</h4>
        <div className="space-y-1.5 text-sm">
          {wx.days.map((d) => {
            const dv = sprayVerdict(d);
            return (
              <div key={d.date} className="flex items-center gap-3 rounded-lg bg-slate-900/40 border border-slate-700/40 px-3 py-2">
                <span className="w-24 text-slate-300">{fmtDate(d.date)}</span>
                <Badge tone={badgeT[dv.tone]}>{dv.label}</Badge>
                <span className="text-xs text-slate-400 hidden md:block">{dv.reasons[0]}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">Źródło: Open-Meteo (bez klucza API). Dane pobierane dla środka geometrycznego wybranego pola; przy braku sieci moduł przechodzi na dane demonstracyjne.</p>
      </Card>
    </div>
  );
}
