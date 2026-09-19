import { describe, it, expect } from 'vitest';
import { bboxOf, gridToCells, cellsToCSV, gridToGeoJSON } from './vraExport';

const field = { name: 'Test', geo: [[52.0, 19.0], [52.0, 19.02], [52.02, 19.02], [52.02, 19.0]] as [number, number][] };
const grid = [[0, 1], [2, 0]];
const doses = [120, 150, 180];

describe('VRA export', () => {
  it('bbox z obrysu pola', () => {
    const bb = bboxOf(field.geo);
    expect(bb.minLat).toBeCloseTo(52.0);
    expect(bb.maxLng).toBeCloseTo(19.02);
  });

  it('siatka -> komórki z dawką (środek pola)', () => {
    const cells = gridToCells(field, grid, doses);
    expect(cells.length).toBe(4);
    expect(cells[0].dose).toBe(120);
    expect(cells[2].dose).toBe(180);
    cells.forEach((c) => { expect(c.lat).toBeGreaterThan(52.0); expect(c.lat).toBeLessThan(52.02); });
  });

  it('CSV ma nagłówek i wiersz na komórkę', () => {
    const csv = cellsToCSV(gridToCells(field, grid, doses));
    const lines = csv.split('\n');
    expect(lines[0]).toBe('lat,lng,zone,dose_kg_ha');
    expect(lines.length).toBe(5);
  });

  it('GeoJSON to poprawny FeatureCollection z poligonami', () => {
    const gj = JSON.parse(gridToGeoJSON(field, grid, doses, 'Saletra', 'kg/ha'));
    expect(gj.type).toBe('FeatureCollection');
    expect(gj.features.length).toBe(4);
    expect(gj.features[0].geometry.type).toBe('Polygon');
    expect(gj.features[0].geometry.coordinates[0].length).toBe(5);
    expect(gj.features[0].properties.rate).toBe(120);
  });
});
