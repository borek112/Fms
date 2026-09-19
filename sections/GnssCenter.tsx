import { useMemo, useState } from 'react';
import { useGps } from '@/hooks/useGps';
import { parseNmeaStream, buildSnapshot, nmeaChecksum, FIX_QUALITY_LABEL } from '@/precision/gnss/nmeaParser';
import { useSerialNmea, BAUD_RATES } from '@/precision/gnss/useSerialNmea';
import { Badge, Btn, Card, SectionTitle } from '@/components/common';

const SAMPLE = `$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48
$GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1*39
$GPGSV,3,1,11,01,40,083,46,02,17,308,41,12,07,344,39,14,22,228,45*75`;

function Stat({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'ok' | 'warn' | 'bad' }) {
  const c: Record<string, string> = { default: 'text-slate-100', ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' };
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-1 tabular-nums ${c[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function GnssCenter() {
  const [live, setLive] = useState(false);
  const gps = useGps(live);
  const serial = useSerialNmea();
  const fix = gps.fix;

  const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Źródło pozycji — UCZCIWIE: GPS przeglądarki NIE jest RTK
  const quality = !fix ? 'BRAK' : fix.accuracy <= 2 ? 'FIX' : fix.accuracy <= 5 ? 'FIX' : fix.accuracy <= 10 ? 'WEAK' : 'WEAK';
  const dot = !fix ? '🔴' : fix.accuracy <= 5 ? '🟢' : '🟡';

  const [nmeaText, setNmeaText] = useState(SAMPLE);
  const parsed = useMemo(() => parseNmeaStream(nmeaText), [nmeaText]);
  const snap = useMemo(() => buildSnapshot(parsed), [parsed]);
  const lines = useMemo(() => nmeaText.split(/\r?\n/).filter((l) => l.trim().startsWith('$')), [nmeaText]);

  return (
    <div className="space-y-4" data-testid="gnss-center">
      <SectionTitle
        title="🛰️ GNSS Center"
        sub="Status pozycjonowania satelitarnego — dane wyłącznie rzeczywiste, bez udawania RTK"
        right={
          <Btn data-testid="gnss-toggle-live" variant={live ? 'danger' : 'primary'} onClick={() => setLive((v) => !v)}>
            {live ? '⏹ Zatrzymaj GPS' : '▶ Uruchom GPS urządzenia'}
          </Btn>
        }
      />

      {/* Źródło pozycji */}
      <Card className={`border ${fix ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-700/60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase text-slate-500">Źródło pozycji</div>
            <div className="text-lg font-black text-slate-100">📱 GPS URZĄDZENIA · GNSS STANDARD</div>
            <div className="text-xs text-slate-400">Odbiornik przeglądarki (Geolocation API). Dokładność zależy od telefonu/tabletu.</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="warn">RTK: BRAK — GPS telefonu nie zapewnia korekt RTK</Badge>
            <Badge tone={live ? (fix ? 'ok' : 'warn') : 'info'}>{live ? (fix ? `${dot} ${quality}` : '🟡 Oczekiwanie na fix…') : '⏸ GPS wyłączony'}</Badge>
          </div>
        </div>
        {live && gps.error && <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/20 p-2 text-sm text-red-300">🔴 {gps.error}</div>}
        {!live && <p className="mt-3 text-xs text-slate-500">Uruchom GPS, aby zobaczyć pozycję na żywo. Na komputerze bez modułu GPS dokładność może być niska lub pozycja niedostępna — w takim wypadku moduł jasno to pokaże (nie udaje sygnału).</p>}
      </Card>

      {/* Parametry na żywo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Fix quality" value={live ? quality : '—'} sub="GPS / DGPS / RTK — tu: GPS" tone={fix ? (fix.accuracy <= 5 ? 'ok' : 'warn') : 'bad'} />
        <Stat label="Dokładność" value={fix ? `±${fix.accuracy.toFixed(1)} m` : '—'} sub="pozioma (HDOP niedostępny)" tone={fix ? (fix.accuracy <= 5 ? 'ok' : 'warn') : 'default'} />
        <Stat label="Prędkość" value={fix && fix.speed >= 0 ? `${(fix.speed * 3.6).toFixed(1)} km/h` : '—'} />
        <Stat label="Kierunek" value={fix && !Number.isNaN(fix.heading) ? `${Math.round(fix.heading)}°` : '—'} sub={fix && !Number.isNaN(fix.heading) ? 'z GNSS' : 'brak z GPS'} />
        <Stat label="Wysokość (npm)" value={fix && fix.altitude != null ? `${fix.altitude.toFixed(0)} m` : 'niedostępna'} />
        <Stat label="Satelity" value="niedostępne" sub="GPS przeglądarki nie podaje" tone="warn" />
        <Stat label="HDOP" value="niedostępny" sub="wymaga NMEA/odbiornika" tone="warn" />
        <Stat label="Pozycja" value={fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : '—'} sub={fix ? new Date(fix.timestamp).toLocaleTimeString('pl-PL') : ''} />
      </div>

      {/* LIVE NMEA — Web Serial */}
      <Card data-testid="serial-panel">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-100">📡 Live NMEA — odbiornik przez Web Serial</h3>
          <Badge tone={serial.supported ? (serial.connected ? 'ok' : 'info') : 'bad'}>{serial.supported ? (serial.connected ? '🟢 POŁĄCZONY' : 'API dostępne') : 'NIEDOSTĘPNE'}</Badge>
        </div>
        {!serial.supported ? (
          <p className="text-sm text-amber-300">Web Serial API niedostępne w tej przeglądarce. Wymagany Chrome/Edge na komputerze (HTTPS). Na telefonie użyj „GPS urządzenia" powyżej lub wklej NMEA poniżej.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select disabled={serial.connected} value={serial.baud} onChange={(e) => serial.setBaud(+e.target.value)} data-testid="serial-baud" className="bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100">
                {BAUD_RATES.map((b) => <option key={b} value={b}>{b} baud</option>)}
              </select>
              {!serial.connected
                ? <Btn data-testid="serial-connect" onClick={serial.connect}>🔌 Podłącz odbiornik GNSS</Btn>
                : <Btn variant="danger" data-testid="serial-disconnect" onClick={serial.disconnect}>Rozłącz</Btn>}
              <span className="text-xs text-slate-400">Wybierz port odbiornika (USB / BT-SPP). Strumień NMEA zasili też Field Pilot (badge „📡 GNSS ZEWN.").</span>
            </div>
            {serial.error && <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/20 p-2 text-sm text-red-300">🔴 {serial.error}</div>}
            {serial.connected && serial.snap && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3" data-testid="serial-live">
                <Stat label="Fix (live)" value={FIX_QUALITY_LABEL[serial.snap.quality]} tone={serial.snap.quality.startsWith('rtk') ? 'ok' : 'default'} />
                <Stat label="Satelity" value={`${serial.snap.satellitesUsed}/${serial.snap.satellitesInView}`} />
                <Stat label="HDOP" value={serial.snap.hdop != null ? String(serial.snap.hdop) : '—'} />
                <Stat label="Pozycja" value={serial.snap.lat != null ? `${serial.snap.lat.toFixed(5)}, ${serial.snap.lng!.toFixed(5)}` : '—'} />
              </div>
            )}
            {serial.lines.length > 0 && (
              <div className="mt-2 max-h-28 overflow-y-auto font-mono text-[10px] text-emerald-300/80 space-y-0.5">
                {serial.lines.map((l, i) => <div key={i} className="truncate">{l}</div>)}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Odbiornik zewnętrzny — przygotowane do integracji */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-100">📡 Zewnętrzny odbiornik GNSS</h3>
          <Badge tone="info">PRZYGOTOWANE DO INTEGRACJI</Badge>
        </div>
        <p className="text-sm text-slate-400 mb-3">Interfejs przygotowany do podłączenia profesjonalnego odbiornika (RTK/DGPS) przez Bluetooth, USB (Serial) lub Wi-Fi/NMEA. Aplikacja nie tworzy fikcyjnego połączenia — poniżej realna dostępność API w tej przeglądarce.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { name: 'Bluetooth / BLE', ok: hasBluetooth, api: 'Web Bluetooth API' },
            { name: 'USB (Serial)', ok: hasSerial, api: 'Web Serial API' },
            { name: 'Wi-Fi / NMEA TCP', ok: false, api: 'wymaga mostka serwerowego' },
          ].map((d) => (
            <div key={d.name} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 text-sm">{d.name}</span>
                <Badge tone={d.ok ? 'ok' : 'bad'}>{d.ok ? 'API dostępne' : 'NOT CONNECTED'}</Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{d.api}</div>
              <Btn variant="outline" className="w-full mt-2 !py-1.5 text-xs" data-testid={`gnss-connect-${d.name}`} disabled={!d.ok}>
                {d.ok ? 'Podłącz odbiornik' : 'Niedostępne'}
              </Btn>
            </div>
          ))}
        </div>
      </Card>

      {/* Parser NMEA */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-100">🔤 Parser NMEA 0183 (GGA / RMC / VTG / GSA / GSV)</h3>
          <Btn variant="ghost" className="!py-1.5 text-xs" data-testid="gnss-load-sample" onClick={() => setNmeaText(SAMPLE)}>Wczytaj przykład</Btn>
        </div>
        <p className="text-sm text-slate-400 mb-3">Wklej zdania NMEA z odbiornika — moduł je sparsuje i pokaże czytelny stan. To ten sam parser, który zasili GNSS Center po podłączeniu odbiornika zewnętrznego.</p>
        <textarea
          data-testid="gnss-nmea-input"
          value={nmeaText}
          onChange={(e) => setNmeaText(e.target.value)}
          spellCheck={false}
          className="w-full h-32 bg-slate-900/70 border border-slate-600 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3" data-testid="gnss-nmea-result">
          <Stat label="Fix (z NMEA)" value={FIX_QUALITY_LABEL[snap.quality]} tone={snap.quality.startsWith('rtk') ? 'ok' : snap.quality === 'invalid' ? 'bad' : 'default'} />
          <Stat label="Satelity użyte / widoczne" value={`${snap.satellitesUsed} / ${snap.satellitesInView}`} />
          <Stat label="HDOP / PDOP" value={`${snap.hdop ?? '—'} / ${snap.pdop ?? '—'}`} />
          <Stat label="Wysokość" value={snap.altitude != null ? `${snap.altitude.toFixed(1)} m` : '—'} />
          <Stat label="Pozycja" value={snap.lat != null ? `${snap.lat.toFixed(5)}, ${snap.lng!.toFixed(5)}` : '—'} />
          <Stat label="Prędkość" value={snap.speedKmh != null ? `${snap.speedKmh.toFixed(1)} km/h` : '—'} />
          <Stat label="Kurs" value={snap.heading != null ? `${snap.heading.toFixed(1)}°` : '—'} />
          <Stat label="Sparsowano zdań" value={`${parsed.length} / ${lines.length}`} />
        </div>
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {lines.map((l, i) => {
            const ok = nmeaChecksum(l);
            const p = parsed.find(() => true);
            return (
              <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                <Badge tone={ok ? 'ok' : 'bad'}>{ok ? 'CRC OK' : 'CRC ✗'}</Badge>
                <span className="text-slate-400 truncate">{l}</span>
                {p && i === 0 && <span className="ml-auto text-emerald-400">{parsed.map((x) => x.type).join(' ')}</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
