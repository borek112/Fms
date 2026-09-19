import type { GuidanceInfo } from '@/hooks/useFieldGuidance';

const QUALITY_LABEL: Record<string, string> = {
  ideal: 'IDEALNIE',
  good: 'DOBRZE',
  correct: 'KOREKTA',
  large: 'DUŻA KOREKTA',
};

export function GuidanceBar({ info, night }: { info: GuidanceInfo; night: boolean }) {
  const { xte, steer, quality, activeLine } = info;
  const cells = 11;
  const center = Math.floor(cells / 2);
  // pozycja na lewo/prawo od linii; jesteś na +normal (lewo) gdy xte>0 → kropka po lewej
  const devCells = Math.max(-center, Math.min(center, Math.round(-xte / 0.2)));
  const dotIndex = center + devCells;

  const qColor = (active: boolean, dist: number) => {
    if (!active) return night ? 'bg-[#1a0505]' : 'bg-slate-800';
    if (dist === 0) return night ? 'bg-[#ff5a52]' : 'bg-emerald-400';
    if (dist <= 1) return night ? 'bg-[#ff3b30]' : 'bg-lime-400';
    if (dist <= 2) return night ? 'bg-[#ff3b30]' : 'bg-amber-400';
    return night ? 'bg-[#b00000]' : 'bg-red-500';
  };

  const qText = night ? 'text-[#ff5a52]' : quality === 'ideal' ? 'text-emerald-400' : quality === 'good' ? 'text-lime-400' : quality === 'correct' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="w-full select-none" data-testid="guidance-lightbar">
      {/* strzałki kierunku korekty */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className={`text-3xl sm:text-4xl font-black transition-opacity ${steer === 'left' ? (night ? 'text-[#ff3b30] opacity-100' : 'text-emerald-400 opacity-100') : 'opacity-15'}`}>←</div>
        <div className={`text-center ${qText}`}>
          <div className="text-4xl sm:text-6xl font-black tabular-nums leading-none" data-testid="xte-value">
            {xte >= 0 ? '+' : ''}{xte.toFixed(2)}<span className="text-xl sm:text-2xl"> m</span>
          </div>
          <div className="text-xs sm:text-sm font-bold tracking-widest mt-1">{QUALITY_LABEL[quality]}</div>
        </div>
        <div className={`text-3xl sm:text-4xl font-black transition-opacity ${steer === 'right' ? (night ? 'text-[#ff3b30] opacity-100' : 'text-emerald-400 opacity-100') : 'opacity-15'}`}>→</div>
      </div>

      {/* pasek świetlny */}
      <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
        {Array.from({ length: cells }).map((_, i) => {
          const dist = Math.abs(i - center);
          const active = i === dotIndex || (dotIndex > center && i > center && i <= dotIndex) || (dotIndex < center && i < center && i >= dotIndex) || (dotIndex === center && i === center);
          const isCenterCell = i === center;
          return (
            <div
              key={i}
              className={`h-8 sm:h-12 flex-1 max-w-[42px] rounded-sm transition-colors duration-150 ${qColor(active, dist)} ${isCenterCell ? (night ? 'ring-1 ring-[#ff5a52]/60' : 'ring-1 ring-emerald-300/60') : ''}`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 px-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
        <span className={steer === 'left' ? qText : 'opacity-40'}>← Skręć w lewo</span>
        <span className={night ? 'text-[#ff5a52]/70' : 'text-slate-400'}>{activeLine ? activeLine.label : '—'}</span>
        <span className={steer === 'right' ? qText : 'opacity-40'}>Skręć w prawo →</span>
      </div>
    </div>
  );
}
