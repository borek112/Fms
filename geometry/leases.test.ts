import { describe, it, expect } from 'vitest';
import type { Lease } from '@/types';

// Logika liczenia dzierżaw (zgodna z sekcją Leases / DecisionCenter / AI)
const annualRent = (l: Pick<Lease, 'area' | 'pricePerHa'>) => l.area * l.pricePerHa;
const outstanding = (l: Pick<Lease, 'area' | 'pricePerHa' | 'paidThisYear'>) => Math.max(0, annualRent(l) - l.paidThisYear);
const yearsBetween = (a: string, b: string) => Math.max(0, (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000 / 365.25);
const contractValue = (l: Pick<Lease, 'area' | 'pricePerHa' | 'paymentType' | 'startDate' | 'endDate'>) =>
  annualRent(l) * (l.paymentType === 'jednorazowa' ? 1 : yearsBetween(l.startDate, l.endDate));

describe('Dzierżawy — obliczenia czynszu', () => {
  const base: Lease = { id: 'l1', landlord: 'X', parcelNo: '1/1', area: 40, pricePerHa: 1000, paymentType: 'roczna', startDate: '2024-01-01', endDate: '2029-01-01', paidThisYear: 0 };

  it('czynsz roczny = powierzchnia × stawka/ha', () => {
    expect(annualRent(base)).toBe(40000);
  });

  it('pozostało do zapłaty uwzględnia wpłaty', () => {
    expect(outstanding({ ...base, paidThisYear: 15000 })).toBe(25000);
    expect(outstanding({ ...base, paidThisYear: 50000 })).toBe(0);
  });

  it('okres umowy w latach', () => {
    expect(Math.round(yearsBetween(base.startDate, base.endDate))).toBe(5);
  });

  it('wartość umowy: roczna × lata, jednorazowa = 1 rok', () => {
    expect(Math.round(contractValue(base))).toBeGreaterThanOrEqual(200000);
    expect(Math.round(contractValue(base))).toBeLessThan(201000);
    expect(contractValue({ ...base, paymentType: 'jednorazowa' })).toBe(40000);
  });

  it('suma areału i czynszu wielu umów', () => {
    const leases: Lease[] = [base, { ...base, id: 'l2', area: 15.5, pricePerHa: 800 }];
    expect(leases.reduce((a, l) => a + l.area, 0)).toBe(55.5);
    expect(leases.reduce((a, l) => a + annualRent(l), 0)).toBe(40000 + 12400);
  });
});
