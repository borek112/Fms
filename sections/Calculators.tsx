import { useMemo, useState } from 'react';
import { useFarm } from '@/store/FarmContext';
import { Card, fmtNum, fmtPLN, Input, SectionTitle, Select } from '@/components/common';

export default function Calculators() {
  return (
    <div className="space-y-4">
      <SectionTitle title="🧮 Nawożenie i kalkulatory agrotechniczne" sub="Wszystkie kalkulatory przeliczają wyniki na żywo" />
      <div className="grid lg:grid-cols-2 gap-4">
        <SeedRateCalc />
        <NpkCalc />
        <SprayCalc />
        <FuelCalc />
        <CostCalc />
        <FertilizerPlans />
      </div>
    </div>
  );
}

function useNum(init: number): [number, (v: number) => void, { type: 'number'; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }] {
  const [v, setV] = useState(init);
  return [v, setV, { type: 'number', value: Number.isFinite(v) ? String(v) : '', onChange: (e) => setV(parseFloat(e.target.value) || 0) }];
}

function Result({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 rounded-lg bg-emerald-900/20 border border-emerald-600/40 p-3 space-y-1">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm">
          <span className="text-slate-300">{k}</span>
          <span className="font-semibold text-emerald-300">{v}</span>
        </div>
      ))}
    </div>
  );
}

function SeedRateCalc() {
  const { state } = useFarm();
  const [density, , p1] = useNum(320);
  const [mtz, , p2] = useNum(48);
  const [germ, , p3] = useNum(95);
  const [purity, , p4] = useNum(98);
  const [loss, , p5] = useNum(5);
  const [fieldId, setFieldId] = useState(state.fields[0]?.id || '');
  const [seedPrice, , p6] = useNum(3.2);
  const field = state.fields.find((f) => f.id === fieldId);

  const kgHa = germ > 0 && purity > 0 ? (density * mtz / (germ * purity)) * 100 * (1 + loss / 100) / 100 : 0;
  const total = kgHa * (field?.area || 0);
  const units = total / 500; // jednostka 500 kg
  const cost = total * seedPrice;

  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-3">🌾 Kalkulator normy siewu</h4>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Obsada (szt./m²)" {...p1} />
        <Input label="MTZ (g)" {...p2} />
        <Input label="Kiełkowanie (%)" {...p3} />
        <Input label="Czystość (%)" {...p4} />
        <Input label="Przewidywane straty (%)" {...p5} />
        <Input label="Cena nasion (zł/kg)" {...p6} />
        <div className="col-span-2">
          <Select label="Pole" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtNum(f.area)} ha)</option>)}
          </Select>
        </div>
      </div>
      <Result items={[
        ['Norma wysiewu', `${fmtNum(kgHa, 0)} kg/ha`],
        ['Na całe pole', `${fmtNum(total, 0)} kg`],
        ['Jednostki nasienne (500 kg)', `${fmtNum(units, 1)} j.n.`],
        ['Koszt nasion', fmtPLN(cost)],
      ]} />
    </Card>
  );
}

function NpkCalc() {
  const [yieldT, , p1] = useNum(8.5);
  const [nUptake, , p2] = useNum(24);
  const [pUptake, , p3] = useNum(10);
  const [kUptake, , p4] = useNum(22);
  const [soil, setSoil] = useState('średnia');
  const [prevCrop, setPrevCrop] = useState('zboża');
  const [nUtil, , p5] = useNum(65);
  const [nPrice, , p6] = useNum(5.4); // zł/kg N

  const r = useMemo(() => {
    const soilFactor = { niska: 1.2, 'średnia': 1.0, wysoka: 0.8 }[soil] ?? 1;
    const prevCredit = prevCrop === 'rośliny strączkowe' ? -30 : prevCrop === 'obornik' ? -40 : 0;
    const N = Math.max(0, (yieldT * nUptake * soilFactor + prevCredit) / (nUtil / 100));
    const P = yieldT * pUptake * soilFactor;
    const K = yieldT * kUptake * soilFactor;
    const S = N * 0.12;
    const Mg = yieldT * 4 * soilFactor;
    // przeliczenie na saletrę amonową 34%
    const saletra = N / 0.34;
    const cost = N * nPrice + P * 7 + K * 3.7;
    return { N, P, K, S, Mg, saletra, cost };
  }, [yieldT, nUptake, pUptake, kUptake, soil, prevCrop, nUtil, nPrice]);

  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-3">🧪 Kalkulator NPK + S</h4>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Planowany plon (t/ha)" {...p1} />
        <Input label="Pobranie N (kg/t)" {...p2} />
        <Input label="Pobranie P₂O₅ (kg/t)" {...p3} />
        <Input label="Pobranie K₂O (kg/t)" {...p4} />
        <Select label="Zasobność gleby" value={soil} onChange={(e) => setSoil(e.target.value)}>
          {['niska', 'średnia', 'wysoka'].map((x) => <option key={x}>{x}</option>)}
        </Select>
        <Select label="Przedplon" value={prevCrop} onChange={(e) => setPrevCrop(e.target.value)}>
          {['zboża', 'rośliny strączkowe', 'obornik', 'rzepak'].map((x) => <option key={x}>{x}</option>)}
        </Select>
        <Input label="Wykorzystanie N (%)" {...p5} />
        <Input label="Cena N (zł/kg)" {...p6} />
      </div>
      <Result items={[
        ['Dawka N', `${fmtNum(r.N, 0)} kg/ha`],
        ['Dawka P₂O₅', `${fmtNum(r.P, 0)} kg/ha`],
        ['Dawka K₂O', `${fmtNum(r.K, 0)} kg/ha`],
        ['Siarka (S)', `${fmtNum(r.S, 0)} kg/ha`],
        ['Magnez (Mg)', `${fmtNum(r.Mg, 0)} kg/ha`],
        ['= saletra amonowa 34%', `${fmtNum(r.saletra, 0)} kg/ha`],
        ['Koszt/ha (NPK)', fmtPLN(r.cost)],
      ]} />
    </Card>
  );
}

function SprayCalc() {
  const [area, , p1] = useNum(35.5);
  const [dose, , p2] = useNum(0.8);
  const [water, , p3] = useNum(200);
  const [tank, , p4] = useNum(4200);
  const haPerTank = water > 0 ? tank / water : 0;
  const tanks = haPerTank > 0 ? area / haPerTank : 0;
  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-3">💨 Kalkulator oprysku</h4>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Powierzchnia (ha)" {...p1} />
        <Input label="Dawka środka (l/ha)" {...p2} />
        <Input label="Ilość wody (l/ha)" {...p3} />
        <Input label="Pojemność opryskiwacza (l)" {...p4} />
      </div>
      <Result items={[
        ['Ilość środka', `${fmtNum(area * dose, 1)} l`],
        ['Ilość wody', `${fmtNum(area * water, 0)} l`],
        ['Liczba napełnień zbiornika', `${fmtNum(tanks, 1)}`],
        ['Środek na 1 zbiornik', `${fmtNum(tanks > 0 ? (area * dose) / tanks : 0, 1)} l`],
      ]} />
    </Card>
  );
}

function FuelCalc() {
  const [area, , p1] = useNum(42.5);
  const [lha, , p2] = useNum(18);
  const [price, , p3] = useNum(6.1);
  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-3">⛽ Kalkulator paliwa</h4>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Powierzchnia (ha)" {...p1} />
        <Input label="Zużycie (l/ha)" {...p2} />
        <Input label="Cena ON (zł/l)" {...p3} />
      </div>
      <Result items={[
        ['Zużycie paliwa', `${fmtNum(area * lha, 0)} l`],
        ['Koszt paliwa', fmtPLN(area * lha * price)],
      ]} />
    </Card>
  );
}

function CostCalc() {
  const fieldsDef: [string, number][] = [['Nasiona', 640], ['Nawozy', 1180], ['ŚOR', 940], ['Paliwo', 520], ['Praca', 380], ['Amortyzacja', 610], ['Usługi', 450]];
  const [vals, setVals] = useState<number[]>(fieldsDef.map((f) => f[1]));
  const [area, , pa] = useNum(1);
  const sum = vals.reduce((a, b) => a + b, 0);
  return (
    <Card>
      <h4 className="font-semibold text-slate-100 mb-3">💰 Kalkulator kosztu produkcji (zł/ha)</h4>
      <div className="grid grid-cols-2 gap-3">
        {fieldsDef.map(([name], i) => (
          <Input key={name} label={name} type="number" value={String(vals[i])} onChange={(e) => setVals((v) => v.map((x, xi) => (xi === i ? parseFloat(e.target.value) || 0 : x)))} />
        ))}
        <div className="col-span-2"><Input label="Powierzchnia (ha)" {...pa} /></div>
      </div>
      <Result items={[
        ['Koszt na hektar', fmtPLN(sum)],
        ['Koszt całkowity', fmtPLN(sum * area)],
      ]} />
    </Card>
  );
}

function FertilizerPlans() {
  const { state } = useFarm();
  const plans = useMemo(() => {
    return state.fieldCrops.filter((fc) => fc.season === 2026).map((fc) => {
      const f = state.fields.find((x) => x.id === fc.fieldId);
      if (!f) return null;
      const soilF = f.P === 'niska' || f.P === 'bardzo niska' ? 1.2 : f.P === 'wysoka' || f.P === 'bardzo wysoka' ? 0.8 : 1;
      const N = Math.round(fc.plannedYield * (fc.cropName === 'Rzepak ozimy' ? 50 : fc.cropName === 'Kukurydza' ? 18 : fc.cropName === 'Burak cukrowy' ? 2.5 : 22) * soilF);
      const P = Math.round(fc.plannedYield * 9 * soilF);
      const K = Math.round(fc.plannedYield * 20 * soilF);
      return { fc, f, N, P, K };
    }).filter(Boolean) as { fc: (typeof state.fieldCrops)[0]; f: (typeof state.fields)[0]; N: number; P: number; K: number }[];
  }, [state]);

  return (
    <Card className="lg:col-span-2">
      <h4 className="font-semibold text-slate-100 mb-1">📋 Plany nawożenia 2026 (auto-generowane z planowanego plonu i zasobności)</h4>
      <p className="text-xs text-slate-500 mb-3">Wartości orientacyjne — zawsze zweryfikuj z planem nawożenia i analizą gleby.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-700/60">
            <th className="py-2 pr-3">Pole / uprawa</th><th className="pr-3">N (kg/ha)</th><th className="pr-3">P₂O₅ (kg/ha)</th><th className="pr-3">K₂O (kg/ha)</th><th>Potrzeba na pole (saletra 34%)</th>
          </tr></thead>
          <tbody>
            {plans.map(({ fc, f, N, P, K }) => (
              <tr key={fc.id} className="border-b border-slate-800/60">
                <td className="py-2 pr-3 text-slate-100">{f.name} <span className="text-slate-500 text-xs">· {fc.cropName}</span></td>
                <td className="pr-3 text-slate-300">{N}</td>
                <td className="pr-3 text-slate-300">{P}</td>
                <td className="pr-3 text-slate-300">{K}</td>
                <td className="text-emerald-300">{fmtNum((N / 0.34) * f.area / 1000, 2)} t</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
