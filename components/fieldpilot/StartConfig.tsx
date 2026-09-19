import { useFarm } from '@/store/FarmContext';
import type { PilotMode } from '@/types';

export interface PilotConfig {
  fieldId: string;
  treatmentType: string;
  tractorId: string;
  machineId: string;
  width: number;
  mode: PilotMode;
  operator: string;
  passes: number;
  accuracyPref: string;
}

const TREATMENTS = ['oprysk', 'nawożenie', 'siew', 'orka', 'talerzowanie', 'agregatowanie', 'wałowanie', 'zbiór', 'transport'];
const MODES: { v: PilotMode; label: string; desc: string }[] = [
  { v: 'AB', label: 'AB', desc: 'linia prosta A→B' },
  { v: 'A+', label: 'A+', desc: 'A + kurs' },
  { v: 'kontur', label: 'Kontur', desc: 'okrążenie pola' },
  { v: 'równoległe', label: 'Równoległe', desc: 'linie równoległe' },
];
const WIDTHS = [3, 4.5, 6, 8, 12, 18, 24, 36];

const selCls = 'w-full bg-slate-800 border border-slate-600 rounded-xl px-3 min-h-[52px] text-base text-slate-100 focus:outline-none focus:border-emerald-500';

export function StartConfig({
  config,
  setConfig,
  onStart,
}: {
  config: PilotConfig;
  setConfig: (c: PilotConfig) => void;
  onStart: () => void;
}) {
  const { state } = useFarm();
  const set = (p: Partial<PilotConfig>) => setConfig({ ...config, ...p });
  const tractors = state.machines.filter((m) => m.category === 'ciągnik');
  const implements_ = state.machines.filter((m) => m.category !== 'ciągnik');
  const canStart = !!config.fieldId && config.width > 0;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8" data-testid="pilot-config">
      <div className="text-center">
        <div className="text-3xl">🚜</div>
        <h1 className="text-2xl font-black text-emerald-400 mt-1">FMS FIELD PILOT</h1>
        <p className="text-xs text-slate-400">Profesjonalna nawigacja GNSS dla prac polowych</p>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Pole *</span>
        <select data-testid="config-field" className={selCls} value={config.fieldId} onChange={(e) => set({ fieldId: e.target.value })}>
          <option value="">— wybierz pole —</option>
          {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.area} ha</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Zabieg</span>
        <select data-testid="config-treatment" className={selCls} value={config.treatmentType} onChange={(e) => set({ treatmentType: e.target.value })}>
          {TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Ciągnik</span>
          <select data-testid="config-tractor" className={selCls} value={config.tractorId} onChange={(e) => set({ tractorId: e.target.value })}>
            <option value="">— wybierz ciągnik —</option>
            {tractors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Maszyna</span>
          <select data-testid="config-machine" className={selCls} value={config.machineId} onChange={(e) => set({ machineId: e.target.value })}>
            <option value="">— wybierz maszynę —</option>
            {implements_.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Szerokość robocza</span>
        <div className="flex items-center gap-2">
          <input
            data-testid="config-width"
            type="number"
            step="0.1"
            min="0.5"
            value={config.width}
            onChange={(e) => set({ width: Math.max(0.5, +e.target.value || 0) })}
            className="w-28 bg-slate-800 border border-slate-600 rounded-xl px-3 min-h-[52px] text-2xl font-black text-emerald-400 tabular-nums focus:outline-none focus:border-emerald-500"
          />
          <span className="text-lg text-slate-400 font-bold">m</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {WIDTHS.map((w) => (
            <button key={w} data-testid={`width-preset-${w}`} onClick={() => set({ width: w })}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-bold border ${config.width === w ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600 text-slate-300'}`}>
              {w.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">GNSS</span>
          <select className={selCls} value={config.accuracyPref} onChange={(e) => set({ accuracyPref: e.target.value })}>
            <option value="auto">automatyczna</option>
            <option value="high">wysoka</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Operator</span>
          <input list="pilot-operators" data-testid="config-operator" className={selCls} value={config.operator} placeholder="imię / wybierz" onChange={(e) => set({ operator: e.target.value })} />
          <datalist id="pilot-operators">
            {state.workers.map((w) => <option key={w.id} value={w.name} />)}
          </datalist>
        </label>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Tryb prowadzenia</span>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button key={m.v} data-testid={`mode-${m.v}`} onClick={() => set({ mode: m.v })}
              className={`min-h-[56px] rounded-xl border px-3 text-left ${config.mode === m.v ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-300'}`}>
              <div className="font-bold">{m.label}</div>
              <div className="text-[11px] opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {config.mode === 'kontur' && (
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">Liczba okrążeń</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((p) => (
              <button key={p} onClick={() => set({ passes: p })}
                className={`min-h-[44px] flex-1 rounded-xl border font-bold ${config.passes === p ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600 text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        data-testid="start-work-btn"
        disabled={!canStart}
        onClick={onStart}
        className="w-full min-h-[64px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xl font-black tracking-wide transition-colors"
      >
        🚀 ROZPOCZNIJ PRACĘ
      </button>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        System wspomaga prowadzenie pojazdu. Operator odpowiada za bezpieczną obsługę maszyny i obserwację otoczenia.
      </p>
    </div>
  );
}
