import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, fmtNum, fmtPLN, Input, SectionTitle, Select, Textarea } from '@/components/common';
import type { Treatment } from '@/types';

export const TREATMENT_TYPES = ['oprysk', 'nawożenie', 'siew', 'orka', 'talerzowanie', 'agregatowanie', 'wałowanie', 'zbiór', 'transport'];
const T_ICON: Record<string, string> = { 'oprysk': '💨', 'nawożenie': '🧪', 'siew': '🌱', 'orka': '🚜', 'talerzowanie': '⚙️', 'agregatowanie': '⚙️', 'wałowanie': '🛞', 'zbiór': '🌾', 'transport': '🚛' };

export default function Diary() {
  const { state, addTreatment, deleteTreatment, notify } = useFarm();
  const [form, setForm] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('wszystkie');
  const [filterField, setFilterField] = useState('wszystkie');
  const [t, setT] = useState<Partial<Treatment>>({ type: 'oprysk', date: '2026-08-06', season: 2026, cost: 0 });

  const list = useMemo(() => state.treatments
    .filter((x) => (filterType === 'wszystkie' || x.type === filterType) && (filterField === 'wszystkie' || x.fieldId === filterField))
    .sort((a, b) => b.date.localeCompare(a.date)), [state.treatments, filterType, filterField]);

  const field = state.fields.find((f) => f.id === t.fieldId);
  const qty = t.dose && field ? t.dose * field.area : 0;

  const save = () => {
    if (!t.fieldId) { notify('Wybierz pole', 'err'); return; }
    const fc = state.fieldCrops.find((c) => c.fieldId === t.fieldId && c.season === 2026);
    const product = state.warehouse.find((w) => w.id === t.productId);
    addTreatment({
      date: t.date!, type: t.type!, fieldId: t.fieldId, crop: t.crop || fc?.cropName || '—',
      machineId: t.machineId, operator: t.operator, productId: t.productId,
      productName: product?.name || t.productName, dose: t.dose, quantity: qty || t.quantity,
      weather: t.weather, notes: t.notes, cost: t.cost || 0, season: 2026,
    });
    notify(product && qty ? `Zabieg zapisany — odjęto ${fmtNum(qty, 1)} ${product.unit} z magazynu` : 'Zabieg zapisany w dzienniku');
    setForm(false); setStep(1);
    setT({ type: 'oprysk', date: '2026-08-06', season: 2026, cost: 0 });
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="📋 Dziennik Polowy" sub="Szybki zapis zabiegu — maksymalnie 3 kroki. Zabieg automatycznie aktualizuje magazyn, finanse i historię pola."
        right={<Btn className="!text-base !px-5 !py-2.5" onClick={() => setForm(true)}>+ DODAJ ZABIEG</Btn>} />

      <div className="flex flex-wrap gap-2">
        <Select label="" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-40">
          <option value="wszystkie">wszystkie typy</option>
          {TREATMENT_TYPES.map((x) => <option key={x}>{x}</option>)}
        </Select>
        <Select label="" value={filterField} onChange={(e) => setFilterField(e.target.value)} className="!w-52">
          <option value="wszystkie">wszystkie pola</option>
          {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </div>

      {list.length === 0 && <Card><EmptyState icon="📋" text="Brak zabiegów dla wybranych filtrów." action={<Btn onClick={() => setForm(true)}>+ Dodaj pierwszy zabieg</Btn>} /></Card>}

      <div className="space-y-2">
        {list.map((x) => {
          const f = state.fields.find((q) => q.id === x.fieldId);
          const m = state.machines.find((q) => q.id === x.machineId);
          return (
            <Card key={x.id} className="!p-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="text-2xl">{T_ICON[x.type] || '📋'}</span>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={x.type === 'oprysk' ? 'warn' : x.type === 'zbiór' ? 'ok' : 'info'}>{x.type}</Badge>
                    <span className="font-medium text-slate-100 text-sm">{f?.name} — {x.crop}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    📅 {fmtDate(x.date)}
                    {x.productName ? ` · 🧴 ${x.productName}${x.dose ? ` ${x.dose} ${x.type === 'oprysk' ? 'l' : 'kg'}/ha` : ''}${x.quantity ? ` (razem ${fmtNum(x.quantity, 1)})` : ''}` : ''}
                    {m ? ` · 🚜 ${m.name}` : ''}{x.operator ? ` · 👷 ${x.operator}` : ''}
                    {x.weather ? ` · 🌦️ ${x.weather}` : ''}
                  </div>
                  {x.notes && <div className="text-xs text-slate-500 mt-0.5">📝 {x.notes}</div>}
                </div>
                <div className="text-sm text-slate-200 font-medium">{fmtPLN(x.cost)}</div>
                <Btn variant="danger" className="!py-1 !px-2 text-xs" onClick={() => setConfirmDel(x.id)}>🗑️</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* formularz 3-krokowy */}
      {form && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setForm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 sticky top-0 bg-slate-900">
              <h3 className="font-semibold text-slate-100">Nowy zabieg — krok {step}/3</h3>
              <button onClick={() => setForm(false)} className="text-slate-400 hover:text-slate-100 text-xl">✕</button>
            </div>
            <div className="p-5">
              <div className="flex gap-1.5 mb-5">
                {[1, 2, 3].map((s) => <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-slate-700'}`} />)}
              </div>

              {step === 1 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Typ zabiegu:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {TREATMENT_TYPES.map((x) => (
                      <button key={x} onClick={() => setT({ ...t, type: x })}
                        className={`rounded-lg border p-3 text-center transition-colors ${t.type === x ? 'border-emerald-500 bg-emerald-900/30' : 'border-slate-700 hover:border-slate-500'}`}>
                        <div className="text-2xl">{T_ICON[x]}</div>
                        <div className="text-xs text-slate-200 mt-1">{x}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4"><Input label="Data" type="date" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })} /></div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3">
                  <Select label="Pole *" value={t.fieldId || ''} onChange={(e) => {
                    const fid = e.target.value;
                    const fc = state.fieldCrops.find((c) => c.fieldId === fid && c.season === 2026);
                    setT({ ...t, fieldId: fid, crop: fc?.cropName });
                  }}>
                    <option value="">— wybierz pole —</option>
                    {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtNum(f.area)} ha)</option>)}
                  </Select>
                  <Input label="Uprawa" value={t.crop || ''} onChange={(e) => setT({ ...t, crop: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Maszyna" value={t.machineId || ''} onChange={(e) => setT({ ...t, machineId: e.target.value || undefined })}>
                      <option value="">— brak —</option>
                      {state.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                    <Select label="Operator" value={t.operator || ''} onChange={(e) => setT({ ...t, operator: e.target.value || undefined })}>
                      <option value="">— brak —</option>
                      {state.workers.map((w) => <option key={w.id}>{w.name}</option>)}
                    </Select>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 p-2.5 text-xs text-slate-400 flex items-center gap-2">
                    📍 GPS: moduł przygotowany — po podłączeniu lokalizacji zabieg będzie przypisywany automatycznie do pola.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-3">
                  <Select label="Produkt z magazynu" value={t.productId || ''} onChange={(e) => setT({ ...t, productId: e.target.value || undefined })}>
                    <option value="">— brak / zabieg bez produktu —</option>
                    {state.warehouse.map((w) => <option key={w.id} value={w.id}>{w.name} (stan: {fmtNum(w.stock, 0)} {w.unit})</option>)}
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label={`Dawka (${t.type === 'oprysk' ? 'l' : 'kg'}/ha)`} type="number" step="0.1" value={t.dose || ''} onChange={(e) => setT({ ...t, dose: +e.target.value })} />
                    <Input label="Koszt zabiegu (zł)" type="number" value={t.cost || ''} onChange={(e) => setT({ ...t, cost: +e.target.value })} />
                  </div>
                  {t.dose && field && <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-600/40 rounded-lg p-2">Razem na pole {field.name}: <b>{fmtNum(qty, 1)}</b> — zostanie odjęte z magazynu</div>}
                  <Input label="Warunki pogodowe" placeholder="np. 18°C, wiatr 2 m/s" value={t.weather || ''} onChange={(e) => setT({ ...t, weather: e.target.value })} />
                  <Textarea label="Uwagi" value={t.notes || ''} onChange={(e) => setT({ ...t, notes: e.target.value })} />
                </div>
              )}

              <div className="flex justify-between mt-5">
                <Btn variant="ghost" onClick={() => (step === 1 ? setForm(false) : setStep(step - 1))}>{step === 1 ? 'Anuluj' : '← Wstecz'}</Btn>
                {step < 3
                  ? <Btn onClick={() => { if (step === 2 && !t.fieldId) { notify('Wybierz pole', 'err'); return; } setStep(step + 1); }}>Dalej →</Btn>
                  : <Btn onClick={save}>✔ Zapisz zabieg</Btn>}
              </div>
            </div>
          </div>
        </div>
      )}

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteTreatment(confirmDel); notify('Wpis usunięty'); } }} text="Usunąć ten wpis z dziennika polowego?" />
    </div>
  );
}
