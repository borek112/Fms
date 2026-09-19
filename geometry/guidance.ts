// FMS FIELD PILOT — geometria prowadzenia GNSS
// Wszystkie obliczenia wykonywane w lokalnym układzie metrycznym (ENU / equirectangular),
// NIGDY bezpośrednio w stopniach.

export interface LL { lat: number; lng: number }
export interface Vec2 { x: number; y: number }

const M_PER_DEG_LAT = 111320;

/** Lokalna projekcja metryczna względem punktu odniesienia (origin). x = wschód [m], y = północ [m]. */
export function projector(origin: LL) {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
  return {
    toLocal: (p: LL): Vec2 => ({
      x: (p.lng - origin.lng) * mPerDegLng,
      y: (p.lat - origin.lat) * M_PER_DEG_LAT,
    }),
    toLL: (v: Vec2): LL => ({
      lat: origin.lat + v.y / M_PER_DEG_LAT,
      lng: origin.lng + v.x / mPerDegLng,
    }),
  };
}

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}
/** Obrót +90° (w lewo względem kierunku jazdy). */
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Odległość w metrach między dwoma punktami GPS. */
export function distanceMeters(a: LL, b: LL): number {
  const proj = projector(a);
  return len(proj.toLocal(b));
}

/** Kurs (bearing) z punktu a do b w stopniach [0..360), 0 = północ, 90 = wschód. */
export function bearing(a: LL, b: LL): number {
  const proj = projector(a);
  const v = proj.toLocal(b);
  if (len(v) < 1e-9) return 0;
  const deg = (Math.atan2(v.x, v.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Ray-casting: czy punkt lokalny leży wewnątrz wielokąta (lokalne wsp.). */
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Pole wielokąta w hektarach na podstawie współrzędnych geograficznych [lat,lng]. */
export function polygonAreaHa(geo: [number, number][]): number {
  if (geo.length < 3) return 0;
  const lat0 = geo.reduce((a, p) => a + p[0], 0) / geo.length;
  const mLng = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const xy = geo.map(([lat, lng]) => [lng * mLng, lat * M_PER_DEG_LAT]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 10000;
}

export interface GuidanceLine {
  index: number; // podpisany indeks k
  label: string; // L1, L2, ...
  offset: number; // odsunięcie [m] od linii bazowej AB (k*width + shift)
  segments: [number, number][][]; // odcinki w [lat,lng] przycięte do pola
}

export interface GuidanceGeometry {
  origin: LL; // punkt A
  dir: Vec2; // kierunek jednostkowy A→B
  normal: Vec2; // wektor normalny jednostkowy (w lewo od kierunku)
  headingDeg: number; // kurs linii AB
  lines: GuidanceLine[];
  width: number;
  shift: number;
}

interface RawLine {
  index: number;
  offset: number;
  segments: [number, number][][];
}

/** Przecięcia prostej P(t)=p0+dir*t z krawędziami wielokąta -> lista parametrów t. */
function lineCrossings(p0: Vec2, dir: Vec2, poly: Vec2[]): number[] {
  const ts: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const v1 = poly[i];
    const v2 = poly[(i + 1) % poly.length];
    const e = sub(v2, v1);
    const det = dir.x * -e.y - -e.x * dir.y;
    if (Math.abs(det) < 1e-9) continue;
    const rx = v1.x - p0.x;
    const ry = v1.y - p0.y;
    const t = (rx * -e.y - -e.x * ry) / det;
    const u = (dir.x * ry - dir.y * rx) / det;
    if (u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
  }
  return ts.sort((a, b) => a - b);
}

/** Przycina nieskończoną prostą do wnętrza wielokąta, zwraca odcinki jako pary [t0,t1]. */
function clipLineToPolygon(p0: Vec2, dir: Vec2, poly: Vec2[]): [number, number][] {
  const ts = lineCrossings(p0, dir, poly);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i];
    const t1 = ts[i + 1];
    if (t1 - t0 < 1e-6) continue;
    const mid = add(p0, scale(dir, (t0 + t1) / 2));
    if (pointInPolygon(mid, poly)) out.push([t0, t1]);
  }
  return out;
}

const MAX_LINES = 4000;

/**
 * Generuje równoległe linie prowadzenia AB przycięte do granicy pola.
 * @param a punkt A [lat,lng]
 * @param b punkt B [lat,lng]
 * @param width szerokość robocza [m]
 * @param shift przesunięcie wszystkich linii [m]
 * @param fieldGeo granica pola [lat,lng][]
 */
export function generateABLines(
  a: LL,
  b: LL,
  width: number,
  shift: number,
  fieldGeo: [number, number][],
): GuidanceGeometry {
  const proj = projector(a);
  const bl = proj.toLocal(b);
  const dir = normalize(bl);
  const normal = perp(dir);
  const headingDeg = bearing(a, b);
  const empty: GuidanceGeometry = { origin: a, dir, normal, headingDeg, lines: [], width, shift };
  if (len(dir) < 1e-9 || width <= 0) return empty;

  const poly: Vec2[] = fieldGeo.length >= 3 ? fieldGeo.map(([lat, lng]) => proj.toLocal({ lat, lng })) : [];

  // zakres indeksów linii wzdłuż wektora normalnego
  let sMin: number;
  let sMax: number;
  let tPad = 500;
  if (poly.length >= 3) {
    const ss = poly.map((v) => dot(v, normal));
    const tt = poly.map((v) => dot(v, dir));
    sMin = Math.min(...ss);
    sMax = Math.max(...ss);
    tPad = Math.max(...tt) - Math.min(...tt) + width;
  } else {
    // bez pola — kilka linii wokół AB
    sMin = -width * 10;
    sMax = width * 10;
  }
  const kMin = Math.floor((sMin - shift) / width) - 1;
  const kMax = Math.ceil((sMax - shift) / width) + 1;
  if (kMax - kMin > MAX_LINES) return empty;

  const raw: RawLine[] = [];
  for (let k = kMin; k <= kMax; k++) {
    const offset = k * width + shift;
    const base = scale(normal, offset);
    if (poly.length >= 3) {
      const clips = clipLineToPolygon(base, dir, poly);
      if (clips.length === 0) continue;
      const segments = clips.map(([t0, t1]) => {
        const s = proj.toLL(add(base, scale(dir, t0)));
        const e = proj.toLL(add(base, scale(dir, t1)));
        return [
          [s.lat, s.lng],
          [e.lat, e.lng],
        ] as [number, number][];
      });
      raw.push({ index: k, offset, segments });
    } else {
      const s = proj.toLL(add(base, scale(dir, -tPad)));
      const e = proj.toLL(add(base, scale(dir, tPad)));
      raw.push({
        index: k,
        offset,
        segments: [[[s.lat, s.lng], [e.lat, e.lng]] as [number, number][]],
      });
    }
  }

  raw.sort((x, y) => x.offset - y.offset);
  const lines: GuidanceLine[] = raw.map((r, i) => ({
    index: r.index,
    label: `L${i + 1}`,
    offset: r.offset,
    segments: r.segments,
  }));
  return { origin: a, dir, normal, headingDeg, lines, width, shift };
}

export interface NearestLineResult {
  line: GuidanceLine | null;
  xte: number; // odchylenie [m]; >0 = jesteś na lewo od linii (skręć w prawo)
  offsetCorr: number;
}

/** Znajduje najbliższą linię i liczy cross-track error (odchylenie). */
export function nearestLine(pos: LL, g: GuidanceGeometry, offsetCorr = 0): NearestLineResult {
  if (g.lines.length === 0) return { line: null, xte: 0, offsetCorr };
  const proj = projector(g.origin);
  const s = dot(proj.toLocal(pos), g.normal) - offsetCorr;
  let best: GuidanceLine = g.lines[0];
  let bestXte = s - best.offset;
  for (const line of g.lines) {
    const xte = s - line.offset;
    if (Math.abs(xte) < Math.abs(bestXte)) {
      best = line;
      bestXte = xte;
    }
  }
  return { line: best, xte: bestXte, offsetCorr };
}

/** Cross-track error względem konkretnej linii. */
export function crossTrackError(pos: LL, g: GuidanceGeometry, line: GuidanceLine, offsetCorr = 0): number {
  const proj = projector(g.origin);
  const s = dot(proj.toLocal(pos), g.normal) - offsetCorr;
  return s - line.offset;
}

export type GuidanceQuality = 'ideal' | 'good' | 'correct' | 'large';

export function classifyDeviation(xte: number): GuidanceQuality {
  const a = Math.abs(xte);
  if (a <= 0.25) return 'ideal';
  if (a <= 0.5) return 'good';
  if (a <= 1.0) return 'correct';
  return 'large';
}

/** Odległość do końca aktywnej linii wzdłuż kierunku jazdy [m] (dla ostrzeżeń o nawrocie). */
export function distanceToLineEnd(pos: LL, g: GuidanceGeometry, line: GuidanceLine): number {
  if (!line.segments.length) return Infinity;
  const proj = projector(g.origin);
  const p = proj.toLocal(pos);
  const tPos = dot(p, g.dir);
  let maxEnd = -Infinity;
  for (const seg of line.segments) {
    for (const [lat, lng] of seg) {
      const t = dot(proj.toLocal({ lat, lng }), g.dir);
      if (t > maxEnd) maxEnd = t;
    }
  }
  return Math.max(0, maxEnd - tPos);
}

export interface CoverageResult {
  coveragePercent: number;
  areaCoveredHa: number;
  fieldAreaHa: number;
}

/**
 * Estymacja pokrycia pola na podstawie śladu GPS i szerokości roboczej.
 * UWAGA: to estymacja rastrowa, nie rzeczywiste pokrycie robocze.
 */
export function estimateCoverage(track: LL[], width: number, fieldGeo: [number, number][]): CoverageResult {
  const fieldAreaHa = polygonAreaHa(fieldGeo);
  if (fieldGeo.length < 3 || track.length === 0 || width <= 0) {
    return { coveragePercent: 0, areaCoveredHa: 0, fieldAreaHa };
  }
  const origin: LL = { lat: fieldGeo[0][0], lng: fieldGeo[0][1] };
  const proj = projector(origin);
  const poly = fieldGeo.map(([lat, lng]) => proj.toLocal({ lat, lng }));
  const xs = poly.map((v) => v.x);
  const ys = poly.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  let cell = Math.max(width / 2, 2);
  // ograniczenie liczby komórek dla wydajności
  while (((maxX - minX) / cell) * ((maxY - minY) / cell) > 60000) cell *= 1.5;

  const cols = Math.max(1, Math.ceil((maxX - minX) / cell));
  const rows = Math.max(1, Math.ceil((maxY - minY) / cell));
  const insideCells: boolean[] = new Array(cols * rows).fill(false);
  let insideCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = minX + (c + 0.5) * cell;
      const cy = minY + (r + 0.5) * cell;
      if (pointInPolygon({ x: cx, y: cy }, poly)) {
        insideCells[r * cols + c] = true;
        insideCount++;
      }
    }
  }
  if (insideCount === 0) return { coveragePercent: 0, areaCoveredHa: 0, fieldAreaHa };

  const covered = new Uint8Array(cols * rows);
  const rCells = Math.ceil(width / 2 / cell);
  const local = track.map((p) => proj.toLocal(p));

  const mark = (v: Vec2) => {
    const cc = Math.floor((v.x - minX) / cell);
    const rr = Math.floor((v.y - minY) / cell);
    for (let dr = -rCells; dr <= rCells; dr++) {
      for (let dc = -rCells; dc <= rCells; dc++) {
        const r2 = rr + dr;
        const c2 = cc + dc;
        if (r2 < 0 || c2 < 0 || r2 >= rows || c2 >= cols) continue;
        const idx = r2 * cols + c2;
        if (insideCells[idx]) covered[idx] = 1;
      }
    }
  };

  for (let i = 0; i < local.length; i++) {
    mark(local[i]);
    if (i > 0) {
      const p0 = local[i - 1];
      const p1 = local[i];
      const d = len(sub(p1, p0));
      const steps = Math.floor(d / (cell / 2));
      for (let s = 1; s < steps; s++) {
        mark(add(p0, scale(sub(p1, p0), s / steps)));
      }
    }
  }

  let coveredCount = 0;
  for (let i = 0; i < covered.length; i++) if (covered[i]) coveredCount++;
  const coveragePercent = Math.min(100, (coveredCount / insideCount) * 100);
  return {
    coveragePercent,
    areaCoveredHa: (coveragePercent / 100) * fieldAreaHa,
    fieldAreaHa,
  };
}

/** Liczba linii, po których faktycznie przejechano (ślad w promieniu width/2). */
export function linesWorked(track: LL[], g: GuidanceGeometry): number {
  if (g.lines.length === 0 || track.length === 0) return 0;
  const proj = projector(g.origin);
  const half = g.width / 2;
  const ss = track.map((p) => dot(proj.toLocal(p), g.normal));
  let count = 0;
  for (const line of g.lines) {
    if (ss.some((s) => Math.abs(s - line.offset) <= half)) count++;
  }
  return count;
}

/** Łączny dystans śladu [m]. */
export function trackDistance(track: LL[]): number {
  let d = 0;
  for (let i = 1; i < track.length; i++) d += distanceMeters(track[i - 1], track[i]);
  return d;
}


/** Buduje pas roboczy (quady) o szerokości `width` wzdłuż śladu — do wizualizacji pokrycia na mapie. */
export function buildSwathQuads(track: LL[], width: number, maxQuads = 1200): [number, number][][] {
  if (track.length < 2 || width <= 0) return [];
  const hw = width / 2;
  const step = Math.max(1, Math.ceil((track.length - 1) / maxQuads));
  const quads: [number, number][][] = [];
  for (let i = step; i < track.length; i += step) {
    const a = track[i - step];
    const b = track[i];
    const proj = projector(a);
    const e = proj.toLocal(b);
    const l = Math.hypot(e.x, e.y);
    if (l < 0.2) continue;
    const nx = -e.y / l;
    const ny = e.x / l;
    const aL = proj.toLL({ x: nx * hw, y: ny * hw });
    const aR = proj.toLL({ x: -nx * hw, y: -ny * hw });
    const bL = proj.toLL({ x: e.x + nx * hw, y: e.y + ny * hw });
    const bR = proj.toLL({ x: e.x - nx * hw, y: e.y - ny * hw });
    quads.push([[aL.lat, aL.lng], [bL.lat, bL.lng], [bR.lat, bR.lng], [aR.lat, aR.lng]]);
  }
  return quads;
}
