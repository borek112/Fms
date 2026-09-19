import { describe, it, expect } from 'vitest';
import {
  distanceMeters,
  bearing,
  generateABLines,
  nearestLine,
  crossTrackError,
  classifyDeviation,
  estimateCoverage,
  polygonAreaHa,
  linesWorked,
  trackDistance,
  pointInPolygon,
  projector,
} from './guidance';

// Pole ~ prostokąt 200m (E) x 100m (N) wokół 52.0 / 19.0
const lat0 = 52.0;
const lng0 = 19.0;
const proj0 = projector({ lat: lat0, lng: lng0 });
const at = (x: number, y: number) => proj0.toLL({ x, y });
const field: [number, number][] = [
  [at(0, 0).lat, at(0, 0).lng],
  [at(200, 0).lat, at(200, 0).lng],
  [at(200, 100).lat, at(200, 100).lng],
  [at(0, 100).lat, at(0, 100).lng],
];

describe('distanceMeters', () => {
  it('liczy odległość w metrach', () => {
    const d = distanceMeters(at(0, 0), at(30, 40));
    expect(d).toBeCloseTo(50, 0);
  });
});

describe('bearing', () => {
  it('północ ~ 0°, wschód ~ 90°', () => {
    expect(bearing(at(0, 0), at(0, 100))).toBeCloseTo(0, 0);
    expect(bearing(at(0, 0), at(100, 0))).toBeCloseTo(90, 0);
  });
});

describe('polygonAreaHa', () => {
  it('200x100 m = 2 ha', () => {
    expect(polygonAreaHa(field)).toBeCloseTo(2, 1);
  });
});

describe('generateABLines', () => {
  const A = at(0, 50); // linia AB biegnie na wschód, w połowie wysokości
  const B = at(200, 50);
  const g = generateABLines(A, B, 20, 0, field);

  it('generuje wiele równoległych linii przyciętych do pola', () => {
    expect(g.lines.length).toBeGreaterThan(3);
    // wszystkie linie mają segmenty
    expect(g.lines.every((l) => l.segments.length > 0)).toBe(true);
  });

  it('numeruje linie L1..Ln rosnąco', () => {
    expect(g.lines[0].label).toBe('L1');
    expect(g.lines[g.lines.length - 1].label).toBe(`L${g.lines.length}`);
  });

  it('odstęp między sąsiednimi liniami = szerokość robocza', () => {
    const offs = g.lines.map((l) => l.offset).sort((a, b) => a - b);
    for (let i = 1; i < offs.length; i++) {
      expect(offs[i] - offs[i - 1]).toBeCloseTo(20, 5);
    }
  });

  it('kurs linii AB ~ 90° (wschód)', () => {
    expect(g.headingDeg).toBeCloseTo(90, 0);
  });

  it('przesunięcie linii (shift) przesuwa offsety', () => {
    const g2 = generateABLines(A, B, 20, 5, field);
    // linia najbliższa 0 powinna być przesunięta o 5
    const near0 = g2.lines.reduce((p, c) => (Math.abs(c.offset) < Math.abs(p.offset) ? c : p));
    expect(Math.abs(((near0.offset - 5) % 20))).toBeLessThan(1e-6);
  });
});

describe('cross-track error i najbliższa linia', () => {
  const A = at(0, 50);
  const B = at(200, 50);
  const g = generateABLines(A, B, 20, 0, field);

  it('na linii bazowej xte ~ 0', () => {
    const r = nearestLine(at(100, 50), g);
    expect(Math.abs(r.xte)).toBeLessThan(0.05);
  });

  it('10 m na północ od linii → xte ~ 10 (lewa strona)', () => {
    // dir = wschód (1,0), normal = perp = (0,1) = północ → +xte na północ
    const line = g.lines.find((l) => Math.abs(l.offset) < 1e-6)!;
    const xte = crossTrackError(at(100, 60), g, line);
    expect(xte).toBeCloseTo(10, 1);
  });

  it('wybiera najbliższą linię', () => {
    const r = nearestLine(at(100, 68), g); // najbliżej offsetu 60? nie ma; linie co 20 → 60
    expect(Math.abs(r.xte)).toBeLessThanOrEqual(10);
  });
});

describe('classifyDeviation', () => {
  it('progi histerezy', () => {
    expect(classifyDeviation(0.1)).toBe('ideal');
    expect(classifyDeviation(0.4)).toBe('good');
    expect(classifyDeviation(0.8)).toBe('correct');
    expect(classifyDeviation(1.5)).toBe('large');
  });
});

describe('pointInPolygon', () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it('wnętrze / zewnętrze', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, poly)).toBe(false);
  });
});

describe('trackDistance', () => {
  it('sumuje dystans śladu', () => {
    const track = [at(0, 0), at(100, 0), at(100, 50)];
    expect(trackDistance(track)).toBeCloseTo(150, 0);
  });
});

describe('estimateCoverage', () => {
  it('pusty ślad = 0% pokrycia', () => {
    const cov = estimateCoverage([], 20, field);
    expect(cov.coveragePercent).toBe(0);
    expect(cov.fieldAreaHa).toBeCloseTo(2, 1);
  });

  it('przejazd wzdłuż całego pola daje częściowe pokrycie', () => {
    const track = [];
    for (let x = 0; x <= 200; x += 5) track.push(at(x, 50));
    const cov = estimateCoverage(track, 20, field);
    expect(cov.coveragePercent).toBeGreaterThan(0);
    expect(cov.coveragePercent).toBeLessThanOrEqual(100);
  });
});

describe('linesWorked', () => {
  it('liczy linie po których przejechano', () => {
    const A = at(0, 50);
    const B = at(200, 50);
    const g = generateABLines(A, B, 20, 0, field);
    const track = [];
    for (let x = 0; x <= 200; x += 10) track.push(at(x, 50));
    expect(linesWorked(track, g)).toBeGreaterThanOrEqual(1);
  });
});
