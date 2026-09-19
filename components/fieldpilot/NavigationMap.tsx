import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GuidanceGeometry } from '@/geometry/guidance';

export type MapLayer = 'map' | 'satellite' | 'hybrid' | 'terrain' | 'field';

export interface MapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  fitField: () => void;
  invalidate: () => void;
}

interface Props {
  fieldGeo: [number, number][];
  geometry: GuidanceGeometry | null;
  activeLabel: string | null;
  position: { lat: number; lng: number; heading: number } | null;
  track: [number, number][];
  swaths?: [number, number][][];
  overlapPoints?: [number, number][];
  doneLabels?: string[];
  contour: [number, number][];
  pointA: [number, number] | null;
  pointB: [number, number] | null;
  night: boolean;
  layer?: MapLayer;
  rotation?: number;
  follow?: boolean;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onLineClick?: (label: string) => void;
}

const TILES: Record<string, { url: string; attr: string; max: number; sub?: string[] }> = {
  osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', max: 19, sub: ['a', 'b', 'c'] },
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap © CARTO', max: 20, sub: ['a', 'b', 'c', 'd'] },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri, Maxar, Earthstar Geographics', max: 19 },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '© OpenTopoMap (CC-BY-SA)', max: 17, sub: ['a', 'b', 'c'] },
};

// nakładki referencyjne (nazwy dróg i miejscowości) dla trybu HYBRYDA
const REF_OVERLAYS = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
];

function tileFor(layer: MapLayer, night: boolean) {
  if (layer === 'satellite' || layer === 'field' || layer === 'hybrid') return TILES.sat;
  if (layer === 'terrain') return TILES.terrain;
  return night ? TILES.dark : TILES.osm;
}

function tractorSvg(heading: number, accent: string): string {
  // profesjonalna ikona pojazdu ze stożkiem kierunku, obracana o heading
  return `
  <div style="width:96px;height:96px;transform:rotate(${heading}deg);transform-origin:center;transition:transform .25s linear">
    <svg viewBox="0 0 96 96" width="96" height="96">
      <defs>
        <radialGradient id="cone" cx="50%" cy="90%" r="70%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M48 8 L20 52 L76 52 Z" fill="url(#cone)"/>
      <g filter="url(#sh)">
        <path d="M48 24 L62 62 L48 54 L34 62 Z" fill="${accent}" stroke="#0b1220" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="48" cy="48" r="4.5" fill="#0b1220"/>
      </g>
    </svg>
  </div>`;
}

export const NavigationMap = forwardRef<MapHandle, Props>(function NavigationMap(
  { fieldGeo, geometry, activeLabel, position, track, swaths = [], overlapPoints = [], doneLabels = [], contour, pointA, pointB, night, layer = 'satellite', rotation = 0, follow = true, height = '100%', onMapClick, onLineClick },
  ref,
) {
  const divRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const overlayRef = useRef<L.TileLayer[]>([]);
  const overlapRef = useRef<L.LayerGroup | null>(null);
  const staticRef = useRef<L.LayerGroup | null>(null);
  const swathRef = useRef<L.LayerGroup | null>(null);
  const trackRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const clickRef = useRef<Props['onMapClick']>(onMapClick);
  const lineClickRef = useRef<Props['onLineClick']>(onLineClick);
  const fitSigRef = useRef('');
  clickRef.current = onMapClick;
  lineClickRef.current = onLineClick;

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    center: () => { if (mapRef.current && position) mapRef.current.panTo([position.lat, position.lng], { animate: true, duration: 0.4 }); },
    fitField: () => { if (mapRef.current && fieldGeo.length >= 3) mapRef.current.fitBounds(L.latLngBounds(fieldGeo as L.LatLngExpression[]).pad(0.12)); },
    invalidate: () => mapRef.current?.invalidateSize(),
  }));

  // init
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: false, minZoom: 3, maxZoom: 20, zoomSnap: 0.5, preferCanvas: true, fadeAnimation: true });
    const t = tileFor(layer, night);
    tileRef.current = L.tileLayer(t.url, { maxZoom: t.max, subdomains: t.sub ?? [], maxNativeZoom: t.max }).addTo(map);
    swathRef.current = L.layerGroup().addTo(map);
    staticRef.current = L.layerGroup().addTo(map);
    overlapRef.current = L.layerGroup().addTo(map);
    map.setView(fieldGeo.length ? [fieldGeo[0][0], fieldGeo[0][1]] : [52.648, 19.067], 16);
    map.on('click', (e: L.LeafletMouseEvent) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; fitSigRef.current = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // warstwa kafelków + nakładki HYBRYDA
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (tileRef.current) map.removeLayer(tileRef.current);
      overlayRef.current.forEach((o) => map.removeLayer(o));
      overlayRef.current = [];
      const t = tileFor(layer, night);
      tileRef.current = L.tileLayer(t.url, { maxZoom: t.max, subdomains: t.sub ?? [], maxNativeZoom: t.max }).addTo(map);
      tileRef.current.bringToBack();
      if (layer === 'hybrid') {
        overlayRef.current = REF_OVERLAYS.map((url) => L.tileLayer(url, { maxZoom: 19, maxNativeZoom: 19, opacity: night ? 0.75 : 1 }).addTo(map));
      }
    } catch {
      /* pomiń */
    }
  }, [layer, night]);

  // pole + linie AB + kontur + A/B
  useEffect(() => {
    const lg = staticRef.current;
    const map = mapRef.current;
    if (!lg || !map) return;
    lg.clearLayers();
    const acc = night ? '#ff3b30' : '#22c55e';

    if (fieldGeo.length >= 3) {
      // poświata granicy
      L.polygon(fieldGeo as L.LatLngExpression[], { color: night ? '#ff3b30' : '#34d399', weight: 9, opacity: 0.25, fill: false, lineJoin: 'round' }).addTo(lg);
      L.polygon(fieldGeo as L.LatLngExpression[], { color: night ? '#ff5a52' : '#4ade80', weight: 3, opacity: 0.95, fillColor: night ? '#ff3b30' : '#10b981', fillOpacity: 0.1, lineJoin: 'round' }).addTo(lg);
    }

    if (contour.length >= 2) {
      L.polyline(contour as L.LatLngExpression[], { color: night ? '#ff5a52' : '#38bdf8', weight: 2, dashArray: '2 6' }).addTo(lg);
    }

    if (geometry) {
      const done = new Set(doneLabels);
      geometry.lines.forEach((line) => {
        const active = line.label === activeLabel;
        const isDone = !active && done.has(line.label);
        line.segments.forEach((seg) => {
          if (active) {
            L.polyline(seg as L.LatLngExpression[], { color: '#000', weight: 7, opacity: 0.35 }).addTo(lg);
            L.polyline(seg as L.LatLngExpression[], { color: night ? '#ff3b30' : '#facc15', weight: 4, opacity: 1 }).addTo(lg);
          } else if (isDone) {
            // WYKONANE — przygaszona, ciągła linia
            const pl = L.polyline(seg as L.LatLngExpression[], { color: night ? '#6b7280' : '#94a3b8', weight: 3, opacity: 0.55 }).addTo(lg);
            pl.on('click', (e: L.LeafletMouseEvent) => { L.DomEvent.stop(e); lineClickRef.current?.(line.label); });
          } else {
            // POZOSTAŁE (przyszłe) — jasna, przerywana
            const pl = L.polyline(seg as L.LatLngExpression[], { color: night ? '#ff8a80' : '#34d399', weight: 2, opacity: night ? 0.7 : 0.85, dashArray: '2 7' }).addTo(lg);
            pl.on('click', (e: L.LeafletMouseEvent) => { L.DomEvent.stop(e); lineClickRef.current?.(line.label); });
          }
        });
        const seg0 = line.segments[0];
        if (seg0 && (active || line.index % 2 === 0)) {
          const bg = active ? (night ? '#ff3b30' : '#facc15') : isDone ? 'rgba(100,116,139,.75)' : 'rgba(15,23,42,.7)';
          const fg = active ? '#000' : '#e2e8f0';
          L.marker(seg0[0] as L.LatLngExpression, {
            icon: L.divIcon({ className: '', html: `<div style="transform:rotate(calc(-1*var(--map-rot,0deg)));background:${bg};color:${fg};font-weight:800;font-size:10px;padding:1px 5px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.5)">${line.label}</div>`, iconSize: [0, 0] }),
            interactive: false,
          }).addTo(lg);
        }
      });
    }

    const mk = (p: [number, number], label: string, col: string) =>
      L.marker(p as L.LatLngExpression, {
        icon: L.divIcon({ className: '', html: `<div style="transform:rotate(calc(-1*var(--map-rot,0deg)));background:${col};color:#fff;font-weight:800;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${label}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        interactive: false,
      }).addTo(lg);
    if (pointA) mk(pointA, 'A', '#16a34a');
    if (pointB) mk(pointB, 'B', '#dc2626');
    void acc;

    const sig = fieldGeo.map((p) => p.join(',')).join(';');
    if (sig && sig !== fitSigRef.current && fieldGeo.length >= 3) {
      map.fitBounds(L.latLngBounds(fieldGeo as L.LatLngExpression[]).pad(0.12));
      fitSigRef.current = sig;
    }
  }, [fieldGeo, geometry, activeLabel, contour, pointA, pointB, night, doneLabels]);

  // NAKŁADKI — miejsca podwójnego pokrycia
  useEffect(() => {
    const lg = overlapRef.current;
    if (!lg) return;
    lg.clearLayers();
    overlapPoints.forEach((p) => {
      L.circleMarker(p as L.LatLngExpression, { radius: 5, stroke: true, color: '#fff', weight: 1, fillColor: '#f97316', fillOpacity: 0.85 }).addTo(lg);
    });
  }, [overlapPoints]);

  // pas roboczy (pokrycie)
  useEffect(() => {
    const lg = swathRef.current;
    if (!lg) return;
    lg.clearLayers();
    const col = night ? '#ff3b30' : '#10b981';
    swaths.forEach((q) => {
      L.polygon(q as L.LatLngExpression[], { stroke: false, fillColor: col, fillOpacity: night ? 0.18 : 0.22 }).addTo(lg);
    });
  }, [swaths, night]);

  // ślad
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!trackRef.current) trackRef.current = L.polyline([], { color: night ? '#ffd1cf' : '#38bdf8', weight: 3.5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }).addTo(map);
    trackRef.current.setStyle({ color: night ? '#ffd1cf' : '#38bdf8' });
    trackRef.current.setLatLngs(track as L.LatLngExpression[]);
    trackRef.current.bringToFront();
  }, [track, night]);

  // pozycja ciągnika
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    try {
      const html = tractorSvg(position.heading, night ? '#ff453a' : '#22c55e');
      if (!markerRef.current) {
        markerRef.current = L.marker([position.lat, position.lng], { icon: L.divIcon({ className: '', html, iconSize: [96, 96], iconAnchor: [48, 48] }), zIndexOffset: 1000, interactive: false }).addTo(map);
      } else {
        markerRef.current.setLatLng([position.lat, position.lng]);
        markerRef.current.setIcon(L.divIcon({ className: '', html, iconSize: [96, 96], iconAnchor: [48, 48] }));
      }
      if (follow) map.panTo([position.lat, position.lng], { animate: true, duration: 0.45, easeLinearity: 0.5 });
    } catch {
      /* redraw w trakcie zmiany warstwy/obrotu — pomiń */
    }
  }, [position, follow, night]);

  // obrót mapy (course-up)
  useEffect(() => {
    if (rotRef.current) {
      rotRef.current.style.setProperty('--map-rot', `${rotation}deg`);
      rotRef.current.style.transform = `rotate(${rotation}deg)`;
    }
  }, [rotation]);

  return (
    <div className={`relative w-full overflow-hidden ${night ? 'pilot-night' : ''}`} style={{ height }} data-testid="navigation-map">
      <div ref={rotRef} className="absolute" style={{ top: '-28%', left: '-28%', width: '156%', height: '156%', transformOrigin: 'center center', transition: 'transform .3s linear', ['--map-rot' as string]: '0deg' }}>
        <div ref={divRef} className="w-full h-full" />
      </div>
    </div>
  );
});
