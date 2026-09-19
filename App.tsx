import { useCallback, useEffect, useMemo, useState } from 'react';
import { FarmProvider, useFarm } from '@/store/FarmContext';
import { Badge, Btn, Input, Modal, Select, useClickOutside, useDebounced } from '@/components/common';
import Dashboard from '@/sections/Dashboard';
import Fields from '@/sections/Fields';
import Crops from '@/sections/Crops';
import Calculators from '@/sections/Calculators';
import Protection from '@/sections/Protection';
import Weather from '@/sections/Weather';
import Machines from '@/sections/Machines';
import Warehouse from '@/sections/Warehouse';
import Finance from '@/sections/Finance';
import Precision from '@/sections/Precision';
import Workers from '@/sections/Workers';
import Diary from '@/sections/Diary';
import Reports from '@/sections/Reports';
import AI from '@/sections/AI';
import FieldPilot from '@/sections/FieldPilot';
import Leases from '@/sections/Leases';
import FieldProfile from '@/sections/FieldProfile';
import GnssCenter from '@/sections/GnssCenter';
import { Alerts, Settings } from '@/sections/Misc';

export interface Nav { go: (section: string, focusId?: string) => void }

const SECTIONS = [
  { id: 'dashboard', icon: '🏠', label: 'Centrum' },
  { id: 'gis', icon: '🗺️', label: 'GIS i Pola' },
  { id: 'polowa', icon: '🚜', label: 'Praca w Polu' },
  { id: 'gnss', icon: '🛰️', label: 'GNSS Center' },
  { id: 'uprawy', icon: '🌱', label: 'Uprawy i Płodozmian' },
  { id: 'ochrona', icon: '🐛', label: 'Ochrona Roślin' },
  { id: 'nawozenie', icon: '🧪', label: 'Nawożenie' },
  { id: 'pogoda', icon: '🌦️', label: 'Pogoda i Okna' },
  { id: 'maszyny', icon: '🚜', label: 'Maszyny i Flota' },
  { id: 'magazyn', icon: '📦', label: 'Magazyn' },
  { id: 'finanse', icon: '💰', label: 'Finanse' },
  { id: 'dzierzawy', icon: '📑', label: 'Dzierżawy' },
  { id: 'precyzyjne', icon: '📡', label: 'Rolnictwo Precyzyjne' },
  { id: 'profil', icon: '🌾', label: 'Cyfrowy Bliźniak Pola' },
  { id: 'pracownicy', icon: '👷', label: 'Pracownicy i Zadania' },
  { id: 'dziennik', icon: '📋', label: 'Dziennik Polowy' },
  { id: 'analizy', icon: '📊', label: 'Analizy i Raporty' },
  { id: 'ai', icon: '🤖', label: 'Agro AI' },
  { id: 'alerts', icon: '🔔', label: 'Powiadomienia' },
  { id: 'ustawienia', icon: '⚙️', label: 'Ustawienia' },
];

const MOBILE_TABS = ['dashboard', 'gis', 'dziennik', 'magazyn', 'menu'];

function Shell() {
  const { state, toast, switchFarm, notify, addField, addTask, addWarehouseItem, addMachine, addTreatment, setFieldCrop } = useFarm();
  const [section, setSection] = useState(() => location.hash.replace('#', '') || 'dashboard');
  const [focusId, setFocusId] = useState<string | undefined>();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [farmOpen, setFarmOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickForm, setQuickForm] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [qa, setQa] = useState<Record<string, string>>({});

  const debSearch = useDebounced(search, 150);
  const searchRef = useClickOutside(() => setSearchOpen(false));
  const notifRef = useClickOutside(() => setNotifOpen(false));
  const farmRef = useClickOutside(() => setFarmOpen(false));

  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const h = () => setSection(location.hash.replace('#', '') || 'dashboard');
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const go = useCallback((s: string, f?: string) => {
    setSection(s); setFocusId(f); setMobileMenu(false); setNotifOpen(false); setSearchOpen(false); setSearch('');
    location.hash = s;
    window.scrollTo({ top: 0 });
  }, []);
  const nav: Nav = useMemo(() => ({ go }), [go]);

  const results = useMemo(() => {
    if (!debSearch.trim()) return [];
    const q = debSearch.toLowerCase();
    const r: { icon: string; text: string; sub: string; go: () => void }[] = [];
    state.fields.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 4).forEach((f) => r.push({ icon: '🟩', text: f.name, sub: `pole · ${f.area} ha`, go: () => go('gis', f.id) }));
    state.machines.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 3).forEach((m) => r.push({ icon: '🚜', text: m.name, sub: `maszyna · ${m.mth} MTH`, go: () => go('maszyny') }));
    state.warehouse.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 3).forEach((w) => r.push({ icon: '📦', text: w.name, sub: `magazyn · ${w.stock} ${w.unit}`, go: () => go('magazyn') }));
    state.tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 3).forEach((t) => r.push({ icon: '✅', text: t.title, sub: `zadanie · ${t.status}`, go: () => go('pracownicy') }));
    return r;
  }, [debSearch, state, go]);

  const unread = state.alerts.filter((a) => !a.read && !a.snoozed).length;
  const activeFarm = state.farms.find((f) => f.id === state.activeFarmId);

  const quickItems = [
    { k: 'pole', icon: '🟩', label: 'Dodaj pole' },
    { k: 'uprawa', icon: '🌱', label: 'Dodaj uprawę' },
    { k: 'zabieg', icon: '💨', label: 'Dodaj zabieg' },
    { k: 'maszyna', icon: '🚜', label: 'Dodaj maszynę' },
    { k: 'produkt', icon: '📦', label: 'Dodaj produkt' },
    { k: 'koszt', icon: '💰', label: 'Dodaj koszt' },
    { k: 'zadanie', icon: '✅', label: 'Dodaj zadanie' },
    { k: 'obserwacja', icon: '👁️', label: 'Dodaj obserwację' },
  ];

  const quickSave = () => {
    const d = '2026-08-06';
    switch (quickForm) {
      case 'pole':
        if (!qa.nazwa || !qa.area) { notify('Podaj nazwę i powierzchnię', 'err'); return; }
        addField({ name: qa.nazwa, area: +qa.area, parcelNo: qa.dzialka || '—', district: 'Borek', soilType: 'Gleba płowa (IIIb)', pH: 6.2, P: 'średnia', K: 'średnia', Mg: 'średnia', geo: [[52.662, 19.05], [52.662, 19.062], [52.657, 19.062], [52.657, 19.05]] });
        notify('Pole dodane'); break;
      case 'uprawa': {
        const fc = state.fieldCrops.find((c) => c.fieldId === qa.pole && c.season === 2026);
        if (!fc || !qa.uprawa) { notify('Wybierz pole i uprawę', 'err'); return; }
        setFieldCrop({ ...fc, cropName: qa.uprawa, variety: qa.odmiana || fc.variety });
        notify('Uprawa przypisana'); break;
      }
      case 'zabieg': {
        if (!qa.pole2) { notify('Wybierz pole', 'err'); return; }
        const fc = state.fieldCrops.find((c) => c.fieldId === qa.pole2 && c.season === 2026);
        addTreatment({ date: d, type: qa.typ || 'lustracja', fieldId: qa.pole2, crop: fc?.cropName || '—', cost: +qa.koszt || 0, season: 2026, notes: qa.uwagi });
        notify('Zabieg zapisany — szczegóły uzupełnisz w Dzienniku'); break;
      }
      case 'maszyna':
        if (!qa.nazwa) { notify('Podaj nazwę', 'err'); return; }
        addMachine({ name: qa.nazwa, category: qa.kategoria || 'ciągnik', brand: qa.marka || '', model: '', year: 2024, regNo: '—', mth: 0, nextServiceMth: 500, fuel: 'ON', consumption: 0 });
        notify('Maszyna dodana'); break;
      case 'produkt':
        if (!qa.nazwa) { notify('Podaj nazwę', 'err'); return; }
        addWarehouseItem({ name: qa.nazwa, category: qa.kategoria2 || 'nawozy', producer: '', unit: 'kg', stock: +qa.stan || 0, minStock: 0, price: +qa.cena || 0, supplier: '', purchaseDate: d });
        notify('Produkt dodany'); break;
      case 'koszt': {
        if (!qa.pole3 || !qa.kwota) { notify('Wybierz pole i kwotę', 'err'); return; }
        const fc = state.fieldCrops.find((c) => c.fieldId === qa.pole3 && c.season === 2026);
        addTreatment({ date: d, type: 'koszt ogólny', fieldId: qa.pole3, crop: fc?.cropName || '—', cost: +qa.kwota, season: 2026, notes: qa.opis || 'Koszt dodany ręcznie' });
        notify('Koszt dodany do finansów pola'); break;
      }
      case 'zadanie':
        if (!qa.tytul) { notify('Podaj nazwę zadania', 'err'); return; }
        addTask({ title: qa.tytul, dueDate: qa.termin || d, priority: 'średni', status: 'nowe', kind: 'inne', fieldId: qa.pole4 || undefined });
        notify('Zadanie dodane'); break;
      case 'obserwacja': {
        if (!qa.pole5) { notify('Wybierz pole', 'err'); return; }
        const fc = state.fieldCrops.find((c) => c.fieldId === qa.pole5 && c.season === 2026);
        addTreatment({ date: d, type: 'lustracja', fieldId: qa.pole5, crop: fc?.cropName || '—', cost: 0, season: 2026, notes: qa.uwagi2 || 'Obserwacja polowa' });
        notify('Obserwacja zapisana w dzienniku'); break;
      }
    }
    setQuickForm(null); setQa({}); setQuickOpen(false);
  };

  const fieldSelect = (key: string, label: string) => (
    <Select label={label} value={qa[key] || ''} onChange={(e) => setQa({ ...qa, [key]: e.target.value })}>
      <option value="">— wybierz pole —</option>
      {state.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </Select>
  );

  return (
    <div className="min-h-screen text-slate-100 antialiased relative" style={{ background: 'radial-gradient(1200px 600px at 80% -10%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(900px 500px at -10% 10%, rgba(56,189,248,0.08), transparent 55%), #0a1120' }}>
      {/* SIDEBAR desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-[#0b1424]/90 backdrop-blur-xl border-r border-white/5 z-40">
        <div className="px-4 py-4 border-b border-white/5">
          <div className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">FMS PRECISION 3.0</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Precision Farm Management</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => go(s.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${section === s.id ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-300 border-r-2 border-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}>
              <span>{s.icon}</span><span>{s.label}</span>
              {s.id === 'alerts' && unread > 0 && <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 text-[11px] text-slate-500">
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {online ? 'Online · dane lokalne' : 'Tryb offline'}
        </div>
      </aside>

      {/* TOPBAR */}
      <header className="fixed top-0 right-0 left-0 lg:left-60 h-14 bg-[#0b1424]/80 backdrop-blur-xl border-b border-white/5 z-30 flex items-center gap-2 px-3">
        <span className="lg:hidden font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mr-1">FMS 3.0</span>
        {/* wyszukiwanie */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)}
            placeholder="🔍 Szukaj pola, maszyny, produktu…" className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-500" />
          {searchOpen && results.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {results.map((r, i) => (
                <button key={i} onClick={r.go} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors">
                  <span>{r.icon}</span>
                  <div><div className="text-sm text-slate-100">{r.text}</div><div className="text-xs text-slate-500">{r.sub}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* przełącznik gospodarstw */}
        <div className="relative" ref={farmRef}>
          <button onClick={() => setFarmOpen(!farmOpen)} className="hidden sm:flex items-center gap-1.5 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-sm hover:border-emerald-500">
            🏡 <span className="max-w-[140px] truncate">{activeFarm?.name}</span> ▾
          </button>
          {farmOpen && (
            <div className="absolute top-full mt-1 right-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {state.farms.map((f) => (
                <button key={f.id} onClick={() => { switchFarm(f.id); setFarmOpen(false); notify(`Gospodarstwo: ${f.name}`); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-800 text-sm">{f.name} {f.id === state.activeFarmId && <span className="text-emerald-400">●</span>}</button>
              ))}
            </div>
          )}
        </div>
        {/* powiadomienia */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-9 h-9 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-emerald-500">
            🔔{unread > 0 && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="absolute top-full mt-1 right-0 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1.5">
              <div className="flex justify-between items-center px-1 py-1"><span className="text-sm font-semibold">Powiadomienia</span><button onClick={() => go('alerts')} className="text-xs text-emerald-400">Zobacz wszystkie →</button></div>
              {state.alerts.filter((a) => !a.snoozed).slice(0, 6).map((a) => (
                <button key={a.id} onClick={() => go('alerts')} className={`w-full text-left rounded-lg border p-2 ${a.read ? 'border-slate-800 opacity-60' : 'border-slate-700 bg-slate-800/50'}`}>
                  <div className="text-xs text-slate-200">{a.priority === 'krytyczne' ? '🔴' : a.priority === 'ostrzeżenie' ? '🟡' : '🟢'} {a.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{a.date} · {a.category}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Badge tone="warn">TRYB DEMO</Badge>
        <button onClick={() => setQuickOpen(true)} className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold transition-colors">+</button>
      </header>

      {/* CONTENT */}
      <main className="lg:pl-60 pt-14 pb-20 lg:pb-6">
        <div className="p-3 md:p-5 max-w-[1600px] mx-auto">
          {section === 'dashboard' && <Dashboard nav={nav} />}
          {section === 'gis' && <Fields nav={nav} focusId={focusId} />}
          {section === 'uprawy' && <Crops nav={nav} />}
          {section === 'nawozenie' && <Calculators />}
          {section === 'ochrona' && <Protection />}
          {section === 'pogoda' && <Weather />}
          {section === 'maszyny' && <Machines />}
          {section === 'polowa' && <FieldPilot />}
          {section === 'magazyn' && <Warehouse />}
          {section === 'finanse' && <Finance />}
          {section === 'precyzyjne' && <Precision />}
          {section === 'dzierzawy' && <Leases />}
          {section === 'profil' && <FieldProfile nav={nav} focusId={focusId} />}
          {section === 'gnss' && <GnssCenter />}
          {section === 'pracownicy' && <Workers />}
          {section === 'dziennik' && <Diary />}
          {section === 'analizy' && <Reports />}
          {section === 'ai' && <AI />}
          {section === 'alerts' && <Alerts />}
          {section === 'ustawienia' && <Settings />}
        </div>
      </main>

      {/* MOBILE bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-40 grid grid-cols-5 h-16">
        {MOBILE_TABS.map((t) => {
          if (t === 'menu') return (
            <button key={t} onClick={() => setMobileMenu(true)} className="flex flex-col items-center justify-center gap-0.5 text-slate-400">
              <span className="text-xl">☰</span><span className="text-[10px]">Menu</span>
            </button>
          );
          const s = SECTIONS.find((x) => x.id === t)!;
          return (
            <button key={t} onClick={() => go(t)} className={`flex flex-col items-center justify-center gap-0.5 ${section === t ? 'text-emerald-400' : 'text-slate-400'}`}>
              <span className="text-xl">{s.icon}</span><span className="text-[10px]">{s.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* mobile full menu */}
      {mobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-black text-emerald-400 text-lg">FMS PRECISION 3.0 🌾</span>
            <button onClick={() => setMobileMenu(false)} className="text-slate-400 text-2xl px-2">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => go(s.id)} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${section === s.id ? 'border-emerald-500 bg-emerald-900/20 text-emerald-300' : 'border-slate-700 text-slate-200'}`}>
                <span className="text-lg">{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ADD */}
      <Modal open={quickOpen} onClose={() => { setQuickOpen(false); setQuickForm(null); }} title={quickForm ? quickItems.find((q) => q.k === quickForm)!.label : '⚡ Szybkie dodawanie'}>
        {!quickForm ? (
          <div className="grid grid-cols-2 gap-2">
            {quickItems.map((q) => (
              <button key={q.k} onClick={() => { setQuickForm(q.k); setQa({}); }}
                className="flex items-center gap-2.5 rounded-xl border border-slate-700 p-3.5 text-sm text-slate-100 hover:border-emerald-500 transition-colors">
                <span className="text-xl">{q.icon}</span>{q.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {quickForm === 'pole' && (<>
              <Input label="Nazwa pola *" value={qa.nazwa || ''} onChange={(e) => setQa({ ...qa, nazwa: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Powierzchnia (ha) *" type="number" value={qa.area || ''} onChange={(e) => setQa({ ...qa, area: e.target.value })} />
                <Input label="Nr działki" value={qa.dzialka || ''} onChange={(e) => setQa({ ...qa, dzialka: e.target.value })} />
              </div>
              <p className="text-xs text-slate-500">Pełna edycja (gleba, granice) w module GIS i Pola.</p>
            </>)}
            {quickForm === 'uprawa' && (<>
              {fieldSelect('pole', 'Pole *')}
              <Input label="Uprawa *" placeholder="np. Pszenica ozima" value={qa.uprawa || ''} onChange={(e) => setQa({ ...qa, uprawa: e.target.value })} />
              <Input label="Odmiana" value={qa.odmiana || ''} onChange={(e) => setQa({ ...qa, odmiana: e.target.value })} />
            </>)}
            {quickForm === 'zabieg' && (<>
              <Select label="Typ zabiegu" value={qa.typ || 'oprysk'} onChange={(e) => setQa({ ...qa, typ: e.target.value })}>
                {['oprysk', 'nawożenie', 'siew', 'orka', 'talerzowanie', 'wałowanie', 'zbiór', 'lustracja'].map((x) => <option key={x}>{x}</option>)}
              </Select>
              {fieldSelect('pole2', 'Pole *')}
              <Input label="Koszt (zł)" type="number" value={qa.koszt || ''} onChange={(e) => setQa({ ...qa, koszt: e.target.value })} />
              <Input label="Uwagi" value={qa.uwagi || ''} onChange={(e) => setQa({ ...qa, uwagi: e.target.value })} />
            </>)}
            {quickForm === 'maszyna' && (<>
              <Input label="Nazwa *" placeholder="np. John Deere 6120M" value={qa.nazwa || ''} onChange={(e) => setQa({ ...qa, nazwa: e.target.value })} />
              <Select label="Kategoria" value={qa.kategoria || 'ciągnik'} onChange={(e) => setQa({ ...qa, kategoria: e.target.value })}>
                {['ciągnik', 'kombajn', 'opryskiwacz', 'rozsiewacz', 'agregat', 'siewnik', 'przyczepa'].map((x) => <option key={x}>{x}</option>)}
              </Select>
              <Input label="Marka" value={qa.marka || ''} onChange={(e) => setQa({ ...qa, marka: e.target.value })} />
            </>)}
            {quickForm === 'produkt' && (<>
              <Input label="Nazwa produktu *" value={qa.nazwa || ''} onChange={(e) => setQa({ ...qa, nazwa: e.target.value })} />
              <Select label="Kategoria" value={qa.kategoria2 || 'nawozy'} onChange={(e) => setQa({ ...qa, kategoria2: e.target.value })}>
                {['nasiona', 'nawozy', 'ŚOR', 'paliwo', 'części', 'materiały'].map((x) => <option key={x}>{x}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Stan (kg)" type="number" value={qa.stan || ''} onChange={(e) => setQa({ ...qa, stan: e.target.value })} />
                <Input label="Cena (zł/kg)" type="number" value={qa.cena || ''} onChange={(e) => setQa({ ...qa, cena: e.target.value })} />
              </div>
            </>)}
            {quickForm === 'koszt' && (<>
              {fieldSelect('pole3', 'Pole *')}
              <Input label="Kwota (zł) *" type="number" value={qa.kwota || ''} onChange={(e) => setQa({ ...qa, kwota: e.target.value })} />
              <Input label="Opis kosztu" placeholder="np. usługa oprysku" value={qa.opis || ''} onChange={(e) => setQa({ ...qa, opis: e.target.value })} />
            </>)}
            {quickForm === 'zadanie' && (<>
              <Input label="Nazwa zadania *" value={qa.tytul || ''} onChange={(e) => setQa({ ...qa, tytul: e.target.value })} />
              <Input label="Termin" type="date" value={qa.termin || '2026-08-06'} onChange={(e) => setQa({ ...qa, termin: e.target.value })} />
              {fieldSelect('pole4', 'Pole (opcjonalnie)')}
            </>)}
            {quickForm === 'obserwacja' && (<>
              {fieldSelect('pole5', 'Pole *')}
              <Input label="Treść obserwacji" placeholder="np. widoczne mszyce na flagowym" value={qa.uwagi2 || ''} onChange={(e) => setQa({ ...qa, uwagi2: e.target.value })} />
            </>)}
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setQuickForm(null)}>← Wstecz</Btn>
              <Btn onClick={quickSave}>Zapisz</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-pulse-once ${toast.kind === 'ok' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'}`}>
          {toast.kind === 'ok' ? '✔' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <FarmProvider>
      <Shell />
    </FarmProvider>
  );
}
