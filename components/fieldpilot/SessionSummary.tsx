import type { FieldWorkSession } from '@/types';
import { Btn } from '@/components/common';
import { NavigationMap } from './NavigationMap';

function hhmm(startISO: string, endISO?: string): string {
  const a = new Date(startISO).getTime();
  const b = endISO ? new Date(endISO).getTime() : Date.now();
  const sec = Math.max(0, Math.round((b - a) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
    <span className="text-sm text-slate-400">{label}</span>
    <span className="text-sm font-bold text-slate-100 text-right">{value}</span>
  </div>
);

export function SessionSummary({
  session,
  onClose,
  onHistory,
}: {
  session: FieldWorkSession;
  onClose: () => void;
  onHistory: () => void;
}) {
  const track = session.track.map((p) => [p.lat, p.lng] as [number, number]);
  return (
    <div className="max-w-lg mx-auto space-y-4" data-testid="session-summary">
      <div className="text-center">
        <div className="text-4xl mb-1">✅</div>
        <h2 className="text-xl font-black text-emerald-400">RAPORT PRACY</h2>
        <p className="text-xs text-slate-500">Zapisano automatycznie w Dzienniku Polowym</p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden h-52">
        <NavigationMap
          fieldGeo={[]}
          geometry={null}
          activeLabel={null}
          position={null}
          track={track}
          contour={session.contour}
          pointA={session.pointA}
          pointB={session.pointB}
          night={false}
          follow={false}
        />
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2">
        <Row label="Pole" value={session.fieldName} />
        <Row label="Zabieg" value={session.treatmentType} />
        <Row label="Uprawa" value={session.crop || '—'} />
        <Row label="Operator" value={session.operator || '—'} />
        <Row label="Szerokość robocza" value={`${session.implementWidth.toFixed(2)} m`} />
        <Row label="Tryb" value={session.mode} />
        <Row label="Czas" value={hhmm(session.startedAt, session.endedAt)} />
        <Row label="Dystans" value={`${(session.distance / 1000).toFixed(1)} km`} />
        <Row label="Powierzchnia" value={`${session.areaCovered.toFixed(1)} ha`} />
        <Row label="Pokrycie (estymacja GPS)" value={`${Math.round(session.coveragePercent)}%`} />
        <Row label="Średnia prędkość" value={`${session.averageSpeed.toFixed(1)} km/h`} />
        <Row label="Średnia dokładność" value={session.isDemo ? 'DEMO' : `${session.averageAccuracy.toFixed(1)} m`} />
        <Row label="Liczba linii" value={String(session.totalLines)} />
      </div>

      {session.isDemo && (
        <div className="text-center text-xs font-bold text-amber-400">🧪 Sesja demonstracyjna — dane symulowane</div>
      )}

      <div className="flex gap-2">
        <Btn variant="ghost" className="flex-1 !py-3" onClick={onHistory}>📋 Historia prac</Btn>
        <Btn className="flex-1 !py-3" onClick={onClose}>Zakończ</Btn>
      </div>
    </div>
  );
}
