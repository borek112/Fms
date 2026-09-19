import { useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, fmtNum, fmtPLN, Input, Modal, ProgressBar, SectionTitle, Select } from '@/components/common';
import type { Machine } from '@/types';

const CATS = ['ciągnik', 'kombajn', 'opryskiwacz', 'rozsiewacz', 'agregat', 'siewnik', 'przyczepa', 'prasa'];
const CAT_ICON: Record<string, string> = { 'ciągnik': '🚜', 'kombajn': '🌾', 'opryskiwacz': '💨', 'rozsiewacz': '🧂', 'agregat': '⚙️', 'siewnik': '🌱', 'przyczepa': '🚛', 'prasa': '📦' };

const empty = (): Omit<Machine, 'id' | 'serviceHistory'> => ({ name: '', category: 'ciągnik', brand: '', model: '', year: 2020, regNo: '', mth: 0, nextServiceMth: 500, fuel: 'ON', consumption: 0, operator: '' });

export default function Machines() {
  const { state, addMachine, updateMachine, deleteMachine, addService, notify } = useFarm();
  const [edit, setEdit] = useState<Machine | Omit<Machine, 'id' | 'serviceHistory'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [serviceFor, setServiceFor] = useState<Machine | null>(null);
  const [svc, setSvc] = useState({ date: new Date().toISOString().slice(0, 10), desc: '', cost: 0 });
  const [cat, setCat] = useState('wszystkie');

  const list = state.machines.filter((m) => cat === 'wszystkie' || m.category === cat);

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) { notify('Podaj nazwę maszyny', 'err'); return; }
    if ('id' in edit) { updateMachine(edit); notify('Maszyna zaktualizowana'); }
    else { addMachine(edit); notify('Maszyna dodana'); }
    setEdit(null);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="🚜 Maszyny i Flota" sub={`${state.machines.length} maszyn · automatyczne alerty serwisowe`}
        right={<Btn onClick={() => setEdit(empty())}>+ Dodaj maszynę</Btn>} />

      <div className="flex gap-1.5 flex-wrap">
        {['wszystkie', ...CATS].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1 rounded-full text-xs border ${cat === c ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{c === 'wszystkie' ? 'wszystkie' : `${CAT_ICON[c]} ${c}`}</button>
        ))}
      </div>

      {list.length === 0 && <Card><EmptyState icon="🚜" text="Brak maszyn w tej kategorii." action={<Btn onClick={() => setEdit(empty())}>+ Dodaj maszynę</Btn>} /></Card>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((m) => {
          const toService = m.nextServiceMth - m.mth;
          const pct = Math.min(100, (m.mth / m.nextServiceMth) * 100);
          const urgent = toService <= 100;
          return (
            <Card key={m.id} className={urgent ? 'border-amber-500/40' : ''}>
              <div className="flex justify-between items-start">
                <div className="text-3xl">{CAT_ICON[m.category] || '🔧'}</div>
                {urgent ? <Badge tone="warn">⚠ serwis za {toService} MTH</Badge> : <Badge tone="ok">sprawna</Badge>}
              </div>
              <h4 className="font-semibold text-slate-100 mt-1">{m.name}</h4>
              <div className="text-xs text-slate-400">{m.brand} {m.model} · {m.year} · {m.regNo}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">MTH</div><div className="text-slate-100 font-semibold">{fmtNum(m.mth, 0)}</div></div>
                <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">Paliwo</div><div className="text-slate-100 font-semibold">{m.fuel}</div></div>
                <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">Spalanie</div><div className="text-slate-100 font-semibold">{m.consumption > 0 ? `${m.consumption} l/h` : '—'}</div></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>Przegląd przy {fmtNum(m.nextServiceMth, 0)} MTH</span><span>{Math.round(pct)}%</span></div>
                <ProgressBar value={m.mth} max={m.nextServiceMth} tone={urgent ? 'warn' : 'ok'} />
              </div>
              {m.operator && <div className="text-xs text-slate-400 mt-2">👷 Operator: {m.operator}</div>}
              {m.serviceHistory.length > 0 && (
                <div className="mt-3 border-t border-slate-700/50 pt-2">
                  <div className="text-[11px] text-slate-500 uppercase mb-1">Ostatni serwis</div>
                  <div className="text-xs text-slate-300">{fmtDate(m.serviceHistory[0].date)} — {m.serviceHistory[0].desc} <span className="text-slate-500">({fmtPLN(m.serviceHistory[0].cost)})</span></div>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Btn variant="outline" className="flex-1 !py-1.5 text-xs" onClick={() => { setServiceFor(m); setSvc({ date: new Date().toISOString().slice(0, 10), desc: '', cost: 0 }); }}>🔧 Zapisz serwis</Btn>
                <Btn variant="ghost" className="!py-1.5 text-xs" onClick={() => setEdit(m)}>✏️</Btn>
                <Btn variant="danger" className="!py-1.5 text-xs" onClick={() => setConfirmDel(m.id)}>🗑️</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* formularz maszyny */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && 'id' in edit ? 'Edycja maszyny' : 'Nowa maszyna'} wide>
        {edit && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nazwa *" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Select label="Kategoria" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
            <Input label="Marka" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} />
            <Input label="Model" value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} />
            <Input label="Rok produkcji" type="number" value={edit.year} onChange={(e) => setEdit({ ...edit, year: +e.target.value })} />
            <Input label="Numer rejestracyjny" value={edit.regNo} onChange={(e) => setEdit({ ...edit, regNo: e.target.value })} />
            <Input label="Moto-godziny (MTH)" type="number" value={edit.mth} onChange={(e) => setEdit({ ...edit, mth: +e.target.value })} />
            <Input label="Następny serwis (MTH)" type="number" value={edit.nextServiceMth} onChange={(e) => setEdit({ ...edit, nextServiceMth: +e.target.value })} />
            <Select label="Paliwo" value={edit.fuel} onChange={(e) => setEdit({ ...edit, fuel: e.target.value })}>{['ON', 'Pb95', 'LPG', '—'].map((x) => <option key={x}>{x}</option>)}</Select>
            <Input label="Spalanie (l/h)" type="number" step="0.5" value={edit.consumption} onChange={(e) => setEdit({ ...edit, consumption: +e.target.value })} />
            <Select label="Operator" value={edit.operator || ''} onChange={(e) => setEdit({ ...edit, operator: e.target.value })}>
              <option value="">— brak —</option>
              {state.workers.map((w) => <option key={w.id}>{w.name}</option>)}
            </Select>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEdit(null)}>Anuluj</Btn>
              <Btn onClick={save}>Zapisz</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* serwis */}
      <Modal open={!!serviceFor} onClose={() => setServiceFor(null)} title={`Serwis: ${serviceFor?.name}`}>
        <div className="grid gap-3">
          <Input label="Data" type="date" value={svc.date} onChange={(e) => setSvc({ ...svc, date: e.target.value })} />
          <Input label="Zakres (np. wymiana oleju, filtry, opony, atestacja opryskiwacza)" value={svc.desc} onChange={(e) => setSvc({ ...svc, desc: e.target.value })} />
          <Input label="Koszt (zł)" type="number" value={svc.cost || ''} onChange={(e) => setSvc({ ...svc, cost: +e.target.value })} />
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setServiceFor(null)}>Anuluj</Btn>
            <Btn onClick={() => {
              if (!svc.desc.trim()) { notify('Opisz zakres serwisu', 'err'); return; }
              if (serviceFor) {
                addService(serviceFor.id, svc);
                updateMachine({ ...serviceFor, nextServiceMth: serviceFor.mth + 500, serviceHistory: [{ id: 'x', ...svc }, ...serviceFor.serviceHistory] });
                notify('Serwis zapisany, koszt dodany');
              }
              setServiceFor(null);
            }}>Zapisz serwis</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteMachine(confirmDel); notify('Maszyna usunięta'); } }} text="Czy na pewno usunąć tę maszynę z floty?" />
    </div>
  );
}
