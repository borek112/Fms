import { useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, SectionTitle } from '@/components/common';
import { NavigationMap } from './NavigationMap';
import type { FieldWorkSession } from '@/types';

function dur(s: FieldWorkSession): string {
  if (!s.endedAt) return '—';
  const sec = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
  return `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;
}

export function SessionHistory({ onBack }: { onBack: () => void }) {
  const { state, deleteSession, notify } = useFarm();
  const sessions = state.sessions || [];
  const [detail, setDetail] = useState<FieldWorkSession | null>(null);
  const [del, setDel] = useState<string | null>(null);

  if (detail) {
    const track = detail.track.map((p) => [p.lat, p.lng] as [number, number]);
    return (
      <div className="space-y-3 max-w-2xl mx-auto" data-testid="session-detail">
        <div className="flex items-center justify-between">
          <button onClick={() => setDetail(null)} className="text-sm text-emerald-400">← Wróć</button>
          {detail.isDemo && <Badge tone="warn">🧪 DEMO</Badge>}
        </div>
        <h2 className="text-lg font-bold text-slate-100">{detail.fieldName} · {detail.treatmentType}</h2>
        <div className="h-64 rounded-xl overflow-hidden border border-slate-700">
          <NavigationMap fieldGeo={[]} geometry={null} activeLabel={null} position={null} track={track} contour={detail.contour} pointA={detail.pointA} pointB={detail.pointB} night={false} follow={false} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Card className="!p-3"><div className="text-xs text-slate-400">Data</div><div className="font-bold">{fmtDate(detail.startedAt.slice(0, 10))}</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Czas</div><div className="font-bold">{dur(detail)}</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Dystans</div><div className="font-bold">{(detail.distance / 1000).toFixed(1)} km</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Powierzchnia</div><div className="font-bold">{detail.areaCovered.toFixed(1)} ha</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Pokrycie</div><div className="font-bold">{Math.round(detail.coveragePercent)}%</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Śr. prędkość</div><div className="font-bold">{detail.averageSpeed.toFixed(1)} km/h</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Operator</div><div className="font-bold">{detail.operator || '—'}</div></Card>
          <Card className="!p-3"><div className="text-xs text-slate-400">Liczba linii</div><div className="font-bold">{detail.totalLines}</div></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto" data-testid="session-history">
      <SectionTitle title="📋 Historia prac polowych" sub="Zakończone sesje FMS Field Pilot" right={<Btn variant="ghost" onClick={onBack}>← Field Pilot</Btn>} />
      {sessions.length === 0 && <Card><EmptyState icon="🚜" text="Brak zapisanych sesji. Uruchom pracę w polu, aby zobaczyć historię." /></Card>}
      <div className="space-y-2">
        {sessions.map((s) => (
          <Card key={s.id} className="!p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚜</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 truncate">{s.fieldName}</span>
                  {s.isDemo && <Badge tone="warn">DEMO</Badge>}
                </div>
                <div className="text-xs text-slate-400">{fmtDate(s.startedAt.slice(0, 10))} · {s.treatmentType} · {s.operator || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.areaCovered.toFixed(1)} ha · {dur(s)} · {(s.distance / 1000).toFixed(1)} km · {Math.round(s.coveragePercent)}% pokrycia</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Btn className="!px-3 !py-1.5 !text-xs" onClick={() => setDetail(s)}>Szczegóły</Btn>
                <Btn variant="danger" className="!px-3 !py-1.5 !text-xs" onClick={() => setDel(s.id)}>Usuń</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { deleteSession(del); notify('Sesja usunięta'); } }} text="Usunąć tę sesję z historii? Wpis w Dzienniku pozostanie." />
    </div>
  );
}
