import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { CROP_CATALOG } from '@/data/demo';
import { Badge, Btn, Card, Confirm, EmptyState, fmtDate, fmtNum, fmtPLN, Input, Modal, SectionTitle, Select, ProgressBar } from '@/components/common';
import MapView, { geoAreaHa } from '@/components/MapView';
import type { Field } from '@/types';
import type { Nav } from '@/App';

const LAYERS = ['granice pól', 'uprawy', 'NDVI', 'NDRE', 'pH', 'P', 'K', 'Mg', 'strefy zarządzania', 'historia zabiegów'];

function layerColor(layer: string, i: number): string {
  if (layer === 'NDVI') return ['#14532d', '#15803d', '#22c55e', '#a3e635'][i % 4];
  if (layer === 'NDRE') return ['#7f1d1d', '#ea580c', '#facc15', '#22c55e'][i % 4];
  if (layer === 'pH') return ['#fca5a5', '#fde68a', '#86efac'][i % 3];
  if (['P', 'K', 'Mg'].includes(layer)) return ['#ef4444', '#f59e0b', '#84cc16', '#10b981'][i % 4];
  return ['#f59e0b', '#facc15', '#84cc16', '#f472b6', '#fb923c', '#4ade80', '#fb7185', '#34d399', '#a78bfa', '#c084fc', '#2dd4bf', '#94a3b8'][i % 12];
}

const DEFAULT_CENTER: [number, number] = [52.648, 19.067];
const emptyField = (): Omit<Field, 'id'> => ({ name: '', area: 0, parcelNo: '', district: '', soilType: 'Gleba płowa (IIIb)', pH: 6.0, P: 'średnia', K: 'średnia', Mg: 'średnia', geo: [] });

export default function Fields({ nav, focusId }: { nav: Nav; focusId?: string }) {
  const { state, addField, updateField, deleteField, notify } = useFarm();
  const [layer, setLayer] = useState('uprawy');
  const [selected, setSelected] = useState<string | undefined>(focusId);
  const [editField, setEditField] = useState<Field | Omit<Field, 'id'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [search, setSearch] = useState('');

  const fields = state.fields.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.parcelNo.includes(search));
  const sel = state.fields.find((f) => f.id === selected);
  const draftArea = geoAreaHa(draft);

  const saveField = () => {
    if (!editField) return;
    if (!editField.name.trim() || editField.area <= 0) { notify('Podaj nazwę i powierzchnię > 0 ha', 'err'); return; }
    if (editField.geo.length < 3) { notify('Pole musi mieć narysowane granice na mapie (min. 3 punkty)', 'err'); return; }
    if ('id' in editField) { updateField(editField); notify('Pole zaktualizowane'); }
    else { addField(editField); notify('Pole dodane'); }
    setEditField(null);
  };

  const mapClick = (lat: number, lng: number) => setDraft((d) => [...d, [lat, lng]]);

  const colorFor = (f: Field, i: number) => {
    if (layer === 'granice pól') return '#64748b';
    if (layer === 'uprawy') return layerColor('x', i);
    return layerColor(layer, i + f.name.length);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="🗺️ GIS i Pola" sub={`${state.fields.length} pól · ${fmtNum(state.fields.reduce((a, f) => a + f.area, 0))} ha · mapa OpenStreetMap (architektura gotowa pod Mapbox)`}
        right={<div className="flex gap-2">
          <Btn variant={drawing ? 'danger' : 'outline'} onClick={() => { setDrawing(!drawing); setDraft([]); }}>{drawing ? '✕ Przerwij rysowanie' : '✏️ Rysuj pole na mapie'}</Btn>
          <Btn onClick={() => { setDrawing(true); setDraft([]); }}>+ Dodaj pole</Btn>
        </div>} />

      <div className="grid lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {LAYERS.map((l) => (
              <button key={l} onClick={() => setLayer(l)} className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${layer === l ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>{l}</button>
            ))}
          </div>
          <MapView
            fields={fields}
            colorFor={colorFor}
            labelFor={(f) => state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026)?.cropName || 'bez uprawy'}
            selectedId={selected}
            onSelect={setSelected}
            drawing={drawing}
            draft={draft}
            onMapClick={mapClick}
            height="440px"
            center={DEFAULT_CENTER}
          />
          {drawing && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge tone="info">{draft.length} pkt</Badge>
              <span className="text-slate-300">Powierzchnia: <b className="text-emerald-400">{fmtNum(draftArea, 2)} ha</b></span>
              <Btn variant="ghost" className="!py-1.5 text-xs" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>↩ Cofnij punkt</Btn>
              <Btn disabled={draft.length < 3} onClick={() => { setEditField({ ...emptyField(), area: Math.round(draftArea * 100) / 100, geo: draft }); setDrawing(false); }}>Utwórz pole z rysunku</Btn>
            </div>
          )}
          {layer !== 'granice pól' && layer !== 'uprawy' && layer !== 'historia zabiegów' && (
            <p className="text-xs text-slate-500 mt-2">Warstwa „{layer}” — dane demonstracyjne (DEMO). Mapa przygotowana pod podłączenie rastrów satelitarnych / analiz glebowych.</p>
          )}
        </Card>

        <Card className="lg:col-span-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Szukaj pola lub działki…" className="w-full bg-slate-800/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3 focus:outline-none focus:border-emerald-500" />
          <div className="space-y-2 max-h-[470px] overflow-y-auto pr-1">
            {fields.map((f) => {
              const fc = state.fieldCrops.find((c) => c.fieldId === f.id && c.season === 2026);
              return (
                <button key={f.id} onClick={() => setSelected(f.id)} className={`w-full text-left rounded-lg border p-3 transition-colors ${selected === f.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-100 text-sm">{f.name}</span>
                    <span className="text-emerald-400 text-sm font-semibold">{fmtNum(f.area)} ha</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{fc ? `${fc.cropName} · ${fc.variety} · BBCH ${fc.bbch}` : 'bez uprawy'} · dz. {f.parcelNo}</div>
                </button>
              );
            })}
            {fields.length === 0 && (
              <EmptyState icon="🗺️" text={state.fields.length === 0 ? 'To gospodarstwo nie ma jeszcze pól. Narysuj pierwsze pole na mapie!' : 'Brak pól spełniających kryteria.'}
                action={state.fields.length === 0 ? <Btn onClick={() => setDrawing(true)}>✏️ Narysuj pierwsze pole</Btn> : undefined} />
            )}
          </div>
        </Card>
      </div>

      {sel && <FieldCard field={sel} nav={nav} onEdit={() => setEditField(sel)} onDelete={() => setConfirmDel(sel.id)} />}

      {/* Formularz pola */}
      <Modal open={!!editField} onClose={() => setEditField(null)} title={editField && 'id' in editField ? `Edycja: ${editField.name}` : 'Nowe pole'} wide>
        {editField && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nazwa pola *" value={editField.name} onChange={(e) => setEditField({ ...editField, name: e.target.value })} />
            <Input label="Powierzchnia (ha) *" type="number" step="0.1" value={editField.area || ''} onChange={(e) => setEditField({ ...editField, area: +e.target.value })} />
            <Input label="Numer działki" value={editField.parcelNo} onChange={(e) => setEditField({ ...editField, parcelNo: e.target.value })} />
            <Input label="Obręb" value={editField.district} onChange={(e) => setEditField({ ...editField, district: e.target.value })} />
            <Select label="Typ gleby" value={editField.soilType} onChange={(e) => setEditField({ ...editField, soilType: e.target.value })}>
              {['Czarna ziemia (II)', 'Gleba próchnicza (IIIa)', 'Gleba płowa (IIIb)', 'Gleba brunatna (IVa)', 'Gleba brunatna (IVb)', 'Rędzina (V)', 'Mursz niski'].map((x) => <option key={x}>{x}</option>)}
            </Select>
            <Input label="pH gleby" type="number" step="0.1" value={editField.pH} onChange={(e) => setEditField({ ...editField, pH: +e.target.value })} />
            {(['P', 'K', 'Mg'] as const).map((el) => (
              <Select key={el} label={`Zasobność ${el}`} value={editField[el]} onChange={(e) => setEditField({ ...editField, [el]: e.target.value })}>
                {['bardzo niska', 'niska', 'średnia', 'wysoka', 'bardzo wysoka'].map((x) => <option key={x}>{x}</option>)}
              </Select>
            ))}
            <div className="sm:col-span-2 text-xs text-slate-500">
              Granice pola: {editField.geo.length >= 3 ? `✔ narysowane (${editField.geo.length} punktów)` : '⚠ brak — narysuj pole na mapie'}
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
              <Btn variant="ghost" onClick={() => setEditField(null)}>Anuluj</Btn>
              <Btn onClick={saveField}>Zapisz pole</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteField(confirmDel); setSelected(undefined); notify('Pole usunięte'); } }} text="Usunięcie pola skasuje też jego historię, zabiegi i przypisane zadania. Kontynuować?" />
    </div>
  );
}

// -------------------- KARTA POLA --------------------
const TABS = ['Informacje', 'Historia', 'Zabiegi', 'Nawożenie', 'Ochrona', 'Plony', 'Finanse', 'Pogoda', 'Analizy'];

function FieldCard({ field, nav, onEdit, onDelete }: { field: Field; nav: Nav; onEdit: () => void; onDelete: () => void }) {
  const { state, setFieldCrop, addFieldCrop, notify } = useFarm();
  const [tab, setTab] = useState('Informacje');
  const [editCrop, setEditCrop] = useState(false);
  const [newCrop, setNewCrop] = useState({ cropName: 'Pszenica ozima', variety: '', plannedYield: 8, bbch: 0, sowingDate: '2026-09-28' });
  const fc = state.fieldCrops.find((c) => c.fieldId === field.id && c.season === 2026);
  const treatments = state.treatments.filter((t) => t.fieldId === field.id).sort((a, b) => b.date.localeCompare(a.date));
  const history = state.cropHistory.filter((h) => h.fieldId === field.id).sort((a, b) => b.season - a.season);
  const prev = history.find((h) => h.season === 2025);

  const econ = useMemo(() => {
    const costs = treatments.filter((t) => t.season === 2026).reduce((a, t) => a + t.cost, 0) + field.area * 900;
    const priceT: Record<string, number> = { 'Pszenica ozima': 850, 'Rzepak ozimy': 1950, 'Kukurydza': 720, 'Burak cukrowy': 180, 'Jęczmień ozimy': 700, 'Soja': 2100, 'Marchew': 650, 'Lucerna': 400, 'Pszenżyto': 760, 'Ziemniak': 700, 'Pietruszka': 900, 'Żyto': 640 };
    const revenue = fc ? fc.plannedYield * field.area * (priceT[fc.cropName] || 700) : 0;
    return { costs, revenue, profit: revenue - costs, costHa: costs / field.area, marginHa: (revenue - costs) / field.area, roi: costs > 0 ? ((revenue - costs) / costs) * 100 : 0 };
  }, [treatments, field, fc]);

  const timeline = useMemo(() => {
    const rows: { season: number; crop: string; yieldV?: number; costs: number; revenue: number; live?: boolean }[] = [];
    history.forEach((h) => rows.push({ season: h.season, crop: h.crop, yieldV: h.yield, costs: h.costs, revenue: h.revenue }));
    if (fc) rows.unshift({ season: 2026, crop: fc.cropName, yieldV: fc.plannedYield, costs: econ.costs, revenue: econ.revenue, live: true });
    return rows;
  }, [history, fc, econ]);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">🟩 {field.name} <span className="text-sm font-normal text-slate-400">— cyfrowy bliźniak pola</span></h3>
          <p className="text-xs text-slate-400 mt-0.5">{field.area} ha · działka {field.parcelNo} · obręb {field.district}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => setEditCrop(true)}>🌱 {fc ? 'Zmień uprawę' : 'Przypisz uprawę'}</Btn>
          <Btn variant="ghost" onClick={onEdit}>✏️ Edytuj</Btn>
          <Btn variant="danger" onClick={onDelete}>🗑️ Usuń</Btn>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-slate-700/50">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition-colors ${tab === t ? 'bg-emerald-600/20 text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Informacje' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Info label="Gleba" value={field.soilType} />
          <Info label="pH" value={String(field.pH)} warn={field.pH < 5.8} />
          <Info label="Fosfor (P)" value={field.P} warn={field.P === 'niska' || field.P === 'bardzo niska'} />
          <Info label="Potas (K)" value={field.K} warn={field.K === 'niska'} />
          <Info label="Magnez (Mg)" value={field.Mg} warn={field.Mg === 'niska'} />
          <Info label="Przedplon (2025)" value={prev?.crop || '—'} />
          <Info label="Obecna uprawa" value={fc ? `${fc.cropName} (${fc.variety})` : '—'} />
          <Info label="Faza BBCH" value={fc ? String(fc.bbch) : '—'} />
          <Info label="Planowany plon" value={fc ? `${fc.plannedYield} t/ha` : '—'} />
          <Info label="Rzeczywisty plon" value={fc?.actualYield ? `${fc.actualYield} t/ha` : 'jeszcze nie zebrano'} />
          <Info label="Koszty 2026" value={fmtPLN(econ.costs)} />
          <Info label="Marża" value={fmtPLN(econ.profit)} ok={econ.profit > 0} />
        </div>
      )}

      {tab === 'Historia' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Pełna oś czasu pola z możliwością porównania lat.</p>
          {timeline.length === 0 && <EmptyState icon="🕘" text="Brak historii — przypisz uprawę, aby rozpocząć oś czasu pola." />}
          <div className="grid md:grid-cols-3 gap-3">
            {timeline.map((y) => (
              <div key={y.season} className={`rounded-lg border p-3 ${y.live ? 'border-emerald-500/60 bg-emerald-900/10' : 'border-slate-700/60 bg-slate-900/40'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-100">{y.season}</span>
                  {y.live && <Badge tone="ok">bieżący sezon</Badge>}
                </div>
                <div className="text-sm text-slate-300">🌱 {y.crop}</div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div>Plon: <b className="text-slate-200">{y.yieldV ? `${fmtNum(y.yieldV)} t/ha` : '—'}</b></div>
                  <div>Koszty: {fmtPLN(y.costs)}</div>
                  <div>Przychód: {fmtPLN(y.revenue)}</div>
                  <div>Wynik: <b className={y.revenue - y.costs >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPLN(y.revenue - y.costs)}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(tab === 'Zabiegi' || tab === 'Nawożenie' || tab === 'Ochrona') && (
        <TreatmentList treatments={treatments.filter((t) => tab === 'Zabiegi' ? true : tab === 'Nawożenie' ? t.type === 'nawożenie' : t.type === 'oprysk')} nav={nav} />
      )}

      {tab === 'Plony' && (
        <div className="space-y-2">
          {timeline.length === 0 && <EmptyState icon="🌾" text="Brak danych o plonach." />}
          {timeline.map((y) => (
            <div key={y.season} className="flex items-center gap-3">
              <span className="w-12 text-sm text-slate-400">{y.season}</span>
              <div className="flex-1"><ProgressBar value={y.yieldV || 0} max={Math.max(...timeline.map((t) => t.yieldV || 0), 1)} tone={y.live ? 'warn' : 'ok'} /></div>
              <span className="w-24 text-right text-sm text-slate-200">{y.yieldV ? `${fmtNum(y.yieldV)} t/ha` : '—'}{y.live ? ' (plan)' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Finanse' && (
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Info label="Koszt/ha" value={fmtPLN(econ.costHa)} />
          <Info label="Koszt całkowity" value={fmtPLN(econ.costs)} />
          <Info label="Przychód (prognoza)" value={fmtPLN(econ.revenue)} />
          <Info label="Dochód" value={fmtPLN(econ.profit)} ok={econ.profit > 0} />
          <Info label="Marża/ha" value={fmtPLN(econ.marginHa)} ok={econ.marginHa > 0} />
          <Info label="ROI" value={`${fmtNum(econ.roi, 0)}%`} ok={econ.roi > 0} />
        </div>
      )}

      {tab === 'Pogoda' && (
        <div className="text-sm text-slate-300">
          <p className="mb-2">Lokalne warunki dla pola (dane DEMO):</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <Badge tone="info">🌡️ 24°C</Badge><Badge tone="info">💧 58%</Badge><Badge tone="info">🌬️ 2,1 m/s</Badge><Badge tone="info">🌧️ 0 mm</Badge>
          </div>
          <Btn variant="ghost" className="mt-3 !py-1.5 text-xs" onClick={() => nav.go('pogoda')}>Pełna prognoza i okno opryskowe →</Btn>
        </div>
      )}

      {tab === 'Analizy' && (
        <div className="space-y-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700/60 p-3">
              <div className="text-xs text-slate-400 mb-1">NDVI (DEMO)</div>
              <ProgressBar value={0.72} max={1} tone="ok" />
              <div className="text-xs text-slate-400 mt-1">0,72 — łan w dobrej kondycji</div>
            </div>
            <div className="rounded-lg border border-slate-700/60 p-3">
              <div className="text-xs text-slate-400 mb-1">Wilgotność gleby (DEMO)</div>
              <ProgressBar value={41} max={100} tone="warn" />
              <div className="text-xs text-slate-400 mt-1">41% — umiarkowanie niska</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">Moduł przygotowany pod integrację z danymi satelitarnymi (Sentinel-2) i stacjami pogodowymi.</p>
        </div>
      )}

      {/* przypisanie / zmiana uprawy */}
      <Modal open={editCrop} onClose={() => setEditCrop(false)} title={fc ? 'Zmiana uprawy na polu' : 'Przypisanie uprawy do pola'}>
        {fc ? (
          <div className="grid gap-3">
            <Select label="Uprawa" value={fc.cropName} onChange={(e) => setFieldCrop({ ...fc, cropName: e.target.value })}>
              {CROP_CATALOG.map((c) => <option key={c.name}>{c.name}</option>)}
            </Select>
            <Input label="Odmiana" value={fc.variety} onChange={(e) => setFieldCrop({ ...fc, variety: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Planowany plon (t/ha)" type="number" step="0.1" value={fc.plannedYield} onChange={(e) => setFieldCrop({ ...fc, plannedYield: +e.target.value })} />
              <Input label="BBCH" type="number" value={fc.bbch} onChange={(e) => setFieldCrop({ ...fc, bbch: +e.target.value })} />
            </div>
            <Input label="Data siewu" type="date" value={fc.sowingDate} onChange={(e) => setFieldCrop({ ...fc, sowingDate: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditCrop(false)}>Zamknij</Btn>
              <Btn onClick={() => { setEditCrop(false); notify('Uprawa zaktualizowana'); }}>Zapisz</Btn>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <Select label="Uprawa" value={newCrop.cropName} onChange={(e) => setNewCrop({ ...newCrop, cropName: e.target.value })}>
              {CROP_CATALOG.map((c) => <option key={c.name}>{c.name}</option>)}
            </Select>
            <Input label="Odmiana" value={newCrop.variety} onChange={(e) => setNewCrop({ ...newCrop, variety: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Planowany plon (t/ha)" type="number" step="0.1" value={newCrop.plannedYield} onChange={(e) => setNewCrop({ ...newCrop, plannedYield: +e.target.value })} />
              <Input label="Data siewu" type="date" value={newCrop.sowingDate} onChange={(e) => setNewCrop({ ...newCrop, sowingDate: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditCrop(false)}>Anuluj</Btn>
              <Btn onClick={() => {
                addFieldCrop({ fieldId: field.id, cropName: newCrop.cropName, variety: newCrop.variety || '—', season: 2026, sowingDate: newCrop.sowingDate, plannedYield: newCrop.plannedYield, bbch: 0 });
                setEditCrop(false); notify('Uprawa przypisana do pola');
              }}>Przypisz</Btn>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function Info({ label, value, warn, ok }: { label: string; value: string; warn?: boolean; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
      <div className="text-[11px] text-slate-500 uppercase">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${warn ? 'text-amber-400' : ok ? 'text-emerald-400' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function TreatmentList({ treatments, nav }: { treatments: ReturnType<typeof useFarm>['state']['treatments']; nav: Nav }) {
  const { state } = useFarm();
  if (treatments.length === 0) return <EmptyState icon="🧾" text="Brak zabiegów w tej kategorii." action={<Btn onClick={() => nav.go('dziennik')}>+ Dodaj zabieg w dzienniku</Btn>} />;
  return (
    <div className="space-y-2">
      {treatments.map((t) => {
        const m = state.machines.find((x) => x.id === t.machineId);
        return (
          <div key={t.id} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-400 w-24">{fmtDate(t.date)}</span>
            <Badge tone={t.type === 'oprysk' ? 'warn' : t.type === 'zbiór' ? 'ok' : 'info'}>{t.type}</Badge>
            {t.productName && <span className="text-slate-200">{t.productName}{t.dose ? ` · ${t.dose} ${t.type === 'oprysk' ? 'l/ha' : 'kg/ha'}` : ''}</span>}
            {m && <span className="text-slate-400">🚜 {m.name}</span>}
            {t.operator && <span className="text-slate-400">👷 {t.operator}</span>}
            <span className="ml-auto text-slate-300">{fmtPLN(t.cost)}</span>
          </div>
        );
      })}
    </div>
  );
}
