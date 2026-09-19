export type ID = string;

export interface Farm {
  id: ID;
  name: string;
  owner: string;
  location: string;
}

export interface Field {
  id: ID;
  name: string;
  area: number; // ha
  parcelNo: string;
  district: string; // obręb
  soilType: string;
  pH: number;
  P: string; // zasobność
  K: string;
  Mg: string;
  geo: [number, number][]; // [lat, lng] — granice pola na mapie
  cropId?: ID; // aktualna uprawa (FieldCrop)
}

export interface FieldCrop {
  id: ID;
  fieldId: ID;
  cropName: string;
  variety: string;
  season: number;
  sowingDate: string;
  plannedYield: number; // t/ha
  actualYield?: number;
  bbch: number;
}

export interface CropHistory {
  id: ID;
  fieldId: ID;
  season: number;
  crop: string;
  variety: string;
  yield: number; // t/ha
  costs: number; // PLN
  revenue: number; // PLN
  notes: string;
}

export interface CropInfo {
  name: string;
  category: string;
  sowingWindow: string;
  seedRate: string; // norma siewu
  mtz: number; // g
  density: string; // obsada
  potentialYield: number; // t/ha
  productionCost: number; // PLN/ha
  fertReq: string; // wymagania nawozowe
}

export interface Treatment {
  id: ID;
  date: string;
  type: string; // oprysk, nawożenie, siew...
  fieldId: ID;
  crop: string;
  machineId?: ID;
  operator?: string;
  productId?: ID;
  productName?: string;
  dose?: number; // kg/ha lub l/ha
  quantity?: number; // kg lub l całość
  weather?: string;
  notes?: string;
  cost: number; // PLN
  season: number;
}

export interface Machine {
  id: ID;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  regNo: string;
  mth: number;
  nextServiceMth: number;
  fuel: string;
  consumption: number; // l/h lub l/ha
  operator?: string;
  serviceHistory: { id: ID; date: string; desc: string; cost: number }[];
}

export interface WarehouseItem {
  id: ID;
  name: string;
  category: string; // nasiona, nawozy, ŚOR, paliwo, części, materiały
  producer: string;
  unit: string; // kg, l, szt
  stock: number;
  minStock: number;
  price: number; // PLN/jedn.
  supplier: string;
  purchaseDate: string;
  history: { id: ID; date: string; type: 'przyjęcie' | 'rozchód' | 'korekta'; qty: number; note: string }[];
}

export interface FuelTank {
  id: ID;
  name: string;
  capacity: number;
  current: number;
  history: { id: ID; date: string; type: 'tankowanie' | 'zużycie'; qty: number; cost?: number; machine?: string }[];
}

export interface GrainStock {
  id: ID;
  crop: string;
  qty: number; // t
  storage: string;
  moisture: number; // %
  harvestDate: string;
  currentPrice: number; // PLN/t
  history: { id: ID; date: string; type: 'przyjęcie' | 'sprzedaż' | 'ubytek'; qty: number; price?: number }[];
}

export interface Worker {
  id: ID;
  name: string;
  role: string;
  phone: string;
}

export interface Task {
  id: ID;
  title: string;
  workerId?: ID;
  fieldId?: ID;
  machineId?: ID;
  dueDate: string;
  priority: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
  status: 'nowe' | 'zaplanowane' | 'w trakcie' | 'wykonane';
  kind: string; // zabieg, lustracja, nawożenie, siew, serwis, zakup
}

export interface Alert {
  id: ID;
  date: string;
  category: 'pogodowe' | 'agronomiczne' | 'magazynowe' | 'finansowe' | 'serwisowe' | 'terminowe';
  priority: 'info' | 'ostrzeżenie' | 'krytyczne';
  title: string;
  source: string;
  read: boolean;
  snoozed?: boolean;
}

export interface Threat {
  id: ID;
  name: string;
  kind: 'chwast' | 'choroba' | 'szkodnik';
  crops: string[];
  description: string;
  symptoms: string[];
  conditions: string;
  bbch: string;
  substances: string;
  mechanism: string;
  group: string; // HRAC/FRAC/IRAC
  preharvest: string;
  prevention: string;
  emoji: string;
}

export interface FarmData {
  fields: Field[];
  fieldCrops: FieldCrop[];
  cropHistory: CropHistory[];
  treatments: Treatment[];
  machines: Machine[];
  warehouse: WarehouseItem[];
  fuelTanks: FuelTank[];
  grain: GrainStock[];
  workers: Worker[];
  tasks: Task[];
  alerts: Alert[];
  sessions: FieldWorkSession[];
  leases: Lease[];
  zones: ManagementZone[];
  soilSamples: SoilSample[];
}

export interface FarmState extends FarmData {
  farms: Farm[];
  activeFarmId: ID;
}

export interface PersistedState {
  farms: Farm[];
  activeFarmId: ID;
  data: Record<ID, FarmData>;
}

export interface WeatherDay {
  date: string;
  temp: number;
  tempMin: number;
  humidity: number;
  wind: number;
  gusts: number;
  rain: number;
  icon: string;
  desc: string;
}

// ===== FMS FIELD PILOT — nawigacja pola / GPS guidance =====

export type PilotMode = 'AB' | 'A+' | 'kontur' | 'równoległe';

export interface TrackPoint {
  t: number; // timestamp (ms)
  lat: number;
  lng: number;
  speed: number; // m/s
  heading: number; // deg
  accuracy: number; // m
  activeLine: number; // indeks aktywnej linii
  xte: number; // cross-track error [m]
}

export interface FieldWorkSession {
  id: ID;
  fieldId: ID;
  fieldName: string;
  tractorId?: ID;
  machineId?: ID;
  treatmentType: string;
  crop: string;
  operator: string;
  implementWidth: number; // m
  mode: PilotMode;
  pointA: [number, number] | null;
  pointB: [number, number] | null;
  shift: number; // przesunięcie linii [m]
  offsetCorr: number; // korekta offsetu [m]
  contour: [number, number][]; // ślad konturu (tryb KONTUR)
  passes: number; // liczba okrążeń (tryb KONTUR)
  track: TrackPoint[];
  startedAt: string; // ISO
  endedAt?: string; // ISO
  distance: number; // m
  areaCovered: number; // ha
  coveragePercent: number;
  averageSpeed: number; // km/h
  averageAccuracy: number; // m
  totalLines: number;
  status: 'active' | 'paused' | 'completed';
  isDemo: boolean;
}

// ===== DZIERŻAWY — grunty dzierżawione =====

export type LeasePayment = 'roczna' | 'kwartalna' | 'jednorazowa';

export interface Lease {
  id: ID;
  landlord: string; // wydzierżawiający
  parcelNo: string; // nr działki
  fieldId?: ID; // powiązane pole z GIS (opcjonalnie)
  area: number; // ha
  pricePerHa: number; // PLN/ha/rok (dla jednorazowej — łączna stawka/ha)
  paymentType: LeasePayment;
  startDate: string; // ISO
  endDate: string; // ISO
  paidThisYear: number; // PLN zapłacone w bieżącym roku
  notes?: string;
}

// ===== ROLNICTWO PRECYZYJNE — strefy zarządzania (VRA) =====

export interface ManagementZone {
  id: ID;
  fieldId: ID;
  name: string;
  color: string;
  areaShare: number; // % powierzchni pola
  pH?: number;
  P?: string;
  K?: string;
  Mg?: string;
  ndvi?: number;
  yield?: number; // t/ha (historyczny/oczekiwany)
  recommendedDose: number; // kg/ha (dawka zalecana dla VRA)
}

// ===== PRÓBKI GLEBY — georeferencyjne pomiary do map zasobności =====

export interface SoilSample {
  id: ID;
  fieldId: ID;
  lat: number;
  lng: number;
  pH?: number;
  P?: number; // mg/kg
  K?: number;
  Mg?: number;
  date?: string;
}
