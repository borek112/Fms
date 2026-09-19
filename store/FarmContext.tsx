import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Alert, FarmData, FarmState, Field, FieldCrop, FieldWorkSession, GrainStock, Lease, Machine, ManagementZone, PersistedState, SoilSample, Task, Treatment, WarehouseItem } from '@/types';
import { buildDemoState, emptyFarmData } from '@/data/demo';

const LS_KEY = 'fms2-data-v2';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

interface Ctx {
  state: FarmState;
  loaded: boolean;
  addField: (f: Omit<Field, 'id'>) => void;
  updateField: (f: Field) => void;
  deleteField: (id: string) => void;
  setFieldCrop: (fc: FieldCrop) => void;
  addFieldCrop: (fc: Omit<FieldCrop, 'id'>) => void;
  addTreatment: (t: Omit<Treatment, 'id'>) => void;
  deleteTreatment: (id: string) => void;
  addMachine: (m: Omit<Machine, 'id' | 'serviceHistory'>) => void;
  updateMachine: (m: Machine) => void;
  deleteMachine: (id: string) => void;
  addService: (machineId: string, svc: { date: string; desc: string; cost: number }) => void;
  addWarehouseItem: (w: Omit<WarehouseItem, 'id' | 'history'>) => void;
  updateWarehouseItem: (w: WarehouseItem) => void;
  deleteWarehouseItem: (id: string) => void;
  warehouseOp: (id: string, type: 'przyjęcie' | 'rozchód' | 'korekta', qty: number, note: string) => void;
  refuel: (tankId: string, qty: number, cost: number) => void;
  fuelUse: (tankId: string, qty: number, machine: string) => void;
  grainOp: (id: string, type: 'przyjęcie' | 'sprzedaż' | 'ubytek', qty: number, price?: number) => void;
  addGrain: (g: Omit<GrainStock, 'id' | 'history'>) => void;
  addTask: (t: Omit<Task, 'id'>) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  markAlertRead: (id: string) => void;
  snoozeAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  pushAlert: (a: Omit<Alert, 'id' | 'read' | 'date'>) => void;
  addSession: (s: FieldWorkSession) => void;
  deleteSession: (id: string) => void;
  addLease: (l: Omit<Lease, 'id'>) => void;
  updateLease: (l: Lease) => void;
  deleteLease: (id: string) => void;
  addZone: (z: Omit<ManagementZone, 'id'>) => void;
  updateZone: (z: ManagementZone) => void;
  deleteZone: (id: string) => void;
  addSoilSamples: (fieldId: string, samples: Omit<SoilSample, 'id' | 'fieldId'>[]) => void;
  clearSoilSamples: (fieldId: string) => void;
  switchFarm: (id: string) => void;
  loadDemo: () => void;
  resetAll: () => void;
  clearAll: () => void;
  notify: (msg: string, kind?: 'ok' | 'err') => void;
  toast: { msg: string; kind: 'ok' | 'err' } | null;
}

const FarmCtx = createContext<Ctx>(null as unknown as Ctx);
export const useFarm = () => useContext(FarmCtx);

function toView(p: PersistedState): FarmState {
  return { farms: p.farms, activeFarmId: p.activeFarmId, ...emptyFarmData(), ...(p.data[p.activeFarmId] || {}) };
}

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedState>(buildDemoState());
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as PersistedState;
        if (p && p.data && p.farms) setPersisted(p);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(LS_KEY, JSON.stringify(persisted));
  }, [persisted, loaded]);

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // mutuje dane AKTYWNEGO gospodarstwa
  const up = useCallback((fn: (d: FarmData) => FarmData) => {
    setPersisted((p) => ({ ...p, data: { ...p.data, [p.activeFarmId]: fn(p.data[p.activeFarmId] || emptyFarmData()) } }));
  }, []);

  const state = useMemo(() => toView(persisted), [persisted]);

  const value = useMemo<Ctx>(() => ({
    state, loaded, toast, notify,

    addField: (f) => up((s) => ({ ...s, fields: [...s.fields, { ...f, id: uid() }] })),
    updateField: (f) => up((s) => ({ ...s, fields: s.fields.map((x) => (x.id === f.id ? f : x)) })),
    deleteField: (fid) => up((s) => ({
      ...s,
      fields: s.fields.filter((x) => x.id !== fid),
      fieldCrops: s.fieldCrops.filter((x) => x.fieldId !== fid),
      cropHistory: s.cropHistory.filter((x) => x.fieldId !== fid),
      treatments: s.treatments.filter((x) => x.fieldId !== fid),
      tasks: s.tasks.filter((x) => x.fieldId !== fid),
    })),
    setFieldCrop: (fc) => up((s) => ({
      ...s,
      fieldCrops: s.fieldCrops.map((x) => (x.id === fc.id ? fc : x)),
    })),
    addFieldCrop: (fc) => up((s) => ({ ...s, fieldCrops: [...s.fieldCrops, { ...fc, id: uid() }] })),

    addTreatment: (t) => up((s) => {
      let warehouse = s.warehouse;
      if (t.productId && t.quantity) {
        const item = s.warehouse.find((w) => w.id === t.productId);
        if (item) {
          warehouse = s.warehouse.map((w) => w.id === t.productId
            ? { ...w, stock: Math.max(0, w.stock - (t.quantity || 0)), history: [{ id: uid(), date: t.date, type: 'rozchód' as const, qty: t.quantity || 0, note: `Zabieg: ${t.type} — ${t.crop}` }, ...w.history] }
            : w);
        }
      }
      let grain = s.grain;
      if (t.type === 'zbiór') {
        const fc = s.fieldCrops.find((c) => c.fieldId === t.fieldId && c.cropName === t.crop);
        const field = s.fields.find((f) => f.id === t.fieldId);
        if (fc && field) {
          const yld = fc.plannedYield * field.area;
          const existing = grain.find((g) => g.crop === t.crop);
          grain = existing
            ? grain.map((g) => g.crop === t.crop ? { ...g, qty: g.qty + yld, harvestDate: t.date, history: [{ id: uid(), date: t.date, type: 'przyjęcie' as const, qty: yld }, ...g.history] } : g)
            : [...grain, { id: uid(), crop: t.crop, qty: yld, storage: 'Silo A', moisture: 14, harvestDate: t.date, currentPrice: 800, history: [{ id: uid(), date: t.date, type: 'przyjęcie' as const, qty: yld }] }];
        }
      }
      return { ...s, treatments: [{ ...t, id: uid() }, ...s.treatments], warehouse, grain };
    }),
    deleteTreatment: (tid) => up((s) => ({ ...s, treatments: s.treatments.filter((x) => x.id !== tid) })),

    addMachine: (m) => up((s) => ({ ...s, machines: [...s.machines, { ...m, id: uid(), serviceHistory: [] }] })),
    updateMachine: (m) => up((s) => ({ ...s, machines: s.machines.map((x) => (x.id === m.id ? m : x)) })),
    deleteMachine: (mid) => up((s) => ({ ...s, machines: s.machines.filter((x) => x.id !== mid) })),
    addService: (machineId, svc) => up((s) => ({
      ...s,
      machines: s.machines.map((m) => m.id === machineId ? { ...m, serviceHistory: [{ id: uid(), ...svc }, ...m.serviceHistory] } : m),
    })),

    addWarehouseItem: (w) => up((s) => ({ ...s, warehouse: [...s.warehouse, { ...w, id: uid(), history: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type: 'przyjęcie', qty: w.stock, note: 'Stan początkowy' }] }] })),
    updateWarehouseItem: (w) => up((s) => ({ ...s, warehouse: s.warehouse.map((x) => (x.id === w.id ? w : x)) })),
    deleteWarehouseItem: (wid) => up((s) => ({ ...s, warehouse: s.warehouse.filter((x) => x.id !== wid) })),
    warehouseOp: (wid, type, qty, note) => up((s) => ({
      ...s,
      warehouse: s.warehouse.map((w) => w.id === wid ? {
        ...w,
        stock: type === 'przyjęcie' ? w.stock + qty : type === 'rozchód' ? Math.max(0, w.stock - qty) : qty,
        history: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type, qty, note }, ...w.history],
      } : w),
    })),

    refuel: (tankId, qty, cost) => up((s) => ({
      ...s,
      fuelTanks: s.fuelTanks.map((t) => t.id === tankId ? {
        ...t, current: Math.min(t.capacity, t.current + qty),
        history: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type: 'tankowanie' as const, qty, cost }, ...t.history],
      } : t),
    })),
    fuelUse: (tankId, qty, machine) => up((s) => ({
      ...s,
      fuelTanks: s.fuelTanks.map((t) => t.id === tankId ? {
        ...t, current: Math.max(0, t.current - qty),
        history: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type: 'zużycie' as const, qty, machine }, ...t.history],
      } : t),
    })),

    grainOp: (gid, type, qty, price) => up((s) => ({
      ...s,
      grain: s.grain.map((g) => g.id === gid ? {
        ...g, qty: type === 'przyjęcie' ? g.qty + qty : Math.max(0, g.qty - qty),
        history: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type, qty, price }, ...g.history],
      } : g),
    })),
    addGrain: (g) => up((s) => ({ ...s, grain: [...s.grain, { ...g, id: uid(), history: [{ id: uid(), date: g.harvestDate, type: 'przyjęcie', qty: g.qty }] }] })),

    addTask: (t) => up((s) => ({ ...s, tasks: [{ ...t, id: uid() }, ...s.tasks] })),
    updateTask: (t) => up((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === t.id ? t : x)) })),
    deleteTask: (tid) => up((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== tid) })),

    markAlertRead: (aid) => up((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === aid ? { ...a, read: true } : a)) })),
    snoozeAlert: (aid) => up((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === aid ? { ...a, snoozed: true } : a)) })),
    deleteAlert: (aid) => up((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== aid) })),
    pushAlert: (a) => up((s) => ({ ...s, alerts: [{ ...a, id: uid(), read: false, date: new Date().toISOString().slice(0, 10) }, ...s.alerts] })),

    addSession: (sess) => up((s) => ({ ...s, sessions: [sess, ...(s.sessions || [])] })),
    deleteSession: (sid) => up((s) => ({ ...s, sessions: (s.sessions || []).filter((x) => x.id !== sid) })),

    addLease: (l) => up((s) => ({ ...s, leases: [{ ...l, id: uid() }, ...(s.leases || [])] })),
    updateLease: (l) => up((s) => ({ ...s, leases: (s.leases || []).map((x) => (x.id === l.id ? l : x)) })),
    deleteLease: (lid) => up((s) => ({ ...s, leases: (s.leases || []).filter((x) => x.id !== lid) })),

    addZone: (z) => up((s) => ({ ...s, zones: [{ ...z, id: uid() }, ...(s.zones || [])] })),
    updateZone: (z) => up((s) => ({ ...s, zones: (s.zones || []).map((x) => (x.id === z.id ? z : x)) })),
    deleteZone: (zid) => up((s) => ({ ...s, zones: (s.zones || []).filter((x) => x.id !== zid) })),

    addSoilSamples: (fieldId, samples) => up((s) => ({ ...s, soilSamples: [...samples.map((x) => ({ ...x, id: uid(), fieldId })), ...(s.soilSamples || [])] })),
    clearSoilSamples: (fieldId) => up((s) => ({ ...s, soilSamples: (s.soilSamples || []).filter((x) => x.fieldId !== fieldId) })),

    switchFarm: (fid) => setPersisted((p) => ({ ...p, activeFarmId: fid })),
    loadDemo: () => { setPersisted(buildDemoState()); notify('Załadowano dane demonstracyjne'); },
    resetAll: () => { setPersisted(buildDemoState()); notify('Dane zresetowane do stanu DEMO'); },
    clearAll: () => {
      setPersisted((p) => {
        const data: PersistedState['data'] = {};
        p.farms.forEach((f) => { data[f.id] = emptyFarmData(); });
        return { ...p, data };
      });
      notify('Wyczyszczono wszystkie dane');
    },
  }), [state, loaded, toast, notify, up]);

  return <FarmCtx.Provider value={value}>{children}</FarmCtx.Provider>;
}
