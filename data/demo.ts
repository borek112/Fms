import type { CropInfo, FarmData, Field, PersistedState, Threat, WeatherDay } from '@/types';

let n = 0;
const id = (p: string) => `${p}-${++n}`;

// konwersja siatki % na współrzędne geograficzne wokół Włocławka (okolice Borka)
const toGeo = (poly: [number, number][]): [number, number][] =>
  poly.map(([x, y]) => [52.692 - y * 0.00095, 19.028 + x * 0.00165] as [number, number]);

export const CROP_CATALOG: CropInfo[] = [
  { name: 'Pszenica ozima', category: 'zboża', sowingWindow: '15.09 – 15.10', seedRate: '160–200 kg/ha', mtz: 48, density: '300–350 szt./m²', potentialYield: 9.5, productionCost: 5200, fertReq: 'N 160–200, P₂O₅ 60–80, K₂O 90–120 kg/ha' },
  { name: 'Pszenica jara', category: 'zboża', sowingWindow: '25.03 – 20.04', seedRate: '180–220 kg/ha', mtz: 45, density: '380–420 szt./m²', potentialYield: 7.0, productionCost: 4800, fertReq: 'N 120–150, P₂O₅ 50–70, K₂O 80–100 kg/ha' },
  { name: 'Jęczmień ozimy', category: 'zboża', sowingWindow: '10.09 – 05.10', seedRate: '150–180 kg/ha', mtz: 45, density: '280–330 szt./m²', potentialYield: 8.5, productionCost: 4600, fertReq: 'N 140–170, P₂O₅ 50–70, K₂O 80–110 kg/ha' },
  { name: 'Żyto', category: 'zboża', sowingWindow: '10.09 – 05.10', seedRate: '80–110 kg/ha', mtz: 35, density: '250–300 szt./m²', potentialYield: 6.0, productionCost: 3400, fertReq: 'N 80–110, P₂O₅ 40–60, K₂O 60–90 kg/ha' },
  { name: 'Pszenżyto', category: 'zboża', sowingWindow: '15.09 – 10.10', seedRate: '170–200 kg/ha', mtz: 42, density: '280–330 szt./m²', potentialYield: 8.0, productionCost: 4400, fertReq: 'N 130–160, P₂O₅ 50–70, K₂O 80–100 kg/ha' },
  { name: 'Kukurydza', category: 'zboża', sowingWindow: '15.04 – 10.05', seedRate: '8–10 j.n./ha (80–95 tys. nasion)', mtz: 280, density: '75–90 tys./ha', potentialYield: 11.0, productionCost: 7500, fertReq: 'N 160–220, P₂O₅ 60–90, K₂O 120–160 kg/ha' },
  { name: 'Rzepak ozimy', category: 'oleiste', sowingWindow: '10.08 – 05.09', seedRate: '2,5–3,5 kg/ha', mtz: 5, density: '40–60 szt./m²', potentialYield: 4.5, productionCost: 6800, fertReq: 'N 200–240, P₂O₅ 60–80, K₂O 120–160, S 40–60 kg/ha' },
  { name: 'Burak cukrowy', category: 'okopowe', sowingWindow: '25.03 – 25.04', seedRate: '1,2 j.n./ha', mtz: 16, density: '90–110 tys./ha', potentialYield: 70.0, productionCost: 12000, fertReq: 'N 140–180, P₂O₅ 80–100, K₂O 200–250 kg/ha' },
  { name: 'Ziemniak', category: 'okopowe', sowingWindow: '10.04 – 10.05', seedRate: '2,5–3,5 t/ha sadzeniaka', mtz: 50, density: '35–45 tys./ha', potentialYield: 40.0, productionCost: 14000, fertReq: 'N 120–160, P₂O₅ 80–120, K₂O 200–280 kg/ha' },
  { name: 'Soja', category: 'strączkowe', sowingWindow: '20.04 – 15.05', seedRate: '70–100 kg/ha', mtz: 180, density: '45–60 szt./m²', potentialYield: 3.5, productionCost: 4200, fertReq: 'N 0–30, P₂O₅ 60–80, K₂O 100–140 kg/ha' },
  { name: 'Groch', category: 'strączkowe', sowingWindow: '20.03 – 15.04', seedRate: '220–280 kg/ha', mtz: 220, density: '90–110 szt./m²', potentialYield: 4.0, productionCost: 3200, fertReq: 'N 0–20, P₂O₅ 50–70, K₂O 80–110 kg/ha' },
  { name: 'Łubin', category: 'strączkowe', sowingWindow: '25.03 – 20.04', seedRate: '140–180 kg/ha', mtz: 160, density: '70–90 szt./m²', potentialYield: 3.2, productionCost: 2800, fertReq: 'N 0–20, P₂O₅ 40–60, K₂O 80–100 kg/ha' },
  { name: 'Lucerna', category: 'pastewne', sowingWindow: '10.04 – 10.05 lub 01–20.08', seedRate: '15–20 kg/ha', mtz: 2, density: '300–400 szt./m²', potentialYield: 12.0, productionCost: 3000, fertReq: 'N 0, P₂O₅ 60–90, K₂O 180–250 kg/ha (rocznie)' },
  { name: 'Pietruszka', category: 'warzywa', sowingWindow: '01.03 – 30.04', seedRate: '6–10 kg/ha', mtz: 1.6, density: '40–60 szt./m²', potentialYield: 45.0, productionCost: 18000, fertReq: 'N 120–160, P₂O₅ 80–100, K₂O 180–220 kg/ha' },
  { name: 'Marchew', category: 'warzywa', sowingWindow: '25.03 – 15.05', seedRate: '3–5 kg/ha', mtz: 1.4, density: '80–120 szt./m²', potentialYield: 55.0, productionCost: 16000, fertReq: 'N 100–140, P₂O₅ 60–90, K₂O 160–220 kg/ha' },
  { name: 'Cebula', category: 'warzywa', sowingWindow: '20.03 – 30.04', seedRate: '4–7 kg/ha', mtz: 4, density: '60–90 szt./m²', potentialYield: 40.0, productionCost: 15000, fertReq: 'N 100–130, P₂O₅ 60–80, K₂O 140–180 kg/ha' },
  { name: 'Owies', category: 'zboża', sowingWindow: '20.03 – 15.04', seedRate: '150–180 kg/ha', mtz: 34, density: '450–550 szt./m²', potentialYield: 6.5, productionCost: 3200, fertReq: 'N 60–90, P₂O₅ 40–60, K₂O 70–90 kg/ha' },
  { name: 'Gryka', category: 'zboża', sowingWindow: '10.05 – 05.06', seedRate: '60–90 kg/ha', mtz: 25, density: '200–300 szt./m²', potentialYield: 2.5, productionCost: 2600, fertReq: 'N 30–50, P₂O₅ 40–60, K₂O 60–80 kg/ha' },
  { name: 'Bobik', category: 'strączkowe', sowingWindow: '20.03 – 15.04', seedRate: '200–260 kg/ha', mtz: 450, density: '40–55 szt./m²', potentialYield: 4.5, productionCost: 3400, fertReq: 'N 0–20, P₂O₅ 60–80, K₂O 100–140 kg/ha' },
  { name: 'Słonecznik', category: 'oleiste', sowingWindow: '15.04 – 10.05', seedRate: '4–6 kg/ha', mtz: 60, density: '60–70 tys./ha', potentialYield: 3.2, productionCost: 4200, fertReq: 'N 80–120, P₂O₅ 60–80, K₂O 140–180 kg/ha' },
  { name: 'Rzepak jary', category: 'oleiste', sowingWindow: '25.03 – 20.04', seedRate: '6–8 kg/ha', mtz: 4, density: '80–120 szt./m²', potentialYield: 2.8, productionCost: 4600, fertReq: 'N 120–150, P₂O₅ 50–70, K₂O 90–120, S 30–40 kg/ha' },
  { name: 'Kapusta', category: 'warzywa', sowingWindow: '15.04 – 30.05 (rozsada)', seedRate: '25–35 tys. rozsady/ha', mtz: 4, density: '25–40 tys./ha', potentialYield: 60.0, productionCost: 19000, fertReq: 'N 180–240, P₂O₅ 80–120, K₂O 250–320 kg/ha' },
  { name: 'Ziemniak skrobiowy', category: 'okopowe', sowingWindow: '10.04 – 05.05', seedRate: '2,5–3,0 t/ha sadzeniaka', mtz: 55, density: '40–50 tys./ha', potentialYield: 45.0, productionCost: 13500, fertReq: 'N 100–140, P₂O₅ 80–110, K₂O 220–300 kg/ha' },
  { name: 'Dynia', category: 'warzywa', sowingWindow: '10.05 – 05.06', seedRate: '3–5 kg/ha', mtz: 250, density: '8–12 tys./ha', potentialYield: 35.0, productionCost: 9000, fertReq: 'N 100–140, P₂O₅ 60–90, K₂O 160–220 kg/ha' },
];

export const THREATS: Threat[] = [
  { id: 't1', name: 'Chwastnica jednostronna', kind: 'chwast', crops: ['Rzepak ozimy', 'Pszenica ozima', 'Burak cukrowy'], description: 'Chwast dwuliścienny o szarozielonych liściach, silnie konkurencyjny w rzepaku.', symptoms: ['zahamowanie wzrostu', 'zagęszczenie łanu chwastami'], conditions: 'Gleby lekkie i średnie, umiarkowana wilgotność.', bbch: 'BBCH 10–19', substances: 'metazachlor, dimetachlor, chinmerak', mechanism: 'Inhibitor syntezy kwasów tłuszczowych / mimika auksyn', group: 'HRAC K3 / O', preharvest: 'wg etykiety (do BBCH 19)', prevention: 'Płodozmian, podorywka, zwarte zasiewy.', emoji: '🌿' },
  { id: 't2', name: 'Owocnica żółta', kind: 'chwast', crops: ['Pszenica ozima', 'Jęczmień ozimy', 'Pszenżyto'], description: 'Dwuliścienny chwast jesienny, typowy dla monokultury zbożowej.', symptoms: ['fioletowo-rdżawe zabarwienie chwastu', 'konkurencja o azot'], conditions: 'Gleby zasadowe, łany ozime.', bbch: 'BBCH 11–29', substances: 'jodosulfuron, florasulam, diflufenikan', mechanism: 'Inhibitor ALS / syntezy karotenoidów', group: 'HRAC B / F1', preharvest: 'nie dotyczy (aplikacja jesienna)', prevention: 'Rotacja z uprawami jarymi, głęboka orka.', emoji: '🌾' },
  { id: 't3', name: 'Perz właściwy', kind: 'chwast', crops: ['Kukurydza', 'Burak cukrowy', 'Ziemniak'], description: 'Chwast rozłogowy trudny do zwalczania, odnawia się z kłączy.', symptoms: ['pasma perzu w łanie', 'zahamowanie wzrostu'], conditions: 'Gleby lżejsze, uprawy okopowe.', bbch: 'BBCH 12–39', substances: 'glifosat (poza łanem), niweczne odchwaszczanie', mechanism: 'Inhibitor EPSPS', group: 'HRAC G', preharvest: 'wg etykiety', prevention: 'Przerywanie kłączy broną, płodozmian.', emoji: '🌱' },
  { id: 't4', name: 'Mączniak prawdziwy zbóż', kind: 'choroba', crops: ['Pszenica ozima', 'Jęczmień ozimy', 'Pszenżyto'], description: 'Grzyb tworzący biały nalot na liściach, osłabia asymilację.', symptoms: ['biały nalot na liściach', 'żółknięcie liści'], conditions: 'Wilgotność 70–80%, temp. 15–22°C, zwarte łany, przenawożenie azotem.', bbch: 'BBCH 25–69', substances: 'protiokonazol, boskalid, fenpropimorf', mechanism: 'Inhibitory DMI / SDHI / morfoliny', group: 'FRAC 3 / 7 / 5', preharvest: 'zwykle 35 dni', prevention: 'Odmiany odporniejsze, umiarkowane dawki N.', emoji: '🦠' },
  { id: 't5', name: 'Septorioza plew i liści', kind: 'choroba', crops: ['Pszenica ozima'], description: 'Powoduje plamy z piknidiami, znaczne spadki plonu.', symptoms: ['brązowe plamy z czarnymi kropkami', 'zasychanie liści od dołu'], conditions: 'Długotrwałe zwilżenie liści >6 h, temp. 15–20°C.', bbch: 'BBCH 31–71', substances: 'protiokonazol + prokloraz, fluksoaproksad', mechanism: 'DMI / SDHI', group: 'FRAC 3 / 7', preharvest: 'zwykle 35 dni', prevention: 'Płodozmian, przerwa po pszenicy 2 lata.', emoji: '🍂' },
  { id: 't6', name: 'Fuzarioza kłosów', kind: 'choroba', crops: ['Pszenica ozima', 'Kukurydza', 'Jęczmień ozimy'], description: 'Grzyby Fusarium produkują mikotoksyny (DON) w ziarnie.', symptoms: ['rżawe zabarwienie kłosków', 'płowiejące ziarno'], conditions: 'Deszcz i temp. 20–25°C w okresie kwitnienia.', bbch: 'BBCH 61–69', substances: 'protiokonazol, tebukonazol', mechanism: 'DMI', group: 'FRAC 3', preharvest: 'nie dotyczy (do BBCH 69)', prevention: 'Następstwo po strączkowych, usuwanie resztek.', emoji: '🌾' },
  { id: 't7', name: 'Zgnilizna twardzikowa', kind: 'choroba', crops: ['Rzepak ozimy', 'Soja', 'Groch'], description: 'Sclerotinia sclerotiorum — biała zgnilizna łodyg.', symptoms: ['biały grzybniowy nalot na łodydze', 'twardziki w łodydze'], conditions: 'Wilgotna pogoda podczas kwitnienia, zwarte łany.', bbch: 'BBCH 60–65', substances: 'protiokonazol, dimoksystrobina', mechanism: 'DMI / QoI', group: 'FRAC 3 / 11', preharvest: 'wg etykiety', prevention: 'Rzadkie siewy, odmiany tolerancyjne.', emoji: '🥀' },
  { id: 't8', name: 'Mszyca zbożowa', kind: 'szkodnik', crops: ['Pszenica ozima', 'Jęczmień ozimy', 'Kukurydza'], description: 'Wysysa soki, przenosi wirusy żółtej mozaiki jęczmienia.', symptoms: ['kolonie na liściach i kłosach', 'rosy i miodna spadź', 'żółknięcie liści'], conditions: 'Ciepła, sucha wiosna; próg: 5 szt./kłos.', bbch: 'BBCH 30–75', substances: 'acetamipryd, piryproxyfen, oleje parafinowe', mechanism: 'Neonikotynoidy / analogi hormonów', group: 'IRAC 4A / 7C', preharvest: 'zwykle 14–21 dni', prevention: 'Ochrona bochenkowatych, wczesny siew.', emoji: '🐛' },
  { id: 't9', name: 'Pochwarka rzepakowa', kind: 'szkodnik', crops: ['Rzepak ozimy'], description: 'Larwy żerują w pąkach i strąkach, znaczne straty.', symptoms: ['dziury w strąkach', 'zaschnięte pąki'], conditions: 'Próg: 2–3 szt./roślinę w fazie pąków.', bbch: 'BBCH 51–65', substances: 'acetamipryd, lambda-cyhalotryna', mechanism: 'Neonikotynoidy / piretroidy', group: 'IRAC 4A / 3A', preharvest: 'wg etykiety', prevention: 'Rozproszony termin siewu, odmiany wczesne.', emoji: '🪲' },
  { id: 't10', name: 'Zaraza ziemniaka', kind: 'choroba', crops: ['Ziemniak'], description: 'Phytophthora infestans — najgroźniejsza choroba ziemniaka.', symptoms: ['ciemne plamy na liściach', 'biały nalot spodem liścia', 'zgnilizna bulw'], conditions: 'Wilgotność >90%, temp. 10–25°C, opady.', bbch: 'BBCH 30–89', substances: 'cyksofamid, mandipropamid, chlorowodorek dimetomorfu', mechanism: 'CAA / inhibitory lokalizacji celulozowej', group: 'FRAC 40 / 21', preharvest: 'zwykle 7–14 dni', prevention: 'Atestowany materiał, redlicowanie, niszczenie naci.', emoji: '🥔' },
  { id: 't11', name: 'Omacnica prosowianka', kind: 'szkodnik', crops: ['Kukurydza'], description: 'Gąsienice drążą łodygi i kolby.', symptoms: ['dziury w łodydze', 'łamanie łodyg', 'uszkodzenia kolb'], conditions: 'Ciepłe lato, 1–2 pokolenia rocznie.', bbch: 'BBCH 30–69', substances: 'chlorantraniliprol, metody biologiczne (Trichogramma)', mechanism: 'Diamidy rjnodynowe', group: 'IRAC 28', preharvest: 'wg etykiety', prevention: 'Szybkie zaoranie resztek, pułapki feromonowe.', emoji: '🐛' },
  { id: 't12', name: 'Śmietka cebulowa', kind: 'szkodnik', crops: ['Cebula'], description: 'Larwy żerują w liściach cebuli powodując ich więdnięcie.', symptoms: ['żółte smugi na liściach', 'łamanie i więdnięcie pędów'], conditions: 'Ciepła, wilgotna wiosna.', bbch: 'BBCH 12–49', substances: 'metody mechaniczne, siatki, dopuszczone insektycydy wg rejestru', mechanism: 'różny wg substancji', group: 'wg etykiety', preharvest: 'wg etykiety', prevention: 'Usuwanie resztek, odległość od upraw zeszłorocznych.', emoji: '🧅' },
];

export const WEATHER_FORECAST: WeatherDay[] = [
  { date: '2026-08-06', temp: 24, tempMin: 14, humidity: 58, wind: 2.1, gusts: 4.5, rain: 0, icon: '☀️', desc: 'Słonecznie' },
  { date: '2026-08-07', temp: 26, tempMin: 15, humidity: 52, wind: 3.4, gusts: 6.8, rain: 0, icon: '🌤️', desc: 'Słonecznie, przelotne zachmurzenie' },
  { date: '2026-08-08', temp: 23, tempMin: 14, humidity: 71, wind: 5.2, gusts: 9.0, rain: 4.2, icon: '🌦️', desc: 'Przelotne opady' },
  { date: '2026-08-09', temp: 20, tempMin: 12, humidity: 82, wind: 6.1, gusts: 11.2, rain: 12.6, icon: '🌧️', desc: 'Deszczowo' },
  { date: '2026-08-10', temp: 21, tempMin: 12, humidity: 76, wind: 4.0, gusts: 7.5, rain: 2.1, icon: '⛅', desc: 'Pochmurno, przejaśnienia' },
  { date: '2026-08-11', temp: 25, tempMin: 14, humidity: 60, wind: 2.6, gusts: 5.0, rain: 0, icon: '☀️', desc: 'Słonecznie' },
  { date: '2026-08-12', temp: 27, tempMin: 16, humidity: 55, wind: 3.0, gusts: 5.8, rain: 0, icon: '☀️', desc: 'Upalnie' },
];

export function buildDemoState(): PersistedState {
  n = 0;
  const farm1 = { id: id('farm'), name: 'Gospodarstwo Boorek', owner: 'Jan Boorek', location: 'Borek, gm. Włocławek, woj. kujawsko-pomorskie' };
  const farm2 = { id: id('farm'), name: 'Moje Gospodarstwo', owner: 'Ty', location: '— uzupełnij w ustawieniach —' };

  const fields: Field[] = [
    { id: id('fld'), name: 'Pole Północne', area: 42.5, parcelNo: '112/3', district: 'Borek', soilType: 'Gleba próchnicza (IIIa)', pH: 6.4, P: 'wysoka', K: 'średnia', Mg: 'średnia', geo: toGeo([[6, 6], [40, 4], [44, 22], [8, 24]] as [number, number][]) },
    { id: id('fld'), name: 'Pole Południowe', area: 38.0, parcelNo: '118/1', district: 'Borek', soilType: 'Gleba płowa (IIIb)', pH: 6.1, P: 'średnia', K: 'średnia', Mg: 'niska', geo: toGeo([[8, 30], [42, 28], [46, 48], [10, 50]] as [number, number][]) },
    { id: id('fld'), name: 'Łąka', area: 18.5, parcelNo: '121/2', district: 'Borek', soilType: 'Mursz niski', pH: 5.8, P: 'średnia', K: 'wysoka', Mg: 'średnia', geo: toGeo([[10, 56], [30, 54], [32, 72], [12, 74]] as [number, number][]) },
    { id: id('fld'), name: 'Za Lasem', area: 31.0, parcelNo: '205/1', district: 'Smólnik', soilType: 'Gleba brunatna (IVa)', pH: 5.6, P: 'niska', K: 'niska', Mg: 'niska', geo: toGeo([[36, 56], [58, 54], [60, 74], [38, 76]] as [number, number][]) },
    { id: id('fld'), name: 'Pod Górką', area: 27.5, parcelNo: '208/4', district: 'Smólnik', soilType: 'Gleba płowa (IIIb)', pH: 6.2, P: 'średnia', K: 'średnia', Mg: 'średnia', geo: toGeo([[52, 6], [78, 4], [80, 20], [54, 22]] as [number, number][]) },
    { id: id('fld'), name: 'Długi Klin', area: 24.0, parcelNo: '130/2', district: 'Borek', soilType: 'Czarna ziemia (II)', pH: 6.8, P: 'bardzo wysoka', K: 'wysoka', Mg: 'wysoka', geo: toGeo([[50, 28], [76, 26], [78, 44], [52, 46]] as [number, number][]) },
    { id: id('fld'), name: 'Nowe Pole', area: 35.5, parcelNo: '131/5', district: 'Borek', soilType: 'Gleba próchnicza (IIIa)', pH: 6.3, P: 'wysoka', K: 'średnia', Mg: 'średnia', geo: toGeo([[86, 6], [96, 4], [97, 46], [86, 46]] as [number, number][]) },
    { id: id('fld'), name: 'Przy Stawie', area: 22.0, parcelNo: '140/1', district: 'Borek', soilType: 'Gleba madowa (IIIa)', pH: 6.0, P: 'średnia', K: 'wysoka', Mg: 'wysoka', geo: toGeo([[64, 56], [82, 54], [84, 74], [66, 76]] as [number, number][]) },
    { id: id('fld'), name: 'Warzywniak', area: 12.5, parcelNo: '145/2', district: 'Borek', soilType: 'Czarna ziemia (II)', pH: 6.5, P: 'wysoka', K: 'wysoka', Mg: 'wysoka', geo: toGeo([[12, 80], [30, 78], [32, 94], [14, 96]] as [number, number][]) },
    { id: id('fld'), name: 'Pod Wiatrakiem', area: 44.0, parcelNo: '210/1', district: 'Smólnik', soilType: 'Gleba brunatna (IVa)', pH: 5.9, P: 'niska', K: 'średnia', Mg: 'niska', geo: toGeo([[38, 80], [58, 78], [60, 96], [40, 97]] as [number, number][]) },
    { id: id('fld'), name: 'Grunty Wschodnie', area: 28.5, parcelNo: '150/3', district: 'Modlin', soilType: 'Gleba płowa (IIIb)', pH: 6.2, P: 'średnia', K: 'średnia', Mg: 'średnia', geo: toGeo([[64, 80], [82, 78], [84, 94], [66, 96]] as [number, number][]) },
    { id: id('fld'), name: 'Sadawa', area: 26.0, parcelNo: '155/1', district: 'Modlin', soilType: 'Gleba próchnicza (IIIa)', pH: 6.6, P: 'wysoka', K: 'wysoka', Mg: 'średnia', geo: toGeo([[88, 52], [97, 50], [98, 74], [88, 76]] as [number, number][]) },
  ];

  const cropsNow = ['Pszenica ozima', 'Rzepak ozimy', 'Kukurydza', 'Burak cukrowy', 'Jęczmień ozimy', 'Soja', 'Marchew', 'Lucerna', 'Pszenżyto', 'Ziemniak', 'Pietruszka', 'Żyto'];
  const varieties: Record<string, string> = { 'Pszenica ozima': 'Atletico', 'Rzepak ozimy': 'Avatar', 'Kukurydza': 'P8200', 'Burak cukrowy': 'Garanta', 'Jęczmień ozimy': 'KWS Orbit', 'Soja': 'Abelina', 'Marchew': 'Koralina', 'Lucerna': 'Legend', 'Pszenżyto': 'Borano', 'Ziemniak': 'Vineta', 'Pietruszka': 'Lenka', 'Żyto': 'Picasso' };
  const planned: Record<string, number> = { 'Pszenica ozima': 8.5, 'Rzepak ozimy': 4.2, 'Kukurydza': 10.5, 'Burak cukrowy': 68, 'Jęczmień ozimy': 7.8, 'Soja': 3.2, 'Marchew': 52, 'Lucerna': 11, 'Pszenżyto': 7.6, 'Ziemniak': 38, 'Pietruszka': 42, 'Żyto': 5.6 };

  const fieldCrops = fields.map((f, i) => ({
    id: id('fc'), fieldId: f.id, cropName: cropsNow[i], variety: varieties[cropsNow[i]],
    season: 2026, sowingDate: i % 2 === 0 ? '2025-09-28' : '2026-04-10',
    plannedYield: planned[cropsNow[i]], bbch: 61,
  }));
  fields.forEach((f, i) => { f.cropId = fieldCrops[i].id; });

  // historia: sezon 2024 i 2025 dla każdego pola
  const prevCrops = ['Jęczmień ozimy', 'Pszenica ozima', 'Rzepak ozimy', 'Pszenica ozima', 'Groch', 'Pszenżyto', 'Żyto', 'Pszenica ozima', 'Burak cukrowy', 'Żyto', 'Cebula', 'Pszenica ozima'];
  const prevCrops2024 = ['Rzepak ozimy', 'Żyto', 'Pszenica ozima', 'Groch', 'Pszenica ozima', 'Lucerna', 'Pszenżyto', 'Jęczmień ozimy', 'Marchew', 'Pszenica ozima', 'Pietruszka', 'Groch'];
  const cropHistory = fields.flatMap((f, i) => ([
    { id: id('ch'), fieldId: f.id, season: 2025, crop: prevCrops[i], variety: 'odm. standard', yield: Math.round((4 + (i * 37 % 40) / 10) * 10) / 10, costs: Math.round(f.area * 4200), revenue: Math.round(f.area * 5600), notes: 'Sezon korzystny, plony powyżej średniej.' },
    { id: id('ch'), fieldId: f.id, season: 2024, crop: prevCrops2024[i], variety: 'odm. standard', yield: Math.round((3.5 + (i * 29 % 35) / 10) * 10) / 10, costs: Math.round(f.area * 3900), revenue: Math.round(f.area * 4900), notes: 'Susza w czerwcu obniżyła plonowanie.' },
  ]));

  const warehouse = [
    { name: 'Saletra amonowa 34%', category: 'nawozy', unit: 'kg', stock: 8500, minStock: 5000, price: 1.85, producer: 'Grupa Azoty', supplier: 'AgroChem Włocławek' },
    { name: 'Polifoska 6 (6-20-30)', category: 'nawozy', unit: 'kg', stock: 3200, minStock: 2000, price: 3.1, producer: 'Grupa Azoty', supplier: 'AgroChem Włocławek' },
    { name: 'Sól potasowa 60%', category: 'nawozy', unit: 'kg', stock: 1800, minStock: 1500, price: 2.2, producer: 'K+S', supplier: 'AgroChem Włocławek' },
    { name: 'Saletrzak 27%', category: 'nawozy', unit: 'kg', stock: 4000, minStock: 3000, price: 1.7, producer: 'Anwil', supplier: 'AgroChem Włocławek' },
    { name: 'RSM 32%', category: 'nawozy', unit: 'l', stock: 6000, minStock: 4000, price: 1.5, producer: 'Grupa Azoty', supplier: 'AgroChem Włocławek' },
    { name: 'Nasiona pszenicy Atletico (kwalifikat)', category: 'nasiona', unit: 'kg', stock: 4200, minStock: 3000, price: 3.2, producer: 'HR Smolice', supplier: 'Rolnas Skopanie' },
    { name: 'Nasiona rzepaku Avatar', category: 'nasiona', unit: 'j.n.', stock: 14, minStock: 8, price: 1450, producer: 'DSV', supplier: 'Rolmasz Toruń' },
    { name: 'Nasiona kukurydzy P8200', category: 'nasiona', unit: 'j.n.', stock: 6, minStock: 4, price: 780, producer: 'Corteva', supplier: 'Rolmasz Toruń' },
    { name: 'Herbicyd Command 480 SC', category: 'ŚOR', unit: 'l', stock: 45, minStock: 20, price: 210, producer: 'FMC', supplier: 'AgroChem Włocławek' },
    { name: 'Fungicyd Proline 250 EC', category: 'ŚOR', unit: 'l', stock: 28, minStock: 15, price: 480, producer: 'Bayer', supplier: 'AgroChem Włocławek' },
    { name: 'Fungicyd Revystar XE', category: 'ŚOR', unit: 'l', stock: 12, minStock: 10, price: 620, producer: 'BASF', supplier: 'AgroChem Włocławek' },
    { name: 'Insektycyd Mospilan 20 SP', category: 'ŚOR', unit: 'kg', stock: 4, minStock: 2, price: 540, producer: 'Nippon Soda', supplier: 'AgroChem Włocławek' },
    { name: 'Adiuwant Atpolan Bio 80 EC', category: 'ŚOR', unit: 'l', stock: 18, minStock: 10, price: 85, producer: 'ATRPOL', supplier: 'AgroChem Włocławek' },
    { name: 'Olej napędowy', category: 'paliwo', unit: 'l', stock: 2400, minStock: 1500, price: 6.1, producer: 'Orlen', supplier: 'Stacja Paliw Borek' },
    { name: 'Filtr oleju (MF 7715)', category: 'części', unit: 'szt', stock: 3, minStock: 2, price: 145, producer: 'MF Genuine', supplier: 'Serwis Rolmasz' },
    { name: 'Filtr paliwa (JD 6195R)', category: 'części', unit: 'szt', stock: 1, minStock: 2, price: 210, producer: 'John Deere', supplier: 'JD Włocławek' },
    { name: 'Noże do kombajnu', category: 'części', unit: 'szt', stock: 2, minStock: 1, price: 890, producer: 'Claas', supplier: 'Claas Łowicz' },
    { name: 'Sznurek do prasy', category: 'materiały', unit: 'szt', stock: 24, minStock: 10, price: 65, producer: 'Cordex', supplier: 'Rolnas Skopanie' },
    { name: 'Folia do bel (750 mm)', category: 'materiały', unit: 'szt', stock: 8, minStock: 6, price: 320, producer: 'Silawrap', supplier: 'Rolnas Skopanie' },
    { name: 'Wapno nawozowe granulowane', category: 'nawozy', unit: 'kg', stock: 0, minStock: 5000, price: 0.55, producer: 'Kujawit', supplier: 'Kujawit Włocławek' },
  ].map((w) => ({ id: id('wh'), ...w, purchaseDate: '2026-03-15', history: [{ id: id('whh'), date: '2026-03-15', type: 'przyjęcie' as const, qty: Math.max(w.stock, 1), note: 'Dostawa wiosenna' }] }));

  const machines = [
    { name: 'John Deere 6195R', category: 'ciągnik', brand: 'John Deere', model: '6195R', year: 2020, regNo: 'CWL 41215', mth: 3842, nextServiceMth: 3900, fuel: 'ON', consumption: 16.5, operator: 'Piotr Kowal' },
    { name: 'Massey Ferguson 7715', category: 'ciągnik', brand: 'Massey Ferguson', model: '7715', year: 2018, regNo: 'CWL 22104', mth: 5210, nextServiceMth: 5250, fuel: 'ON', consumption: 14.0, operator: 'Marek Lis' },
    { name: 'Zetor Forterra 140', category: 'ciągnik', brand: 'Zetor', model: 'Forterra 140', year: 2015, regNo: 'CWL 09012', mth: 7450, nextServiceMth: 7500, fuel: 'ON', consumption: 12.0, operator: 'Piotr Kowal' },
    { name: 'Claas Lexion 670', category: 'kombajn', brand: 'Claas', model: 'Lexion 670', year: 2019, regNo: 'CWL 77410', mth: 1180, nextServiceMth: 1200, fuel: 'ON', consumption: 55.0, operator: 'Jan Boorek' },
    { name: 'Amazone UX 4200', category: 'opryskiwacz', brand: 'Amazone', model: 'UX 4200', year: 2021, regNo: 'CWL 55201', mth: 640, nextServiceMth: 650, fuel: '—', consumption: 0, operator: 'Piotr Kowal' },
    { name: 'Amazone ZA-TS 3200', category: 'rozsiewacz', brand: 'Amazone', model: 'ZA-TS 3200', year: 2020, regNo: 'CWL 55211', mth: 520, nextServiceMth: 600, fuel: '—', consumption: 0, operator: 'Marek Lis' },
    { name: 'Horsch Tiger 4 MT', category: 'agregat', brand: 'Horsch', model: 'Tiger 4 MT', year: 2022, regNo: 'CWL 88100', mth: 310, nextServiceMth: 350, fuel: '—', consumption: 0, operator: 'Jan Boorek' },
    { name: 'Horsch Pronto 6 DC', category: 'siewnik', brand: 'Horsch', model: 'Pronto 6 DC', year: 2021, regNo: 'CWL 88120', mth: 450, nextServiceMth: 500, fuel: '—', consumption: 0, operator: 'Piotr Kowal' },
    { name: 'Metal-Fach T730/2', category: 'przyczepa', brand: 'Metal-Fach', model: 'T730/2', year: 2019, regNo: 'CWL 30211', mth: 2100, nextServiceMth: 2200, fuel: '—', consumption: 0, operator: 'Marek Lis' },
    { name: 'Krone Big Pack 1290', category: 'prasa', brand: 'Krone', model: 'Big Pack 1290', year: 2017, regNo: 'CWL 66114', mth: 1750, nextServiceMth: 1800, fuel: '—', consumption: 0, operator: 'Jan Boorek' },
  ].map((m) => ({ id: id('mch'), ...m, serviceHistory: [{ id: id('sv'), date: '2026-02-10', desc: 'Wymiana oleju i filtrów, przegląd okresowy', cost: 1800 }] }));

  const workers = [
    { id: id('wrk'), name: 'Jan Boorek', role: 'Właściciel', phone: '600 100 200' },
    { id: id('wrk'), name: 'Piotr Kowal', role: 'Operator maszyn', phone: '601 200 300' },
    { id: id('wrk'), name: 'Marek Lis', role: 'Operator maszyn', phone: '602 300 400' },
    { id: id('wrk'), name: 'Anna Boorek', role: 'Księgowość / zarząd', phone: '603 400 500' },
  ];

  const [f1, f2, f3, f4, f5, f6, f7, , f9, , f11] = fields;
  const [m1, m2, m3, m4, m5] = machines;

  const mkT = (date: string, type: string, fieldId: string, crop: string, season: number, cost: number, extra: Partial<FarmData['treatments'][0]> = {}) => ({ id: id('trt'), date, type, fieldId, crop, cost, season, ...extra });

  const treatments = [
    mkT('2024-10-05', 'siew', f1.id, 'Pszenica ozima', 2025, 42.5 * 640, { productName: 'Nasiona pszenicy (kwalifikat)', dose: 180, quantity: 42.5 * 180, machineId: m1.id, operator: 'Piotr Kowal', weather: '16°C, wiatr 2 m/s, bez opadów' }),
    mkT('2024-10-08', 'nawożenie', f1.id, 'Pszenica ozima', 2025, 42.5 * 620, { productName: 'Polifoska 6', dose: 200, quantity: 8500, machineId: m2.id, operator: 'Marek Lis' }),
    mkT('2025-03-20', 'nawożenie', f1.id, 'Pszenica ozima', 2025, 42.5 * 460, { productName: 'Saletra amonowa 34%', dose: 250, quantity: 10625, machineId: m2.id }),
    mkT('2025-04-15', 'oprysk', f1.id, 'Pszenica ozima', 2025, 42.5 * 210, { productName: 'Herbicyd + retardant', dose: 1.2, quantity: 51, machineId: m5.id, operator: 'Piotr Kowal', weather: '14°C, wiatr 1.8 m/s' }),
    mkT('2025-05-08', 'oprysk', f1.id, 'Pszenica ozima', 2025, 42.5 * 240, { productName: 'Proline 250 EC', dose: 0.8, quantity: 34, machineId: m5.id }),
    mkT('2025-07-22', 'zbiór', f1.id, 'Pszenica ozima', 2025, 42.5 * 420, { machineId: m4.id, operator: 'Jan Boorek', notes: 'Plon 8,1 t/ha, wilg. 13,5%' }),
    mkT('2025-08-26', 'siew', f2.id, 'Rzepak ozimy', 2026, 38 * 980, { productName: 'Nasiona rzepaku Avatar', dose: 3, quantity: 114, machineId: m1.id }),
    mkT('2025-09-02', 'oprysk', f2.id, 'Rzepak ozimy', 2026, 38 * 250, { productName: 'Command 480 SC', dose: 0.25, quantity: 9.5, machineId: m5.id, weather: '18°C, bezwietrznie' }),
    mkT('2025-10-10', 'oprysk', f2.id, 'Rzepak ozimy', 2026, 38 * 190, { productName: 'Regulator wzrostu + fungicyd', dose: 0.6, quantity: 22.8, machineId: m5.id }),
    mkT('2026-03-05', 'nawożenie', f2.id, 'Rzepak ozimy', 2026, 38 * 540, { productName: 'Saletra amonowa 34%', dose: 300, quantity: 11400, machineId: m2.id }),
    mkT('2026-04-20', 'nawożenie', f2.id, 'Rzepak ozimy', 2026, 38 * 510, { productName: 'Saletrzak 27%', dose: 280, quantity: 10640, machineId: m2.id }),
    mkT('2026-05-05', 'oprysk', f2.id, 'Rzepak ozimy', 2026, 38 * 300, { productName: 'Fungicyd na sclerotinia', dose: 1.0, quantity: 38, machineId: m5.id }),
    mkT('2026-04-28', 'siew', f3.id, 'Kukurydza', 2026, 18.5 * 1200, { productName: 'Nasiona kukurydzy P8200', dose: 9, quantity: 166, machineId: m1.id }),
    mkT('2026-04-25', 'nawożenie', f3.id, 'Kukurydza', 2026, 18.5 * 700, { productName: 'RSM 32%', dose: 200, quantity: 3700, machineId: m2.id }),
    mkT('2026-05-20', 'oprysk', f3.id, 'Kukurydza', 2026, 18.5 * 260, { productName: 'Herbicyd nalistny', dose: 1.5, quantity: 27.75, machineId: m5.id }),
    mkT('2026-04-02', 'nawożenie', f4.id, 'Burak cukrowy', 2026, 31 * 800, { productName: 'Sól potasowa 60%', dose: 250, quantity: 7750, machineId: m2.id }),
    mkT('2026-04-12', 'siew', f4.id, 'Burak cukrowy', 2026, 31 * 1500, { productName: 'Nasiona buraka Garanta', dose: 1.2, quantity: 37.2, machineId: m1.id }),
    mkT('2026-05-18', 'oprysk', f4.id, 'Burak cukrowy', 2026, 31 * 320, { productName: 'Herbicyd mikrodawkowy', dose: 0.35, quantity: 10.85, machineId: m5.id }),
    mkT('2026-06-10', 'oprysk', f4.id, 'Burak cukrowy', 2026, 31 * 320, { productName: 'Herbicyd mikrodawkowy II dawka', dose: 0.3, quantity: 9.3, machineId: m5.id }),
    mkT('2026-04-08', 'siew', f5.id, 'Jęczmień ozimy', 2025, 27.5 * 600, { productName: 'Nasiona jęczmienia', dose: 170, quantity: 4675 }),
    mkT('2025-07-18', 'zbiór', f5.id, 'Jęczmień ozimy', 2025, 27.5 * 420, { machineId: m4.id, notes: 'Plon 7,4 t/ha' }),
    mkT('2026-03-10', 'nawożenie', f5.id, 'Jęczmień ozimy', 2026, 27.5 * 470, { productName: 'Saletra amonowa 34%', dose: 220, quantity: 6050 }),
    mkT('2026-04-25', 'oprysk', f5.id, 'Jęczmień ozimy', 2026, 27.5 * 230, { productName: 'Fungicyd T1', dose: 0.9, quantity: 24.75 }),
    mkT('2026-05-03', 'siew', f6.id, 'Soja', 2026, 24 * 900, { productName: 'Nasiona soi Abelina', dose: 90, quantity: 2160 }),
    mkT('2026-06-15', 'oprysk', f6.id, 'Soja', 2026, 24 * 280, { productName: 'Herbicyd nalistny', dose: 1.0, quantity: 24 }),
    mkT('2026-04-01', 'sadzenie', f9.id, 'Marchew', 2026, 12.5 * 4200, { notes: 'Siew nasion drażowanych' }),
    mkT('2026-05-12', 'oprysk', f9.id, 'Marchew', 2026, 12.5 * 350, { productName: 'Herbicyd nalistny', dose: 1.2, quantity: 15 }),
    mkT('2026-06-20', 'oprysk', f9.id, 'Marchew', 2026, 12.5 * 300, { productName: 'Fungicyd na alternariozę', dose: 0.8, quantity: 10 }),
    mkT('2026-08-01', 'talerzowanie', f5.id, 'Jęczmień ozimy', 2026, 27.5 * 150, { machineId: m1.id, operator: 'Marek Lis', notes: 'Przygotowanie pod pszenicę ozimą' }),
    mkT('2026-08-03', 'wałowanie', f7.id, 'Pszenżyto', 2026, 35.5 * 90, { machineId: m3.id }),
    mkT('2026-07-25', 'zbiór', f7.id, 'Pszenżyto', 2026, 35.5 * 420, { machineId: m4.id, notes: 'Plon 7,2 t/ha' }),
  ];

  const tasks: FarmData['tasks'] = [
    { id: id('tsk'), title: 'Lustracja rzepaku — ocena po wiosennej wegetacji', fieldId: f2.id, dueDate: '2026-08-06', priority: 'wysoki', status: 'nowe', kind: 'lustracja', workerId: workers[1].id },
    { id: id('tsk'), title: 'Oprysk grzybobójczy T2 na pszenżyto', fieldId: f7.id, dueDate: '2026-08-07', priority: 'wysoki', status: 'zaplanowane', kind: 'zabieg', workerId: workers[1].id, machineId: m5.id },
    { id: id('tsk'), title: 'Siew poplonu po jęczmieniu', fieldId: f5.id, dueDate: '2026-08-10', priority: 'średni', status: 'zaplanowane', kind: 'siew', workerId: workers[2].id },
    { id: id('tsk'), title: 'Przegląd ciągnika JD 6195R (4000 MTH)', machineId: m1.id, dueDate: '2026-08-12', priority: 'średni', status: 'nowe', kind: 'serwis' },
    { id: id('tsk'), title: 'Zamówienie wapna nawozowego na pole Za Lasem', fieldId: f4.id, dueDate: '2026-08-15', priority: 'średni', status: 'nowe', kind: 'zakup' },
    { id: id('tsk'), title: 'Lustracja kukurydzy — stadium liści', fieldId: f3.id, dueDate: '2026-08-08', priority: 'niski', status: 'zaplanowane', kind: 'lustracja' },
    { id: id('tsk'), title: 'Nawożenie dolistne marchwi (Mg + B)', fieldId: f9.id, dueDate: '2026-08-09', priority: 'średni', status: 'nowe', kind: 'nawożenie', workerId: workers[1].id },
    { id: id('tsk'), title: 'Atestacja opryskiwacza Amazone UX', machineId: m5.id, dueDate: '2026-08-20', priority: 'niski', status: 'nowe', kind: 'serwis' },
    { id: id('tsk'), title: 'Zbiór łubinu — Grunty Wschodnie', fieldId: f11.id, dueDate: '2026-08-18', priority: 'wysoki', status: 'zaplanowane', kind: 'zabieg', machineId: m4.id },
    { id: id('tsk'), title: 'Aktualizacja planu nawożenia N na 2027', dueDate: '2026-08-31', priority: 'niski', status: 'nowe', kind: 'zakup' },
  ];

  const alerts: FarmData['alerts'] = [
    { id: id('al'), date: '2026-08-05', category: 'agronomiczne', priority: 'krytyczne', title: 'Ryzyko mączniaka na polu Pod Górką — wilgotna pogoda i zwarty łan', source: 'Monitoring DEMO', read: false },
    { id: id('al'), date: '2026-08-05', category: 'magazynowe', priority: 'ostrzeżenie', title: 'Niski stan saletry amonowej: 8 500 kg (przy planowanych zabiegach)', source: 'Magazyn', read: false },
    { id: id('al'), date: '2026-08-04', category: 'serwisowe', priority: 'ostrzeżenie', title: 'John Deere 6195R: przegląd za 58 MTH', source: 'Flota', read: false },
    { id: id('al'), date: '2026-08-04', category: 'pogodowe', priority: 'info', title: 'Jutro (07.08) dobre okno opryskowe: wiatr 3,4 m/s, bez opadów', source: 'Pogoda DEMO', read: false },
    { id: id('al'), date: '2026-08-03', category: 'magazynowe', priority: 'krytyczne', title: 'Brak wapna nawozowego — stan 0 kg, minimum 5 000 kg', source: 'Magazyn', read: false },
    { id: id('al'), date: '2026-08-03', category: 'serwisowe', priority: 'ostrzeżenie', title: 'Brak filtra paliwa do JD 6195R (stan 1 szt., min. 2)', source: 'Magazyn', read: true },
    { id: id('al'), date: '2026-08-02', category: 'terminowe', priority: 'ostrzeżenie', title: 'Termin atestacji opryskiwacza mija 20.08.2026', source: 'Flota', read: false },
    { id: id('al'), date: '2026-08-02', category: 'finansowe', priority: 'info', title: 'Koszt produkcji warzyw wzrósł o 8% r/r — sprawdź kalkulację', source: 'Finanse', read: true },
    { id: id('al'), date: '2026-08-01', category: 'agronomiczne', priority: 'ostrzeżenie', title: 'Pole Za Lasem: niskie pH (5,6) i niska zasobność w P i K — zaplanuj wapnowanie', source: 'Analiza gleby', read: false },
    { id: id('al'), date: '2026-08-01', category: 'pogodowe', priority: 'ostrzeżenie', title: 'Prognozowane opady 09.08 (12,6 mm) — unikaj oprysków', source: 'Pogoda DEMO', read: false },
  ];

  const fuelTanks: FarmData['fuelTanks'] = [
    { id: id('ft'), name: 'Zbiornik główny ON', capacity: 5000, current: 2400, history: [
      { id: id('fth'), date: '2026-07-20', type: 'tankowanie', qty: 2000, cost: 12200 },
      { id: id('fth'), date: '2026-07-28', type: 'zużycie', qty: 320, machine: 'Claas Lexion 670 (żniwa)' },
      { id: id('fth'), date: '2026-08-02', type: 'zużycie', qty: 180, machine: 'John Deere 6195R' },
    ] },
    { id: id('ft'), name: 'Zbiornik zapasowy ON', capacity: 2000, current: 950, history: [
      { id: id('fth'), date: '2026-05-10', type: 'tankowanie', qty: 1000, cost: 6100 },
      { id: id('fth'), date: '2026-06-15', type: 'zużycie', qty: 50, machine: 'Zetor Forterra 140' },
    ] },
  ];

  const grain: FarmData['grain'] = [
    { id: id('gr'), crop: 'Pszenica ozima', qty: 96, storage: 'Silo A (200 t)', moisture: 13.5, harvestDate: '2026-07-22', currentPrice: 850, history: [
      { id: id('grh'), date: '2026-07-22', type: 'przyjęcie', qty: 344 },
      { id: id('grh'), date: '2026-08-01', type: 'sprzedaż', qty: 248, price: 860 },
    ] },
    { id: id('gr'), crop: 'Pszenżyto', qty: 128, storage: 'Silo B (150 t)', moisture: 14.0, harvestDate: '2026-07-25', currentPrice: 760, history: [
      { id: id('grh'), date: '2026-07-25', type: 'przyjęcie', qty: 256 },
      { id: id('grh'), date: '2026-08-03', type: 'sprzedaż', qty: 128, price: 755 },
    ] },
    { id: id('gr'), crop: 'Jęczmień ozimy', qty: 203.5, storage: 'Magazyn płaski', moisture: 13.8, harvestDate: '2025-07-18', currentPrice: 700, history: [
      { id: id('grh'), date: '2025-07-18', type: 'przyjęcie', qty: 203.5 },
    ] },
    { id: id('gr'), crop: 'Rzepak ozimy', qty: 41, storage: 'Silo C (100 t)', moisture: 8.2, harvestDate: '2025-07-30', currentPrice: 1950, history: [
      { id: id('grh'), date: '2025-07-30', type: 'przyjęcie', qty: 41 },
    ] },
  ];

  const leases: FarmData['leases'] = [
    { id: id('lease'), landlord: 'KOWR OT Bydgoszcz', parcelNo: f2.parcelNo, fieldId: f2.id, area: f2.area, pricePerHa: 1100, paymentType: 'roczna', startDate: '2022-09-01', endDate: '2032-08-31', paidThisYear: Math.round(f2.area * 1100), notes: 'Dzierżawa gruntów Skarbu Państwa, płatne do 30.09.' },
    { id: id('lease'), landlord: 'Jan Kowalczyk', parcelNo: f4.parcelNo, fieldId: f4.id, area: f4.area, pricePerHa: 950, paymentType: 'roczna', startDate: '2023-03-01', endDate: '2028-02-28', paidThisYear: 0, notes: 'Umowa prywatna — płatność po żniwach.' },
    { id: id('lease'), landlord: 'Maria Zielińska', parcelNo: f11.parcelNo, fieldId: f11.id, area: f11.area, pricePerHa: 1250, paymentType: 'kwartalna', startDate: '2021-01-01', endDate: '2027-03-31', paidThisYear: Math.round(f11.area * 1250 * 0.5), notes: 'Grunty klasy III, płatność kwartalna. Umowa wygasa wkrótce.' },
    { id: id('lease'), landlord: 'Spółdzielnia Borek', parcelNo: '312/7', area: 15.5, pricePerHa: 800, paymentType: 'roczna', startDate: '2024-09-01', endDate: '2029-08-31', paidThisYear: 0, notes: 'Grunt jeszcze niepowiązany z polem w GIS.' },
  ];

  const zones: FarmData['zones'] = [
    { id: id('zone'), fieldId: f1.id, name: 'Strefa A (wysoki potencjał)', color: '#10b981', areaShare: 45, pH: 6.4, P: 'wysoka', K: 'średnia', Mg: 'średnia', ndvi: 0.78, yield: 8.2, recommendedDose: 180 },
    { id: id('zone'), fieldId: f1.id, name: 'Strefa B (średni)', color: '#f59e0b', areaShare: 35, pH: 6.0, P: 'średnia', K: 'średnia', Mg: 'niska', ndvi: 0.63, yield: 6.9, recommendedDose: 150 },
    { id: id('zone'), fieldId: f1.id, name: 'Strefa C (niski)', color: '#ef4444', areaShare: 20, pH: 5.6, P: 'niska', K: 'niska', Mg: 'niska', ndvi: 0.48, yield: 5.4, recommendedDose: 120 },
    { id: id('zone'), fieldId: f3.id, name: 'Strefa A', color: '#10b981', areaShare: 55, pH: 6.6, P: 'wysoka', K: 'wysoka', Mg: 'średnia', ndvi: 0.80, yield: 11.5, recommendedDose: 210 },
    { id: id('zone'), fieldId: f3.id, name: 'Strefa B', color: '#f59e0b', areaShare: 45, pH: 6.1, P: 'średnia', K: 'średnia', Mg: 'średnia', ndvi: 0.66, yield: 9.8, recommendedDose: 170 },
  ];

  const s1la = f1.geo.map((p) => p[0]);
  const s1lo = f1.geo.map((p) => p[1]);
  const s1 = { minLa: Math.min(...s1la), maxLa: Math.max(...s1la), minLo: Math.min(...s1lo), maxLo: Math.max(...s1lo) };
  const soilSamples: FarmData['soilSamples'] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    soilSamples.push({
      id: id('smp'), fieldId: f1.id,
      lat: s1.minLa + ((i + 0.5) / 3) * (s1.maxLa - s1.minLa),
      lng: s1.minLo + ((j + 0.5) / 3) * (s1.maxLo - s1.minLo),
      pH: +(5.4 + 0.3 * (i + j)).toFixed(1), P: 12 + 8 * i + 5 * j, K: 90 + 25 * i + 15 * j, Mg: 35 + 15 * j, date: '2026-03-15',
    });
  }

  const myWorkers: FarmData['workers'] = [
    { id: id('wrk'), name: 'Właściciel', role: 'Właściciel', phone: '' },
  ];

  return {
    farms: [farm1, farm2], activeFarmId: farm1.id,
    data: {
      [farm1.id]: { fields, fieldCrops, cropHistory, treatments, machines, warehouse, fuelTanks, grain, workers, tasks, alerts, sessions: [], leases, zones, soilSamples },
      // „Moje Gospodarstwo” — czysty start: użytkownik dodaje własne pola na mapie
      [farm2.id]: {
        fields: [], fieldCrops: [], cropHistory: [], treatments: [], machines: [],
        warehouse: [], fuelTanks: [], grain: [], workers: myWorkers, tasks: [], alerts: [], sessions: [], leases: [], zones: [], soilSamples: [],
      },
    },
  };
}

export function emptyFarmData(): FarmData {
  return {
    fields: [], fieldCrops: [], cropHistory: [], treatments: [], machines: [],
    warehouse: [], fuelTanks: [], grain: [], workers: [], tasks: [], alerts: [], sessions: [], leases: [], zones: [], soilSamples: [],
  };
}
