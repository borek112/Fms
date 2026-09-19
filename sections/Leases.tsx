import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, fmtNum, fmtPLN, Input, Modal, SectionTitle, Select, Textarea } from '@/components/common';
import type { Lease, LeasePayment } from '@/types';

const TODAY = '2026-08-06';
const emptyLease = (): Omit<Lease, 'id'> => ({ landlord: '', parcelNo: '', fieldId: undefined, area: 0, pricePerHa: 1000, paymentType: 'roczna', startDate: '2026-01-01', endDate: '2031-12-31', paidThisYear: 0, notes: '' });

const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
const yearsBetween = (a: string, b: string) => Math.max(0, daysBetween(a, b) / 365.25);

export default function Leases() {
  const { state, addLease, updateLease, deleteLease, notify } = useFarm();
  const leases = state.leases || [];
  const [edit, setEdit] = useState<Lease | Omit<Lease, 'id'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const totals = useMemo(() => {
    const area = leases.reduce((a, l) => a + l.area, 0);
    const annual = leases.reduce((a, l) => a + l.area * l.pricePerHa, 0);
    const dueThisYear = leases.reduce((a, l) => a + l.area * l.pricePerHa, 0);
    const paid = leases.reduce((a, l) => a + l.paidThisYear, 0);
    const outstanding = Math.max(0, dueThisYear - paid);
    const expiring = leases.filter((l) => { const d = daysBetween(TODAY, l.endDate); return d >= 0 && d < 365; }).length;
    return { area, annual, paid, outstanding, expiring, costHa: area > 0 ? annual / area : 0 };
  }, [leases]);

  const save = () => {
    if (!edit) return;
    if (!edit.landlord.trim() || edit.area <= 0 || edit.pricePerHa <= 0) { notify('Podaj wydzierżawiającego, powierzchnię i stawkę > 0', 'err'); return; }
    if ('id' in edit) { updateLease(edit); notify('Umowa dzierżawy zaktualizowana'); }
    else { addLease(edit); notify('Dodano umowę dzierżawy'); }
    setEdit(null);
  };

  const payType: Record<LeasePayment, string> = { roczna: 'rocznie', kwartalna: 'kwartalnie', jednorazowa: 'jednorazowo' };

  return (
    <div className="space-y-4" data-testid="leases-section">
      <SectionTitle title="📑 Dzierżawy Gruntów" sub={`${leases.length} umów · ${fmtNum(totals.area)} ha dzierżawionych`}
        right={<Btn data-testid="lease-add-btn" onClick={() => setEdit(emptyLease())}>+ Dodaj dzierżawę</Btn>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="!p-3"><div className="text-[11px] uppercase text-slate-400">Powierzchnia dzierżaw</div><div className="text-2xl font-bold text-slate-100 mt-1">{fmtNum(totals.area)} ha</div></Card>
        <Card className="!p-3"><div className="text-[11px] uppercase text-slate-400">Czynsz roczny</div><div className="text-2xl font-bold text-emerald-400 mt-1">{fmtPLN(totals.annual)}</div></Card>
        <Card className="!p-3"><div className="text-[11px] uppercase text-slate-400">Średni czynsz/ha</div><div className="text-2xl font-bold text-slate-100 mt-1">{fmtPLN(totals.costHa)}</div></Card>
        <Card className="!p-3"><div className="text-[11px] uppercase text-slate-400">Do zapłaty (2026)</div><div className={`text-2xl font-bold mt-1 ${totals.outstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmtPLN(totals.outstanding)}</div></Card>
        <Card className="!p-3"><div className="text-[11px] uppercase text-slate-400">Wygasa &lt; 12 mies.</div><div className={`text-2xl font-bold mt-1 ${totals.expiring > 0 ? 'text-red-400' : 'text-slate-100'}`}>{totals.expiring}</div></Card>
      </div>

      {leases.length === 0 && <Card><EmptyState icon="📑" text="Brak umów dzierżawy. Dodaj pierwszą umowę, aby liczyć czynsz i koszt/ha." action={<Btn onClick={() => setEdit(emptyLease())}>+ Dodaj dzierżawę</Btn>} /></Card>}

      <div className="grid md:grid-cols-2 gap-3">
        {leases.map((l) => {
          const field = state.fields.find((f) => f.id === l.fieldId);
          const annual = l.area * l.pricePerHa;
          const outstanding = Math.max(0, annual - l.paidThisYear);
          const dLeft = daysBetween(TODAY, l.endDate);
          const term = yearsBetween(l.startDate, l.endDate);
          const expSoon = dLeft >= 0 && dLeft < 365;
          const expired = dLeft < 0;
          return (
            <Card key={l.id} className="!p-4" data-testid={`lease-card-${l.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-100">{l.landlord}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">dz. {l.parcelNo} · {fmtNum(l.area)} ha {field ? `· 🟩 ${field.name}` : '· brak powiązania z GIS'}</p>
                </div>
                {expired ? <Badge tone="bad">wygasła</Badge> : expSoon ? <Badge tone="warn">wygasa za {dLeft} dni</Badge> : <Badge tone="ok">aktywna</Badge>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                <Info label="Stawka" value={`${fmtPLN(l.pricePerHa)}/ha`} />
                <Info label="Czynsz roczny" value={fmtPLN(annual)} />
                <Info label="Płatność" value={payType[l.paymentType]} />
                <Info label="Okres" value={`${term.toFixed(1)} lat`} />
                <Info label="Zapłacono 2026" value={fmtPLN(l.paidThisYear)} />
                <Info label="Do zapłaty" value={fmtPLN(outstanding)} tone={outstanding > 0 ? 'warn' : 'ok'} />
                <Info label="Od" value={fmtDate(l.startDate)} />
                <Info label="Do" value={fmtDate(l.endDate)} tone={expired ? 'bad' : expSoon ? 'warn' : 'default'} />
              </div>
              {l.notes && <p className="text-xs text-slate-400 mt-3 border-t border-slate-700/40 pt-2">📝 {l.notes}</p>}
              <div className="flex justify-end gap-2 mt-3">
                <Btn variant="ghost" className="!py-1.5 text-xs" data-testid={`lease-edit-${l.id}`} onClick={() => setEdit(l)}>✏️ Edytuj</Btn>
                <Btn variant="danger" className="!py-1.5 text-xs" data-testid={`lease-del-${l.id}`} onClick={() => setConfirmDel(l.id)}>🗑️ Usuń</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && 'id' in edit ? 'Edycja dzierżawy' : 'Nowa umowa dzierżawy'} wide>
        {edit && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Wydzierżawiający *" data-testid="lease-landlord" value={edit.landlord} onChange={(e) => setEdit({ ...edit, landlord: e.target.value })} />
            <Input label="Nr działki" value={edit.parcelNo} onChange={(e) => setEdit({ ...edit, parcelNo: e.target.value })} />
            <Select label="Powiązane pole (opcjonalnie)" value={edit.fieldId || ''} onChange={(e) => setEdit({ ...edit, fieldId: e.target.value || undefined })}>
              <option value="">— brak / grunt spoza GIS —</option>
              {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Select label="Rodzaj płatności" value={edit.paymentType} onChange={(e) => setEdit({ ...edit, paymentType: e.target.value as LeasePayment })}>
              {(['roczna', 'kwartalna', 'jednorazowa'] as LeasePayment[]).map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
            <Input label="Powierzchnia (ha) *" type="number" step="0.1" data-testid="lease-area" value={edit.area || ''} onChange={(e) => setEdit({ ...edit, area: +e.target.value })} />
            <Input label="Stawka (zł/ha/rok) *" type="number" data-testid="lease-price" value={edit.pricePerHa || ''} onChange={(e) => setEdit({ ...edit, pricePerHa: +e.target.value })} />
            <Input label="Data rozpoczęcia" type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
            <Input label="Data zakończenia" type="date" value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
            <Input label="Zapłacono w 2026 (zł)" type="number" value={edit.paidThisYear || ''} onChange={(e) => setEdit({ ...edit, paidThisYear: +e.target.value })} />
            <div className="sm:col-span-2"><Textarea label="Uwagi" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            <div className="sm:col-span-2 rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span className="text-slate-400">Czynsz roczny: <b className="text-emerald-400">{fmtPLN((edit.area || 0) * (edit.pricePerHa || 0))}</b></span>
              <span className="text-slate-400">Okres: <b className="text-slate-200">{yearsBetween(edit.startDate, edit.endDate).toFixed(1)} lat</b></span>
              <span className="text-slate-400">Wartość całej umowy: <b className="text-slate-200">{fmtPLN((edit.area || 0) * (edit.pricePerHa || 0) * (edit.paymentType === 'jednorazowa' ? 1 : yearsBetween(edit.startDate, edit.endDate)))}</b></span>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
              <Btn variant="ghost" onClick={() => setEdit(null)}>Anuluj</Btn>
              <Btn data-testid="lease-save-btn" onClick={save}>Zapisz umowę</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteLease(confirmDel); notify('Umowa usunięta'); } }} text="Usunąć tę umowę dzierżawy?" />
    </div>
  );
}

function Info({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn' | 'bad' }) {
  const c: Record<string, string> = { default: 'text-slate-100', ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' };
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${c[tone]}`}>{value}</div>
    </div>
  );
}
