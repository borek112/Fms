// FMS PRECISION — import georeferencyjnych próbek gleby (CSV) + interpolacja IDW map zasobności
export type Nutrient = 'pH' | 'P' | 'K' | 'Mg';

export interface RawSoilSample {
  lat: number;
  lng: number;
  pH?: number;
  P?: number; // mg/kg
  K?: number;
  Mg?: number;
  date?: string;
}

interface ClassDef { max: number; label: string; color: string }

export const NUTRIENTS: Record<Nutrient, { unit: string; classes: ClassDef[] }> = {
  pH: { unit: 'pH', classes: [
    { max: 5.0, label: 'b. kwaśna', color: '#b91c1c' },
    { max: 5.5, label: 'kwaśna', color: '#ef4444' },
    { max: 6.0, label: 'lekko kwaśna', color: '#f59e0b' },
    { max: 6.5, label: 'obojętna', color: '#a3e635' },
    { max: 7.2, label: 'optymalna', color: '#10b981' },
    { max: Infinity, label: 'zasadowa', color: '#38bdf8' },
  ] },
  P: { unit: 'mg/kg', classes: [
    { max: 10, label: 'b. niska', color: '#b91c1c' },
    { max: 20, label: 'niska', color: '#ef4444' },
    { max: 30, label: 'średnia', color: '#f59e0b' },
    { max: 45, label: 'wysoka', color: '#a3e635' },
    { max: Infinity, label: 'b. wysoka', color: '#10b981' },
  ] },
  K: { unit: 'mg/kg', classes: [
    { max: 60, label: 'b. niska', color: '#b91c1c' },
    { max: 120, label: 'niska', color: '#ef4444' },
    { max: 180, label: 'średnia', color: '#f59e0b' },
    { max: 250, label: 'wysoka', color: '#a3e635' },
    { max: Infinity, label: 'b. wysoka', color: '#10b981' },
  ] },
  Mg: { unit: 'mg/kg', classes: [
    { max: 30, label: 'b. niska', color: '#b91c1c' },
    { max: 60, label: 'niska', color: '#ef4444' },
    { max: 100, label: 'średnia', color: '#f59e0b' },
    { max: 150, label: 'wysoka', color: '#a3e635' },
    { max: Infinity, label: 'b. wysoka', color: '#10b981' },
  ] },
};

export function classify(n: Nutrient, v: number): ClassDef {
  return NUTRIENTS[n].classes.find((c) => v <= c.max) || NUTRIENTS[n].classes[NUTRIENTS[n].classes.length - 1];
}

const numPl = (s: string): number | undefined => {
  const v = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
};

const KEYS: Record<string, string[]> = {
  lat: ['lat', 'latitude', 'szerokosc', 'szerokość', 'y'],
  lng: ['lng', 'lon', 'long', 'longitude', 'dlugosc', 'długość', 'x'],
  pH: ['ph', 'ph_kcl', 'phkcl', 'odczyn'],
  P: ['p', 'p2o5', 'fosfor', 'fosfor_p'],
  K: ['k', 'k2o', 'potas'],
  Mg: ['mg', 'magnez'],
};

/** Parsuje CSV próbek gleby. Obsługuje separator , lub ; oraz przecinek dziesiętny. */
export function parseSoilCSV(text: string): RawSoilSample[] {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (rows.length < 2) return [];
  const delim = (rows[0].match(/;/g)?.length || 0) > (rows[0].match(/,/g)?.length || 0) ? ';' : ',';
  const header = rows[0].split(delim).map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(KEYS)) {
    const i = header.findIndex((h) => aliases.includes(h));
    if (i >= 0) idx[field] = i;
  }
  if (idx.lat === undefined || idx.lng === undefined) return [];
  const out: RawSoilSample[] = [];
  for (let r = 1; r < rows.length; r++) {
    const c = rows[r].split(delim);
    const lat = numPl(c[idx.lat]);
    const lng = numPl(c[idx.lng]);
    if (lat === undefined || lng === undefined) continue;
    out.push({
      lat, lng,
      pH: idx.pH !== undefined ? numPl(c[idx.pH]) : undefined,
      P: idx.P !== undefined ? numPl(c[idx.P]) : undefined,
      K: idx.K !== undefined ? numPl(c[idx.K]) : undefined,
      Mg: idx.Mg !== undefined ? numPl(c[idx.Mg]) : undefined,
    });
  }
  return out;
}

interface Pt { lat: number; lng: number }

/** Interpolacja odwrotnych kwadratów odległości (IDW) wartości składnika w danym punkcie. */
export function idw(target: Pt, samples: RawSoilSample[], n: Nutrient, power = 2): number | null {
  let num = 0, den = 0;
  for (const s of samples) {
    const v = s[n];
    if (v === undefined) continue;
    const dLat = (s.lat - target.lat) * 111320;
    const dLng = (s.lng - target.lng) * 111320 * Math.cos((target.lat * Math.PI) / 180);
    const d2 = dLat * dLat + dLng * dLng;
    if (d2 < 1e-6) return v; // punkt pokrywa się z próbką
    const w = 1 / Math.pow(d2, power / 2);
    num += w * v;
    den += w;
  }
  return den > 0 ? num / den : null;
}

/** Buduje siatkę rows×cols zinterpolowanych wartości składnika na obrysie pola. */
export function buildNutrientGrid(
  geo: [number, number][], samples: RawSoilSample[], n: Nutrient, rows = 10, cols = 14,
): (number | null)[][] {
  if (geo.length < 3 || samples.length === 0) return [];
  const lats = geo.map((p) => p[0]);
  const lngs = geo.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const grid: (number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const lat = maxLat - ((r + 0.5) / rows) * (maxLat - minLat);
      const lng = minLng + ((c + 0.5) / cols) * (maxLng - minLng);
      row.push(idw({ lat, lng }, samples, n));
    }
    grid.push(row);
  }
  return grid;
}

export function average(samples: RawSoilSample[], n: Nutrient): number | null {
  const vals = samples.map((s) => s[n]).filter((v): v is number => v !== undefined);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
