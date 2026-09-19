import type { GpsStatusKind } from '@/hooks/useGps';

export function GpsStatus({
  status,
  accuracy,
  night,
  isDemo,
}: {
  status: GpsStatusKind;
  accuracy: number | null;
  night: boolean;
  isDemo: boolean;
}) {
  const map: Record<GpsStatusKind, { dot: string; label: string; icon: string }> = {
    fix: { dot: night ? 'bg-[#ff5a52]' : 'bg-emerald-400', label: 'FIX', icon: '🟢' },
    weak: { dot: 'bg-amber-400', label: 'SŁABY', icon: '🟡' },
    none: { dot: 'bg-red-500', label: 'BRAK', icon: '🔴' },
  };
  const s = map[status];
  const acc = accuracy ?? null;
  const warn = acc !== null && acc > 10 ? 'critical' : acc !== null && acc > 5 ? 'warn' : null;

  return (
    <div className="space-y-1" data-testid="gps-status">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.dot} ${status === 'fix' ? 'animate-pulse' : ''}`} />
        <span className={`text-sm font-bold ${night ? 'text-[#ff5a52]' : 'text-slate-100'}`}>
          {isDemo ? 'DEMO' : `GPS ${s.label}`}
        </span>
        {acc !== null && (
          <span className={`text-sm font-semibold tabular-nums ${night ? 'text-[#ff5a52]/80' : 'text-slate-300'}`}>
            ±{acc.toFixed(1)} m
          </span>
        )}
      </div>
      {!isDemo && warn === 'warn' && (
        <div className="text-[11px] font-bold text-amber-400" data-testid="gps-warn-low">⚠ NISKA DOKŁADNOŚĆ GPS</div>
      )}
      {!isDemo && warn === 'critical' && (
        <div className="text-[11px] font-bold text-red-400" data-testid="gps-warn-critical">
          🔴 GPS NIEWYSTARCZAJĄCY DO PRECYZYJNEGO PROWADZENIA
        </div>
      )}
    </div>
  );
}
