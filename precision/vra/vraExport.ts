// FMS PRECISION — eksport map VRA (Variable Rate Application)
// CSV i GeoJSON są w pełni funkcjonalne. ISO-XML/TASKDATA to interfejs „przygotowany do integracji".
import type { Field } from '@/types';

export interface BBox { minLat: number; maxLat: number; minLng: number; maxLng: number }

export function bboxOf(geo: [number, number][]): BBox {
  const lats = geo.map((p) => p[0]);
  const lngs = geo.map((p) => p[1]);
  return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
}

export interface VraCell { lat: number; lng: number; zone: number; dose: number }

/** Zamienia siatkę stref (rows×cols) na komórki geo z dawką, rozpięte na obrysie pola. */
export function gridToCells(field: Pick<Field, 'geo'>, grid: number[][], doses: number[]): VraCell[] {
  if (!field.geo || field.geo.length < 3) return [];
  const bb = bboxOf(field.geo);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const cells: VraCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const zone = grid[r][c];
      const lat = bb.maxLat - ((r + 0.5) / rows) * (bb.maxLat - bb.minLat);
      const lng = bb.minLng + ((c + 0.5) / cols) * (bb.maxLng - bb.minLng);
      cells.push({ lat, lng, zone, dose: doses[zone] ?? 0 });
    }
  }
  return cells;
}

export function cellsToCSV(cells: VraCell[]): string {
  const head = 'lat,lng,zone,dose_kg_ha';
  const rows = cells.map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)},${c.zone + 1},${Math.round(c.dose)}`);
  return [head, ...rows].join('\n');
}

/** Prawidłowy GeoJSON FeatureCollection — poligon na komórkę z właściwością dawki. */
export function gridToGeoJSON(field: Pick<Field, 'geo'> & { name?: string }, grid: number[][], doses: number[], product: string, unit: string): string {
  const bb = bboxOf(field.geo);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const dLat = (bb.maxLat - bb.minLat) / rows;
  const dLng = (bb.maxLng - bb.minLng) / cols;
  const features = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const zone = grid[r][c];
      const top = bb.maxLat - r * dLat;
      const bottom = top - dLat;
      const left = bb.minLng + c * dLng;
      const right = left + dLng;
      features.push({
        type: 'Feature',
        properties: { zone: zone + 1, rate: Math.round(doses[zone] ?? 0), unit, product },
        geometry: {
          type: 'Polygon',
          coordinates: [[[left, top], [right, top], [right, bottom], [left, bottom], [left, top]]],
        },
      });
    }
  }
  return JSON.stringify({
    type: 'FeatureCollection',
    properties: { title: `VRA ${field.name || ''}`.trim(), product, unit, generator: 'FMS Precision 3.0' },
    features,
  }, null, 0);
}

/** Szablon ISO-XML / TASKDATA — struktura przygotowana do integracji z terminalami ISOBUS. */
export function isoXmlTemplate(fieldName: string, product: string, min: number, max: number, avg: number, unit: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- FMS PRECISION 3.0 — TASKDATA (ISO 11783-10) — SZABLON „PRZYGOTOWANE DO INTEGRACJI" -->
<!-- Pełna zgodność z terminalem ISOBUS wymaga modułu produkcyjnego (DDI, PDT, VPN, TZN). -->
<ISO11783_TaskData VersionMajor="4" VersionMinor="0" ManagementSoftwareManufacturer="FMS Precision" DataTransferOrigin="1">
  <TSK A="TSK1" B="VRA ${fieldName}" G="1">
    <TZN A="1" B="${product}">
      <PDV A="0006" B="${Math.round(min)}" C="${unit}"/>
      <PDV A="0006" B="${Math.round(max)}" C="${unit}"/>
    </TZN>
    <CAN A="VRA" B="${Math.round(avg)}" C="${unit} (średnia)"/>
  </TSK>
</ISO11783_TaskData>`;
}
