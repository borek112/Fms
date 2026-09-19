import { useMemo, useState, type ChangeEvent } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Badge, Btn, Card, Confirm, EmptyState, fmtNum, Input, Modal, SectionTitle, Select } from '@/components/common';
import { gridToCells, cellsToCSV, gridToGeoJSON, isoXmlTemplate, bboxOf } from '@/precision/vra/vraExport';
import { parseSoilCSV, buildNutrientGrid, classify, average, NUTRIENTS, type Nutrient } from '@/precision/soil/soilImport';
import type { ManagementZone } from '@/types';

const DEFAULT_COLORS = ['#ef4444', '#f59e0b', '#a3e635', '#10b981', '#38bdf8'];

function download(name: string, content: string, mime: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const emptyZone = (fieldId: string): Omit<ManagementZone, 'id'> => ({ fieldId, name: '', color: '#10b981', areaShare: 20, pH: 6.0, P: 'średnia', K: 'średnia', Mg: 'średnia', ndvi: 0.6, yield: 6, recommendedDose: 150 });

type Layer = 'zones' | 'ndvi' | 'ndre' | 'pH' | 'P' | 'K' | 'Mg';
const LAYERS: { id: Layer; label: string; unit: string; real: boolean }[] = [
  { id: 'zones', label: 'Strefy VRA', unit: 'kg/ha', real: true },
  { id: 'pH', label: 'Odczyn pH', unit: 'pH', real: true },
  { id: 'P', label: 'Fosfor (P)', unit: 'klasa', real: true },
  { id: 'K', label: 'Potas (K)', unit: 'klasa', real: true },
  { id: 'Mg', label: 'Magnez (Mg)', unit: 'klasa', real: true },
  { id: 'ndvi', label: 'NDVI', unit: 'indeks', real: false },
  { id: 'ndre', label: 'NDRE', unit: 'indeks', real: false },
];

export default function Precision() {
  const { state, addZone, updateZone, deleteZone, addSoilSamples, clearSoilSamples, notify } = useFarm();
  const [fieldId, setFieldId] = useState(state.fields[0]?.id || '');
  const [product, setProduct] = useState('Saletra amonowa 34%');
  const [base, setBase] = useState(250);
  const [min, setMin] = useState(120);
  const [max, setMax] = useState(360);
  const [layer, setLayer] = useState<Layer>('zones');
  const [zoneEdit, setZoneEdit] = useState<ManagementZone | Omit<ManagementZone, 'id'> | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const field = state.fields.find((f) => f.id === fieldId);
  const fieldZones = useMemo(() => (state.zones || []).filter((z) => z.fieldId === fieldId), [state.zones, fieldId]);
  const zoneCount = fieldZones.length || 4;
  const bandDoses = fieldZones.length ? fieldZones.map((z) => z.recommendedDose) : [min, min + (max - min) * 0.33, min + (max - min) * 0.66, max];
  const bandColors = fieldZones.length ? fieldZones.map((z) => z.color) : DEFAULT_COLORS.slice(0, 4);

  // deterministyczna siatka zmienności (ESTYMACJA modelu — jasno oznaczona)
  const grid = useMemo(() => {
    if (!field) return [] as number[][];
    const seed = field.name.length + field.area;
    const raw: number[][] = [];
    for (let y = 0; y < 10; y++) {
      const row: number[] = [];
      for (let x = 0; x < 14; x++) row.push(Math.sin((x + seed) * 0.7) * Math.cos((y + seed) * 0.9) + Math.sin((x + y) * 0.4));
      raw.push(row);
    }
    const flat = [...raw.flat()].sort((a, b) => a - b);
    return raw.map((row) => row.map((v) => {
      const rank = flat.indexOf(v) / flat.length;
      return Math.min(zoneCount - 1, Math.floor(rank * zoneCount));
    }));
  }, [field, zoneCount]);

  const stats = useMemo(() => {
    const counts = new Array(zoneCount).fill(0);
    grid.flat().forEach((z) => counts[z]++);
    const total = grid.flat().length || 1;
    const avg = grid.flat().reduce((a, z) => a + (bandDoses[z] ?? 0), 0) / total;
    return { counts, total, avg, totalProduct: field ? (avg * field.area) / 1000 : 0 };
  }, [grid, bandDoses, zoneCount, field]);

  const nutrient: Nutrient | null = (['pH', 'P', 'K', 'Mg'].includes(layer) ? layer : null) as Nutrient | null;
  const fieldSamples = useMemo(() => (state.soilSamples || []).filter((s) => s.fieldId === fieldId), [state.soilSamples, fieldId]);
  const soilGrid = useMemo(() => (field && nutrient && fieldSamples.length ? buildNutrientGrid(field.geo, fieldSamples, nutrient) : null), [field, nutrient, fieldSamples]);
  const soilBB = field ? bboxOf(field.geo) : null;

  const importCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !field) return;
    const raw = parseSoilCSV(await file.text());
    if (!raw.length) { notify('Nie znaleziono próbek (wymagane kolumny lat, lng)', 'err'); e.target.value = ''; return; }
    addSoilSamples(field.id, raw);
    notify(`Zaimportowano ${raw.length} próbek dla ${field.name}`);
    e.target.value = '';
  };

  const exportCSV = () => {
    if (!field) return;
    download(`VRA_${field.name.replace(/\s+/g, '_')}.csv`, cellsToCSV(gridToCells(field, grid, bandDoses)), 'text/csv');
    notify('Wyeksportowano CSV ✅');
  };
  const exportGeoJSON = () => {
    if (!field) return;
    const lyr = LAYERS.find((l) => l.id === layer)!;
    download(`VRA_${field.name.replace(/\s+/g, '_')}.geojson`, gridToGeoJSON(field, grid, bandDoses, product, lyr.unit), 'application/geo+json');
    notify('Wyeksportowano GeoJSON ✅');
  };
  const exportISO = () => {
    if (!field) return;
    download(`TASKDATA_${field.name.replace(/\s+/g, '_')}.xml`, isoXmlTemplate(field.name, product, min, max, stats.avg, 'kg/ha'), 'application/xml');
    notify('Generator ISO-XML — moduł przygotowany do integracji (pobrano szablon)');
  };

  const saveZone = () => {
    if (!zoneEdit) return;
    if (!zoneEdit.name.trim() || zoneEdit.recommendedDose <= 0) { notify('Podaj nazwę strefy i dawkę > 0', 'err'); return; }
    if ('id' in zoneEdit) { updateZone(zoneEdit); notify('Strefa zaktualizowana'); }
    else { addZone(zoneEdit); notify('Dodano strefę'); }
    setZoneEdit(null);
  };

  // wartość warstwy glebowej — REALNA (pomiar pola)
  const soilVal = field ? (layer === 'pH' ? String(field.pH) : layer === 'P' ? field.P : layer === 'K' ? field.K : layer === 'Mg' ? field.Mg : null) : null;
  const layerMeta = LAYERS.find((l) => l.id === layer)!;

  return (
    <div className="space-y-4" data-testid="precision-section">
      <SectionTitle title="📡 Rolnictwo Precyzyjne — VRA i Strefy" sub="Mapy zmiennego dawkowania na realnym obrysie pól z GIS. Eksport CSV/GeoJSON działa; ISO-XML/ISOBUS jako interfejs." />

      {/* Wybór pola + warstwy */}
      <Card className="!p-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Pole (z GIS)" value={fieldId} onChange={(e) => setFieldId(e.target.value)} data-testid="precision-field-select">
            {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtNum(f.area)} ha)</option>)}
          </Select>
          <Select label="Warstwa mapy" value={layer} onChange={(e) => setLayer(e.target.value as Layer)} data-testid="precision-layer-select">
            {LAYERS.map((l) => <option key={l.id} value={l.id}>{l.label} ({l.unit}){l.real ? '' : ' — brak danych'}</option>)}
          </Select>
        </div>
      </Card>

      {field && (
        <Card className="!p-3" data-testid="soil-import-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-100">🧪 Import próbek gleby (CSV)</h4>
              <p className="text-xs text-slate-400 mt-0.5">Kolumny: <code className="text-slate-300">lat, lng, pH, P, K, Mg</code> (separator , lub ;). Buduje realną mapę zasobności (IDW) dla warstw pH/P/K/Mg.</p>
              <p className="text-[11px] text-slate-500 mt-1">Próbek dla pola „{field.name}”: <b className="text-emerald-400">{fieldSamples.length}</b></p>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                📥 Wczytaj CSV
                <input type="file" accept=".csv,text/csv" className="hidden" data-testid="soil-import-input" onChange={importCsv} />
              </label>
              {fieldSamples.length > 0 && <Btn variant="danger" className="!py-2 text-sm" data-testid="soil-clear-btn" onClick={() => { clearSoilSamples(field.id); notify('Usunięto próbki pola'); }}>Wyczyść</Btn>}
            </div>
          </div>
        </Card>
      )}

      {!field && <Card><EmptyState icon="📡" text="Brak pól w tym gospodarstwie. Dodaj pole w GIS, aby tworzyć mapy VRA." /></Card>}

      {field && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* MAPA / WARSTWA */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-100">🗺️ {layerMeta.label} — {field.name}</h4>
              <Badge tone={layerMeta.real ? 'info' : 'warn'}>{layer === 'zones' ? 'ESTYMACJA modelu zmienności' : layerMeta.real ? `pomiar · ${new Date().getFullYear()}` : 'BRAK DANYCH POMIAROWYCH'}</Badge>
            </div>

            {layer === 'zones' ? (
              <>
                <svg viewBox="0 0 140 100" className="w-full h-72 rounded-lg bg-slate-900 border border-slate-700/50" data-testid="vra-map">
                  {grid.map((row, y) => row.map((z, x) => (
                    <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width={10} height={10} fill={bandColors[z] || '#64748b'} opacity={0.8} />
                  )))}
                </svg>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  {bandDoses.map((d, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: bandColors[i] }} />
                      {fieldZones[i]?.name || `Strefa ${i + 1}`}: {Math.round(d)} kg/ha ({Math.round((stats.counts[i] / stats.total) * 100)}%)
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">⚠️ Mapa stref to ESTYMACJA z modelu zmienności (nie zdjęcie satelitarne). Zdefiniuj strefy z pomiarów, aby uzyskać dawki agronomiczne.</p>
              </>
            ) : nutrient && soilGrid && soilBB ? (
              <>
                <svg viewBox="0 0 140 100" className="w-full h-72 rounded-lg bg-slate-900 border border-slate-700/50" data-testid="soil-map">
                  {soilGrid.map((row, y) => row.map((v, x) => (v == null ? null : (
                    <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width={10} height={10} fill={classify(nutrient, v).color} opacity={0.82} />
                  ))))}
                  {fieldSamples.map((s) => {
                    const px = ((s.lng - soilBB.minLng) / ((soilBB.maxLng - soilBB.minLng) || 1)) * 140;
                    const py = ((soilBB.maxLat - s.lat) / ((soilBB.maxLat - soilBB.minLat) || 1)) * 100;
                    return <circle key={s.id} cx={px} cy={py} r={1.6} fill="#fff" stroke="#0f172a" strokeWidth={0.4} />;
                  })}
                </svg>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  {NUTRIENTS[nutrient].classes.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: c.color }} />{c.label}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Mapa z <b className="text-slate-300">{fieldSamples.length} próbek</b> (interpolacja IDW). Średnia {layerMeta.label}: <b className="text-emerald-400">{fmtNum(average(fieldSamples, nutrient) || 0, 1)} {layerMeta.unit}</b>. Białe punkty = lokalizacje próbek.</p>
              </>
            ) : layerMeta.real ? (
              <div className="h-72 flex flex-col items-center justify-center rounded-lg bg-slate-900 border border-slate-700/50 text-center">
                <div className="text-6xl mb-3">🧪</div>
                <div className="text-3xl font-black text-emerald-400">{soilVal}</div>
                <div className="text-sm text-slate-400 mt-1">{layerMeta.label} · pomiar punktowy pola</div>
                <div className="text-xs text-slate-500 mt-2 max-w-xs">Zaimportuj georeferencyjne próbki gleby (CSV powyżej), aby zobaczyć mapę zmienności przestrzennej zamiast pojedynczego pomiaru.</div>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center rounded-lg bg-slate-900 border border-slate-700/50 text-center">
                <div className="text-6xl mb-3">🛰️</div>
                <div className="text-xl font-black text-amber-400">BRAK DANYCH DLA TEGO POLA</div>
                <div className="text-xs text-slate-500 mt-2 max-w-xs">Warstwa {layerMeta.label} wymaga zdjęć satelitarnych (Sentinel-2). Interfejs teledetekcji: <b className="text-slate-300">PRZYGOTOWANE DO INTEGRACJI</b> — nie pokazujemy zmyślonych wartości.</div>
              </div>
            )}
          </Card>

          {/* GENERATOR VRA */}
          <Card>
            <h4 className="font-semibold text-slate-100 mb-3">⚙️ Generator mapy VRA</h4>
            <div className="grid gap-3">
              <Select label="Produkt / nawóz" value={product} onChange={(e) => setProduct(e.target.value)}>
                {['Saletra amonowa 34%', 'Saletrzak 27%', 'RSM 32%', 'Polifoska 6', 'Sól potasowa 60%', 'Wapno węglanowe', 'Materiał siewny'].map((x) => <option key={x}>{x}</option>)}
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input label="Bazowa" type="number" value={base} onChange={(e) => setBase(+e.target.value)} />
                <Input label="Min" type="number" value={min} onChange={(e) => setMin(+e.target.value)} />
                <Input label="Max" type="number" value={max} onChange={(e) => setMax(+e.target.value)} />
              </div>
              {fieldZones.length > 0 && <p className="text-[11px] text-emerald-400">Dawki pobrane z {fieldZones.length} zdefiniowanych stref pola.</p>}
              <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Średnia dawka</span><b className="text-emerald-400">{fmtNum(stats.avg, 0)} kg/ha</b></div>
                <div className="flex justify-between"><span className="text-slate-400">Zapotrzebowanie</span><b className="text-emerald-400">{fmtNum(stats.totalProduct, 2)} t</b></div>
                <div className="flex justify-between"><span className="text-slate-400">vs dawka stała {base} kg/ha</span><b className="text-sky-400">{fmtNum((base * field.area) / 1000 - stats.totalProduct, 2)} t</b></div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Eksport mapy aplikacji:</div>
                <div className="flex gap-2">
                  <Btn className="flex-1 !py-1.5 text-xs" data-testid="vra-export-csv" onClick={exportCSV}>CSV</Btn>
                  <Btn className="flex-1 !py-1.5 text-xs" data-testid="vra-export-geojson" onClick={exportGeoJSON}>GeoJSON</Btn>
                  <Btn variant="outline" className="flex-1 !py-1.5 text-xs" data-testid="vra-export-iso" onClick={exportISO}>ISO-XML</Btn>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">✅ CSV i GeoJSON w pełni działają (obrys pola z GIS). ISO-XML/TASKDATA: <b className="text-slate-300">PRZYGOTOWANE DO INTEGRACJI</b> — pobierany szablon ISO 11783-10.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STREFY ZARZĄDZANIA */}
      {field && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-100">🎯 Strefy zarządzania — {field.name}</h4>
            <Btn data-testid="zone-add-btn" onClick={() => setZoneEdit(emptyZone(fieldId))}>+ Dodaj strefę</Btn>
          </div>
          {fieldZones.length === 0 && <EmptyState icon="🎯" text="Brak stref dla tego pola. Dodaj strefy (A/B/C) z pomiarów, aby generować dawki VRA." />}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fieldZones.map((z) => (
              <div key={z.id} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3" data-testid={`zone-card-${z.id}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-slate-100"><span className="w-4 h-4 rounded" style={{ background: z.color }} />{z.name}</span>
                  <span className="text-xs text-slate-400">{z.areaShare}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span>pH: <b className="text-slate-200">{z.pH ?? '—'}</b></span>
                  <span>P: <b className="text-slate-200">{z.P ?? '—'}</b></span>
                  <span>K: <b className="text-slate-200">{z.K ?? '—'}</b></span>
                  <span>Mg: <b className="text-slate-200">{z.Mg ?? '—'}</b></span>
                  <span>NDVI: <b className="text-slate-200">{z.ndvi ?? '—'}</b></span>
                  <span>Plon: <b className="text-slate-200">{z.yield ?? '—'} t/ha</b></span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-400">{z.recommendedDose} kg/ha</span>
                  <div className="flex gap-1.5">
                    <Btn variant="ghost" className="!py-1 !px-2 text-[11px]" data-testid={`zone-edit-${z.id}`} onClick={() => setZoneEdit(z)}>✏️</Btn>
                    <Btn variant="danger" className="!py-1 !px-2 text-[11px]" data-testid={`zone-del-${z.id}`} onClick={() => setConfirmDel(z.id)}>🗑️</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!zoneEdit} onClose={() => setZoneEdit(null)} title={zoneEdit && 'id' in zoneEdit ? 'Edycja strefy' : 'Nowa strefa zarządzania'} wide>
        {zoneEdit && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nazwa strefy *" data-testid="zone-name" value={zoneEdit.name} onChange={(e) => setZoneEdit({ ...zoneEdit, name: e.target.value })} />
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kolor</label>
              <div className="flex gap-1.5">{DEFAULT_COLORS.map((c) => <button key={c} onClick={() => setZoneEdit({ ...zoneEdit, color: c })} className={`w-8 h-8 rounded-lg border-2 ${zoneEdit.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}</div>
            </div>
            <Input label="Udział powierzchni (%)" type="number" value={zoneEdit.areaShare} onChange={(e) => setZoneEdit({ ...zoneEdit, areaShare: +e.target.value })} />
            <Input label="Zalecana dawka (kg/ha) *" type="number" data-testid="zone-dose" value={zoneEdit.recommendedDose} onChange={(e) => setZoneEdit({ ...zoneEdit, recommendedDose: +e.target.value })} />
            <Input label="pH" type="number" step="0.1" value={zoneEdit.pH ?? ''} onChange={(e) => setZoneEdit({ ...zoneEdit, pH: +e.target.value })} />
            <Input label="NDVI" type="number" step="0.01" value={zoneEdit.ndvi ?? ''} onChange={(e) => setZoneEdit({ ...zoneEdit, ndvi: +e.target.value })} />
            <Select label="Fosfor (P)" value={zoneEdit.P ?? 'średnia'} onChange={(e) => setZoneEdit({ ...zoneEdit, P: e.target.value })}>{['bardzo niska', 'niska', 'średnia', 'wysoka', 'bardzo wysoka'].map((x) => <option key={x}>{x}</option>)}</Select>
            <Select label="Potas (K)" value={zoneEdit.K ?? 'średnia'} onChange={(e) => setZoneEdit({ ...zoneEdit, K: e.target.value })}>{['bardzo niska', 'niska', 'średnia', 'wysoka', 'bardzo wysoka'].map((x) => <option key={x}>{x}</option>)}</Select>
            <Select label="Magnez (Mg)" value={zoneEdit.Mg ?? 'średnia'} onChange={(e) => setZoneEdit({ ...zoneEdit, Mg: e.target.value })}>{['bardzo niska', 'niska', 'średnia', 'wysoka', 'bardzo wysoka'].map((x) => <option key={x}>{x}</option>)}</Select>
            <Input label="Plon (t/ha)" type="number" step="0.1" value={zoneEdit.yield ?? ''} onChange={(e) => setZoneEdit({ ...zoneEdit, yield: +e.target.value })} />
            <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
              <Btn variant="ghost" onClick={() => setZoneEdit(null)}>Anuluj</Btn>
              <Btn data-testid="zone-save-btn" onClick={saveZone}>Zapisz strefę</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { if (confirmDel) { deleteZone(confirmDel); notify('Strefa usunięta'); } }} text="Usunąć tę strefę zarządzania?" />
    </div>
  );
}
