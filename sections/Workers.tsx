import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, Input, Modal, SectionTitle, Select } from '@/components/common';
import type { Task } from '@/types';

const STATUS: Task['status'][] = ['nowe', 'zaplanowane', 'w trakcie', 'wykonane'];
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'muted'> = { 'nowe': 'info', 'zaplanowane': 'warn', 'w trakcie': 'bad', 'wykonane': 'ok' };

export default function Workers() {
  const { state, addTask, updateTask, deleteTask, notify } = useFarm();
  const [view, setView] = useState<'zadania' | 'kalendarz' | 'pracownicy'>('zadania');
  const [editTask, setEditTask] = useState<Task | Omit<Task, 'id'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('wszystkie');

  const tasks = state.tasks.filter((t) => statusFilter === 'wszystkie' || t.status === statusFilter);

  const saveTask = () => {
    if (!editTask) return;
    if (!editTask.title.trim()) { notify('Podaj nazwę zadania', 'err'); return; }
    if ('id' in editTask) { updateTask(editTask); notify('Zadanie zaktualizowane'); }
    else { addTask(editTask); notify('Zadanie dodane'); }
    setEditTask(null);
  };

  const week = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date('2026-08-06T00:00:00'); d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  return (
    <div className="space-y-4">
      <SectionTitle title="👷 Pracownicy i Zadania" sub="Harmonogram, przypisania i widok kalendarza"
        right={<Btn onClick={() => setEditTask({ title: '', dueDate: '2026-08-06', priority: 'średni', status: 'nowe', kind: 'zabieg' })}>+ Dodaj zadanie</Btn>} />

      <div className="flex gap-1 border-b border-slate-700/50 pb-1 overflow-x-auto">
        {[['zadania', '✅ Zadania'], ['kalendarz', '📅 Kalendarz'], ['pracownicy', '👷 Pracownicy']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k as typeof view)} className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg ${view === k ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {view === 'zadania' && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {['wszystkie', ...STATUS].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs border ${statusFilter === s ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{s}</button>
            ))}
          </div>
          {tasks.length === 0 && <Card><EmptyState icon="✅" text="Brak zadań w tym statusie." /></Card>}
          <div className="grid md:grid-cols-2 gap-3">
            {tasks.map((t) => {
              const f = state.fields.find((x) => x.id === t.fieldId);
              const m = state.machines.find((x) => x.id === t.machineId);
              const w = state.workers.find((x) => x.id === t.workerId);
              return (
                <Card key={t.id} className="!p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-slate-100 text-sm">{t.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {w ? `👷 ${w.name} · ` : ''}{f ? `🟩 ${f.name} · ` : ''}{m ? `🚜 ${m.name} · ` : ''}📅 {fmtDate(t.dueDate)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                      <Badge tone={t.priority === 'krytyczny' ? 'bad' : t.priority === 'wysoki' ? 'warn' : 'muted'}>{t.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {STATUS.filter((s) => s !== t.status).map((s) => (
                      <button key={s} onClick={() => { updateTask({ ...t, status: s }); notify(`Status: ${s}`); }} className="px-2 py-1 rounded text-[11px] border border-slate-600 text-slate-300 hover:border-emerald-500">→ {s}</button>
                    ))}
                    <button onClick={() => setEditTask(t)} className="px-2 py-1 rounded text-[11px] border border-slate-600 text-slate-300">✏️ edytuj</button>
                    <button onClick={() => setConfirmDel(t.id)} className="px-2 py-1 rounded text-[11px] border border-red-700/60 text-red-400">🗑️</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {view === 'kalendarz' && (
        <Card>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const dayTasks = state.tasks.filter((t) => t.dueDate === d);
              const wd = new Date(d + 'T00:00:00').toLocaleDateString('pl-PL', { weekday: 'short' });
              return (
                <div key={d} className={`min-h-[90px] rounded-lg border p-1.5 ${d === '2026-08-06' ? 'border-emerald-500/60 bg-emerald-900/10' : 'border-slate-700/50 bg-slate-900/30'}`}>
                  <div className="text-[10px] text-slate-400">{wd}</div>
                  <div className="text-sm font-semibold text-slate-200">{d.slice(8)}.{d.slice(5, 7)}</div>
                  <div className="space-y-1 mt-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div key={t.id} className={`text-[10px] rounded px-1 py-0.5 truncate ${t.status === 'wykonane' ? 'bg-emerald-800/40 text-emerald-300 line-through' : 'bg-slate-700/60 text-slate-200'}`} title={t.title}>{t.title}</div>
                    ))}
                    {dayTasks.length > 3 && <div className="text-[10px] text-slate-500">+{dayTasks.length - 3} więcej</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === 'pracownicy' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {state.workers.map((w) => {
            const my = state.tasks.filter((t) => t.workerId === w.id && t.status !== 'wykonane');
            return (
              <Card key={w.id}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-700/40 border border-emerald-500/40 flex items-center justify-center text-lg font-bold text-emerald-300">{w.name.split(' ').map((x) => x[0]).join('')}</div>
                  <div>
                    <div className="font-semibold text-slate-100">{w.name}</div>
                    <div className="text-xs text-slate-400">{w.role}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-3">📞 {w.phone}</div>
                <div className="mt-2"><Badge tone={my.length > 2 ? 'warn' : 'ok'}>{my.length} aktywne zadania</Badge></div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title={editTask && 'id' in editTask ? 'Edycja zadania' : 'Nowe zadanie'}>
        {editTask && (
          <div className="grid gap-3">
            <Input label="Nazwa zadania *" value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Pracownik" value={editTask.workerId || ''} onChange={(e) => setEditTask({ ...editTask, workerId: e.target.value || undefined })}>
                <option value="">— brak —</option>
                {state.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
              <Select label="Pole" value={editTask.fieldId || ''} onChange={(e) => setEditTask({ ...editTask, fieldId: e.target.value || undefined })}>
                <option value="">— brak —</option>
                {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <Select label="Maszyna" value={editTask.machineId || ''} onChange={(e) => setEditTask({ ...editTask, machineId: e.target.value || undefined })}>
                <option value="">— brak —</option>
                {state.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              <Input label="Termin" type="date" value={editTask.dueDate} onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })} />
              <Select label="Priorytet" value={editTask.priority} onChange={(e) => setEditTask({ ...editTask, priority: e.target.value as Task['priority'] })}>
                {['niski', 'średni', 'wysoki', 'krytyczny'].map((x) => <option key={x}>{x}</option>)}
              </Select>
              <Select label="Typ" value={editTask.kind} onChange={(e) => setEditTask({ ...editTask, kind: e.target.value })}>
                {['zabieg', 'lustracja', 'nawożenie', 'siew', 'serwis', 'zakup', 'inne'].map((x) => <option key={x}>{x}</option>)}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditTask(null)}>Anuluj</Btn>
              <Btn onClick={saveTask}>Zapisz</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteTask(confirmDel); notify('Zadanie usunięte'); } }} text="Czy na pewno usunąć to zadanie?" />
    </div>
  );
}
