export function Compass({
  heading,
  speed,
  night,
  fromGps,
}: {
  heading: number | null;
  speed: number; // km/h
  night: boolean;
  fromGps: boolean;
}) {
  const h = heading ?? 0;
  const ring = night ? 'border-[#ff3b30]/50' : 'border-slate-600';
  const txt = night ? 'text-[#ff5a52]' : 'text-slate-100';
  const accent = night ? 'text-[#ff3b30]' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-4" data-testid="pilot-compass">
      <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 ${ring} flex items-center justify-center shrink-0`}>
        {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
          <span
            key={d}
            className={`absolute text-[10px] font-bold ${d === 'N' ? accent : night ? 'text-[#ff5a52]/60' : 'text-slate-400'}`}
            style={{
              top: i === 0 ? '4px' : i === 2 ? 'auto' : '50%',
              bottom: i === 2 ? '4px' : 'auto',
              left: i === 3 ? '6px' : i === 1 ? 'auto' : '50%',
              right: i === 1 ? '6px' : 'auto',
              transform: i === 0 || i === 2 ? 'translateX(-50%)' : 'translateY(-50%)',
            }}
          >
            {d}
          </span>
        ))}
        <div
          className="absolute w-1.5 h-10 sm:h-12 origin-bottom bottom-1/2 rounded-full transition-transform duration-200"
          style={{ transform: `rotate(${h}deg)`, background: night ? '#ff3b30' : '#10b981' }}
        />
        <div className={`w-2.5 h-2.5 rounded-full ${night ? 'bg-[#ff5a52]' : 'bg-emerald-300'}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-[10px] uppercase tracking-widest ${night ? 'text-[#ff5a52]/70' : 'text-slate-400'}`}>Kierunek</div>
        <div className={`text-3xl sm:text-4xl font-black tabular-nums ${txt}`} data-testid="compass-heading">
          {heading === null ? '––' : Math.round(h)}°
        </div>
        <div className={`text-[10px] uppercase tracking-widest mt-2 ${night ? 'text-[#ff5a52]/70' : 'text-slate-400'}`}>Prędkość</div>
        <div className={`text-2xl sm:text-3xl font-black tabular-nums ${accent}`} data-testid="compass-speed">
          {speed.toFixed(1)} <span className="text-sm">km/h</span>
        </div>
        {!fromGps && heading !== null && (
          <div className={`text-[10px] mt-1 ${night ? 'text-[#ff5a52]/60' : 'text-slate-500'}`}>Kierunek z ruchu GPS</div>
        )}
      </div>
    </div>
  );
}
