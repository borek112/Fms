import { useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, fmtNum, fmtPLN, Input, Modal, ProgressBar, SectionTitle, Select } from '@/components/common';
import type { WarehouseItem } from '@/types';

const CATS = ['nasiona', 'nawozy', 'ŚOR', 'paliwo', 'części', 'materiały'];
const CAT_ICON: Record<string, string> = { 'nasiona': '🌱', 'nawozy': '🧪', 'ŚOR': '🧴', 'paliwo': '⛽', 'części': '🔩', 'materiały': '📦' };
const empty = (): Omit<WarehouseItem, 'id' | 'history'> => ({ name: '', category: 'nawozy', producer: '', unit: 'kg', stock: 0, minStock: 0, price: 0, supplier: '', purchaseDate: new Date().toISOString().slice(0, 10) });

export default function Warehouse() {
  const { state, addWarehouseItem, updateWarehouseItem, deleteWarehouseItem, warehouseOp, refuel, fuelUse, grainOp, addGrain, notify } = useFarm();
  const [tab, setTab] = useState<'magazyn' | 'paliwo' | 'plody'>('magazyn');
  const [cat, setCat] = useState('wszystkie');
  const [edit, setEdit] = useState<WarehouseItem | Omit<WarehouseItem, 'id' | 'history'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [opFor, setOpFor] = useState<WarehouseItem | null>(null);
  const [op, setOp] = useState({ type: 'przyjęcie' as 'przyjęcie' | 'rozchód' | 'korekta', qty: 0, note: '' });
  const [histFor, setHistFor] = useState<WarehouseItem | null>(null);
  const [refuelFor, setRefuelFor] = useState<string | null>(null);
  const [rf, setRf] = useState({ qty: 0, price: 6.1 });
  const [useFor, setUseFor] = useState<string | null>(null);
  const [fu, setFu] = useState({ qty: 0, machine: '' });
  const [grainFor, setGrainFor] = useState<string | null>(null);
  const [go, setGo] = useState({ type: 'sprzedaż' as 'sprzedaż' | 'przyjęcie' | 'ubytek', qty: 0, price: 0 });
  const [newGrain, setNewGrain] = useState(false);
  const [ng, setNg] = useState({ crop: 'Pszenica ozima', qty: 0, storage: 'Silo A', moisture: 14, harvestDate: new Date().toISOString().slice(0, 10), currentPrice: 800 });

  const items = state.warehouse.filter((w) => cat === 'wszystkie' || w.category === cat);
  const lowStock = state.warehouse.filter((w) => w.stock <= w.minStock);

  const saveItem = () => {
    if (!edit) return;
    if (!edit.name.trim()) { notify('Podaj nazwę produktu', 'err'); return; }
    if ('id' in edit) { updateWarehouseItem(edit); notify('Produkt zaktualizowany'); }
    else { addWarehouseItem(edit); notify('Produkt dodany'); }
    setEdit(null);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="📦 Magazyn Gospodarstwa" sub="Przyjęcia, rozchody, korekty — produkty odejmują się automatycznie po zapisaniu zabiegu"
        right={<Btn onClick={() => setEdit(empty())}>+ Dodaj produkt</Btn>} />

      {lowStock.length > 0 && tab === 'magazyn' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-sm text-amber-200">
          ⚠️ <b>Niski stan magazynowy:</b> {lowStock.map((w) => `${w.name} (${fmtNum(w.stock, 0)} ${w.unit})`).join(' · ')}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-700/50 pb-1 overflow-x-auto">
        {[['magazyn', '📦 Magazyn środków'], ['paliwo', '⛽ Magazyn paliwa'], ['plody', '🌾 Magazyn płodów rolnych']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)} className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg ${tab === k ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {tab === 'magazyn' && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {['wszystkie', ...CATS].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`px-3 py-1 rounded-full text-xs border ${cat === c ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{c === 'wszystkie' ? 'wszystkie' : `${CAT_ICON[c]} ${c}`}</button>
            ))}
          </div>
          {items.length === 0 && <Card><EmptyState icon="📦" text="Brak produktów w tej kategorii." action={<Btn onClick={() => setEdit(empty())}>+ Dodaj produkt</Btn>} /></Card>}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((w) => {
              const low = w.stock <= w.minStock;
              return (
                <Card key={w.id} className={low ? 'border-amber-500/40' : ''}>
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">{CAT_ICON[w.category]}</span>
                    {low ? <Badge tone="warn">niski stan</Badge> : <Badge tone="ok">OK</Badge>}
                  </div>
                  <h4 className="font-semibold text-slate-100 mt-1 text-sm">{w.name}</h4>
                  <div className="text-xs text-slate-400">{w.producer} · {w.supplier}</div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={low ? 'text-amber-400 font-semibold' : 'text-slate-100 font-semibold'}>{fmtNum(w.stock, 0)} {w.unit}</span>
                      <span className="text-xs text-slate-500">min. {fmtNum(w.minStock, 0)}</span>
                    </div>
                    <ProgressBar value={w.stock} max={Math.max(w.minStock * 2, w.stock)} tone={w.stock === 0 ? 'bad' : low ? 'warn' : 'ok'} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>{fmtPLN(w.price)}/{w.unit}</span>
                    <span>wartość: <b className="text-slate-200">{fmtPLN(w.stock * w.price)}</b></span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Btn variant="outline" className="flex-1 !py-1.5 text-xs" onClick={() => { setOpFor(w); setOp({ type: 'przyjęcie', qty: 0, note: '' }); }}>⇄ Operacja</Btn>
                    <Btn variant="ghost" className="!py-1.5 text-xs" onClick={() => setHistFor(w)}>🕘</Btn>
                    <Btn variant="ghost" className="!py-1.5 text-xs" onClick={() => setEdit(w)}>✏️</Btn>
                    <Btn variant="danger" className="!py-1.5 text-xs" onClick={() => setConfirmDel(w.id)}>🗑️</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === 'paliwo' && (
        <div className="grid md:grid-cols-2 gap-4">
          {state.fuelTanks.map((t) => (
            <Card key={t.id}>
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-100">⛽ {t.name}</h4>
                <Badge tone={t.current / t.capacity < 0.3 ? 'warn' : 'ok'}>{Math.round((t.current / t.capacity) * 100)}%</Badge>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-100 font-semibold">{fmtNum(t.current, 0)} l</span>
                  <span className="text-slate-500 text-xs">pojemność {fmtNum(t.capacity, 0)} l</span>
                </div>
                <ProgressBar value={t.current} max={t.capacity} tone={t.current / t.capacity < 0.3 ? 'warn' : 'ok'} />
              </div>
              <div className="flex gap-2 mt-3">
                <Btn className="flex-1 !py-1.5 text-xs" onClick={() => { setRefuelFor(t.id); setRf({ qty: 0, price: 6.1 }); }}>+ Tankowanie</Btn>
                <Btn variant="outline" className="flex-1 !py-1.5 text-xs" onClick={() => { setUseFor(t.id); setFu({ qty: 0, machine: state.machines[0]?.name || '' }); }}>− Zużycie</Btn>
              </div>
              <div className="mt-3 border-t border-slate-700/50 pt-2 space-y-1">
                {t.history.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex justify-between text-xs text-slate-400">
                    <span>{fmtDate(h.date)} · {h.type}{h.machine ? ` · ${h.machine}` : ''}</span>
                    <span className={h.type === 'tankowanie' ? 'text-emerald-400' : 'text-amber-400'}>{h.type === 'tankowanie' ? '+' : '−'}{fmtNum(h.qty, 0)} l{h.cost ? ` (${fmtPLN(h.cost)})` : ''}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'plody' && (
        <div className="space-y-3">
          <div className="flex justify-end"><Btn onClick={() => setNewGrain(true)}>+ Przyjmij płody</Btn></div>
          <div className="grid md:grid-cols-2 gap-4">
            {state.grain.map((g) => (
              <Card key={g.id}>
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-slate-100">🌾 {g.crop}</h4>
                  <Badge tone="info">{g.storage}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">Ilość</div><div className="text-emerald-400 font-bold text-sm">{fmtNum(g.qty)} t</div></div>
                  <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">Wilgotność</div><div className="text-slate-100 font-semibold">{g.moisture}%</div></div>
                  <div className="rounded bg-slate-900/60 py-1.5"><div className="text-slate-500">Cena</div><div className="text-slate-100 font-semibold">{fmtPLN(g.currentPrice)}/t</div></div>
                </div>
                <div className="text-xs text-slate-400 mt-2">Zbiór: {fmtDate(g.harvestDate)} · wartość: <b className="text-slate-200">{fmtPLN(g.qty * g.currentPrice)}</b></div>
                <div className="flex gap-2 mt-3">
                  <Btn className="flex-1 !py-1.5 text-xs" onClick={() => { setGrainFor(g.id); setGo({ type: 'sprzedaż', qty: 0, price: g.currentPrice }); }}>Sprzedaż / operacja</Btn>
                </div>
                <div className="mt-3 border-t border-slate-700/50 pt-2 space-y-1">
                  {g.history.slice(0, 3).map((h) => (
                    <div key={h.id} className="flex justify-between text-xs text-slate-400">
                      <span>{fmtDate(h.date)} · {h.type}</span>
                      <span className={h.type === 'przyjęcie' ? 'text-emerald-400' : 'text-amber-400'}>{h.type === 'przyjęcie' ? '+' : '−'}{fmtNum(h.qty)} t{h.price ? ` @ ${fmtPLN(h.price)}/t` : ''}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {state.grain.length === 0 && <Card><EmptyState icon="🌾" text="Magazyn płodów pusty." /></Card>}
          </div>
        </div>
      )}

      {/* modale */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && 'id' in edit ? 'Edycja produktu' : 'Nowy produkt'} wide>
        {edit && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nazwa *" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Select label="Kategoria" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
            <Input label="Producent" value={edit.producer} onChange={(e) => setEdit({ ...edit, producer: e.target.value })} />
            <Select label="Jednostka" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>{['kg', 'l', 'szt', 'j.n.', 't'].map((x) => <option key={x}>{x}</option>)}</Select>
            <Input label="Stan" type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: +e.target.value })} />
            <Input label="Minimum magazynowe" type="number" value={edit.minStock} onChange={(e) => setEdit({ ...edit, minStock: +e.target.value })} />
            <Input label="Cena (zł/jedn.)" type="number" step="0.01" value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} />
            <Input label="Dostawca" value={edit.supplier} onChange={(e) => setEdit({ ...edit, supplier: e.target.value })} />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEdit(null)}>Anuluj</Btn>
              <Btn onClick={saveItem}>Zapisz</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!opFor} onClose={() => setOpFor(null)} title={`Operacja: ${opFor?.name}`}>
        <div className="grid gap-3">
          <Select label="Typ operacji" value={op.type} onChange={(e) => setOp({ ...op, type: e.target.value as typeof op.type })}>
            <option value="przyjęcie">Przyjęcie (+)</option><option value="rozchód">Rozchód (−)</option><option value="korekta">Korekta stanu (=)</option>
          </Select>
          <Input label={op.type === 'korekta' ? `Nowy stan (${opFor?.unit})` : `Ilość (${opFor?.unit})`} type="number" value={op.qty || ''} onChange={(e) => setOp({ ...op, qty: +e.target.value })} />
          <Input label="Notatka" value={op.note} onChange={(e) => setOp({ ...op, note: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setOpFor(null)}>Anuluj</Btn>
            <Btn onClick={() => { if (opFor && op.qty > 0) { warehouseOp(opFor.id, op.type, op.qty, op.note || op.type); notify('Operacja zapisana'); } setOpFor(null); }}>Zapisz</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!histFor} onClose={() => setHistFor(null)} title={`Historia: ${histFor?.name}`}>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {histFor?.history.map((h) => (
            <div key={h.id} className="flex justify-between text-sm rounded-lg bg-slate-900/40 border border-slate-700/40 px-3 py-2">
              <span className="text-slate-300">{fmtDate(h.date)} · {h.type} <span className="text-slate-500 text-xs">{h.note}</span></span>
              <span className={h.type === 'przyjęcie' ? 'text-emerald-400' : 'text-amber-400'}>{h.type === 'przyjęcie' ? '+' : h.type === 'rozchód' ? '−' : '='}{fmtNum(h.qty, 0)}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!refuelFor} onClose={() => setRefuelFor(null)} title="Tankowanie zbiornika">
        <div className="grid gap-3">
          <Input label="Ilość (l)" type="number" value={rf.qty || ''} onChange={(e) => setRf({ ...rf, qty: +e.target.value })} />
          <Input label="Cena (zł/l)" type="number" step="0.01" value={rf.price} onChange={(e) => setRf({ ...rf, price: +e.target.value })} />
          <div className="text-sm text-slate-300">Koszt: <b className="text-emerald-400">{fmtPLN(rf.qty * rf.price)}</b> — zostanie dodany do historii kosztów</div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setRefuelFor(null)}>Anuluj</Btn>
            <Btn onClick={() => { if (refuelFor && rf.qty > 0) { refuel(refuelFor, rf.qty, rf.qty * rf.price); notify('Tankowanie zapisane'); } setRefuelFor(null); }}>Zapisz</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!useFor} onClose={() => setUseFor(null)} title="Zużycie paliwa">
        <div className="grid gap-3">
          <Input label="Ilość (l)" type="number" value={fu.qty || ''} onChange={(e) => setFu({ ...fu, qty: +e.target.value })} />
          <Select label="Maszyna" value={fu.machine} onChange={(e) => setFu({ ...fu, machine: e.target.value })}>
            {state.machines.map((m) => <option key={m.id}>{m.name}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setUseFor(null)}>Anuluj</Btn>
            <Btn onClick={() => { if (useFor && fu.qty > 0) { fuelUse(useFor, fu.qty, fu.machine); notify('Zużycie zapisane'); } setUseFor(null); }}>Zapisz</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!grainFor} onClose={() => setGrainFor(null)} title="Operacja na płodach">
        <div className="grid gap-3">
          <Select label="Typ" value={go.type} onChange={(e) => setGo({ ...go, type: e.target.value as typeof go.type })}>
            <option value="sprzedaż">Sprzedaż</option><option value="przyjęcie">Przyjęcie</option><option value="ubytek">Ubytek</option>
          </Select>
          <Input label="Ilość (t)" type="number" step="0.1" value={go.qty || ''} onChange={(e) => setGo({ ...go, qty: +e.target.value })} />
          {go.type === 'sprzedaż' && <Input label="Cena (zł/t)" type="number" value={go.price || ''} onChange={(e) => setGo({ ...go, price: +e.target.value })} />}
          {go.type === 'sprzedaż' && <div className="text-sm text-slate-300">Przychód: <b className="text-emerald-400">{fmtPLN(go.qty * go.price)}</b></div>}
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setGrainFor(null)}>Anuluj</Btn>
            <Btn onClick={() => { if (grainFor && go.qty > 0) { grainOp(grainFor, go.type, go.qty, go.type === 'sprzedaż' ? go.price : undefined); notify('Operacja zapisana'); } setGrainFor(null); }}>Zapisz</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={newGrain} onClose={() => setNewGrain(false)} title="Przyjęcie płodów rolnych">
        <div className="grid gap-3">
          <Input label="Rodzaj" value={ng.crop} onChange={(e) => setNg({ ...ng, crop: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ilość (t)" type="number" value={ng.qty || ''} onChange={(e) => setNg({ ...ng, qty: +e.target.value })} />
            <Input label="Wilgotność (%)" type="number" value={ng.moisture} onChange={(e) => setNg({ ...ng, moisture: +e.target.value })} />
            <Input label="Magazyn" value={ng.storage} onChange={(e) => setNg({ ...ng, storage: e.target.value })} />
            <Input label="Cena bieżąca (zł/t)" type="number" value={ng.currentPrice} onChange={(e) => setNg({ ...ng, currentPrice: +e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setNewGrain(false)}>Anuluj</Btn>
            <Btn onClick={() => { if (ng.qty > 0) { addGrain(ng); notify('Płody przyjęte'); } setNewGrain(false); }}>Zapisz</Btn>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteWarehouseItem(confirmDel); notify('Produkt usunięty'); } }} text="Czy na pewno usunąć produkt z magazynu?" />
    </div>
  );
}
