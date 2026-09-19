import { describe, it, expect } from 'vitest';
import { parseSoilCSV, idw, buildNutrientGrid, classify, average } from './soilImport';

describe('Import próbek gleby', () => {
  const csv = `lat,lng,pH,P,K,Mg
52.001,19.001,5.4,12,90,35
52.010,19.001,6.2,28,160,70
52.001,19.020,6.8,45,240,120`;

  it('parsuje CSV z nagłówkiem', () => {
    const s = parseSoilCSV(csv);
    expect(s.length).toBe(3);
    expect(s[0].pH).toBe(5.4);
    expect(s[2].K).toBe(240);
  });

  it('obsługuje separator ; i przecinek dziesiętny', () => {
    const s = parseSoilCSV('szerokosc;dlugosc;ph\n52,001;19,001;6,5');
    expect(s.length).toBe(1);
    expect(s[0].lat).toBeCloseTo(52.001);
    expect(s[0].pH).toBe(6.5);
  });

  it('odrzuca CSV bez współrzędnych', () => {
    expect(parseSoilCSV('a,b\n1,2').length).toBe(0);
  });

  it('IDW zwraca wartość próbki w jej punkcie', () => {
    const s = parseSoilCSV(csv);
    expect(idw({ lat: 52.001, lng: 19.001 }, s, 'pH')).toBeCloseTo(5.4);
  });

  it('IDW interpoluje pomiędzy próbkami (w zakresie)', () => {
    const s = parseSoilCSV(csv);
    const v = idw({ lat: 52.005, lng: 19.010 }, s, 'pH')!;
    expect(v).toBeGreaterThan(5.4);
    expect(v).toBeLessThan(6.8);
  });

  it('buduje siatkę zasobności', () => {
    const s = parseSoilCSV(csv);
    const grid = buildNutrientGrid([[52.0, 19.0], [52.0, 19.02], [52.02, 19.02], [52.02, 19.0]], s, 'K');
    expect(grid.length).toBe(10);
    expect(grid[0].length).toBe(14);
    expect(grid.flat().every((v) => v === null || (v! >= 90 && v! <= 240))).toBe(true);
  });

  it('klasyfikacja składników', () => {
    expect(classify('pH', 5.2).label).toBe('kwaśna');
    expect(classify('P', 50).label).toBe('b. wysoka');
    expect(average(parseSoilCSV(csv), 'pH')).toBeCloseTo((5.4 + 6.2 + 6.8) / 3, 5);
  });
});
