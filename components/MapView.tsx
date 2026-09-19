import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Field } from '@/types';

interface Props {
  fields: Field[];
  colorFor: (f: Field, i: number) => string;
  labelFor?: (f: Field) => string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  drawing?: boolean;
  draft?: [number, number][]; // [lat, lng]
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  center?: [number, number];
}

export function geoAreaHa(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const xy = pts.map(([lat, lng]) => [lng * mPerDegLng, lat * mPerDegLat]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 10000;
}

export default function MapView({ fields, colorFor, labelFor, selectedId, onSelect, drawing, draft, onMapClick, height = '420px', center }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const draftRef = useRef<L.LayerGroup | null>(null);
  const drawingRef = useRef(drawing);
  const onClickRef = useRef(onMapClick);
  drawingRef.current = drawing;
  onClickRef.current = onMapClick;

  // init mapy
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    map.setView(center || [52.648, 19.067], 13);
    layerRef.current = L.layerGroup().addTo(map);
    draftRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (drawingRef.current) onClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pola
  useEffect(() => {
    const map = mapRef.current, lg = layerRef.current;
    if (!map || !lg) return;
    lg.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    fields.forEach((f, i) => {
      if (!f.geo || f.geo.length < 3) return;
      const col = colorFor(f, i);
      const poly = L.polygon(f.geo as L.LatLngExpression[], {
        color: f.id === selectedId ? '#10b981' : col,
        weight: f.id === selectedId ? 3 : 1.5,
        fillColor: col,
        fillOpacity: f.id === selectedId ? 0.55 : 0.35,
      });
      poly.bindTooltip(`${f.name} — ${f.area} ha${labelFor ? ` · ${labelFor(f)}` : ''}`, { sticky: true });
      poly.on('click', () => { if (!drawingRef.current) onSelect?.(f.id); });
      poly.addTo(lg);
      f.geo.forEach((p) => bounds.push(p as L.LatLngExpression));
    });
    if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds).pad(0.08));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedId, colorFor]);

  // szkic rysowania
  useEffect(() => {
    const dg = draftRef.current;
    if (!dg) return;
    dg.clearLayers();
    if (!draft || draft.length === 0) return;
    draft.forEach((p) => L.circleMarker(p, { radius: 5, color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }).addTo(dg));
    if (draft.length >= 2) L.polyline(draft, { color: '#10b981', dashArray: '6 4', weight: 2 }).addTo(dg);
    if (draft.length >= 3) L.polygon(draft, { color: '#10b981', weight: 1, fillColor: '#10b981', fillOpacity: 0.2 }).addTo(dg);
  }, [draft]);

  return (
    <div className="relative">
      <div ref={divRef} style={{ height }} className={`w-full rounded-lg border border-slate-700/50 z-0 ${drawing ? 'cursor-crosshair' : ''}`} />
      {drawing && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/90 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-1.5 rounded-full pointer-events-none">
          ✏️ Tryb rysowania — klikaj na mapie, aby stawiać wierzchołki pola
        </div>
      )}
    </div>
  );
}
