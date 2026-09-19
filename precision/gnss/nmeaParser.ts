// FMS PRECISION — parser NMEA 0183 (GGA / RMC / VTG / GSA / GSV)
// Moduł niezależny — może zasilać GNSS Center danymi z odbiornika zewnętrznego
// (Bluetooth / USB / Wi-Fi) po jego podłączeniu. Nie tworzy fikcyjnego połączenia.
import type {
  FixQuality, NmeaSentence, NmeaGga, NmeaRmc, NmeaVtg, NmeaGsa, NmeaGsv, NmeaGsvSat, GnssSnapshot,
} from './types';

export const FIX_QUALITY: Record<number, FixQuality> = {
  0: 'invalid', 1: 'gps', 2: 'dgps', 3: 'pps',
  4: 'rtk-fixed', 5: 'rtk-float', 6: 'estimated', 7: 'manual', 8: 'simulation',
};

export const FIX_QUALITY_LABEL: Record<FixQuality, string> = {
  invalid: 'BRAK FIX', gps: 'GPS', dgps: 'DGPS', pps: 'PPS',
  'rtk-fixed': 'RTK FIX', 'rtk-float': 'RTK FLOAT', estimated: 'ESTYMACJA', manual: 'RĘCZNY', simulation: 'SYMULACJA',
};

/** Weryfikacja sumy kontrolnej NMEA (XOR między $ a *). */
export function nmeaChecksum(sentence: string): boolean {
  const s = sentence.trim();
  const star = s.indexOf('*');
  if (star < 0) return false;
  const body = s.slice(s.startsWith('$') ? 1 : 0, star);
  const given = s.slice(star + 1, star + 3).toUpperCase();
  let cs = 0;
  for (let i = 0; i < body.length; i++) cs ^= body.charCodeAt(i);
  return cs.toString(16).toUpperCase().padStart(2, '0') === given;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** ddmm.mmmm + półkula -> stopnie dziesiętne. */
export function parseCoord(val: string, hemi: string): number | null {
  const v = Number(val);
  if (!val || Number.isNaN(v)) return null;
  const deg = Math.floor(v / 100);
  const min = v - deg * 100;
  let dec = deg + min / 60;
  if (hemi === 'S' || hemi === 'W') dec = -dec;
  return dec;
}

/** Parsuje pojedyncze zdanie NMEA. Zwraca null dla nieobsługiwanych/uszkodzonych. */
export function parseNmea(line: string): NmeaSentence | null {
  const raw = line.trim();
  if (!raw.startsWith('$')) return null;
  const star = raw.indexOf('*');
  const body = star >= 0 ? raw.slice(1, star) : raw.slice(1);
  const f = body.split(',');
  const type = (f[0] || '').slice(2); // pomija talker (GP/GN/GL/GA...)

  switch (type) {
    case 'GGA': {
      const qc = parseInt(f[6] || '0', 10) || 0;
      const gga: NmeaGga = {
        type: 'GGA', time: f[1] || '',
        lat: parseCoord(f[2] || '', f[3] || ''), lng: parseCoord(f[4] || '', f[5] || ''),
        qualityCode: qc, quality: FIX_QUALITY[qc] || 'invalid',
        satellites: parseInt(f[7] || '0', 10) || 0, hdop: num(f[8]), altitude: num(f[9]),
      };
      return gga;
    }
    case 'RMC': {
      const sp = num(f[7]);
      const rmc: NmeaRmc = {
        type: 'RMC', time: f[1] || '', status: f[2] === 'A' ? 'A' : 'V',
        lat: parseCoord(f[3] || '', f[4] || ''), lng: parseCoord(f[5] || '', f[6] || ''),
        speedKn: sp, speedKmh: sp != null ? sp * 1.852 : null, heading: num(f[8]), date: f[9] || '',
      };
      return rmc;
    }
    case 'VTG': {
      const spk = num(f[5]);
      const spkmh = num(f[7]);
      const vtg: NmeaVtg = {
        type: 'VTG', headingTrue: num(f[1]), speedKn: spk,
        speedKmh: spkmh != null ? spkmh : spk != null ? spk * 1.852 : null,
      };
      return vtg;
    }
    case 'GSA': {
      const used: number[] = [];
      for (let i = 3; i <= 14; i++) { const p = parseInt(f[i] || '', 10); if (!Number.isNaN(p)) used.push(p); }
      const gsa: NmeaGsa = {
        type: 'GSA', mode: f[1] === 'M' ? 'M' : 'A', fixType: parseInt(f[2] || '1', 10) || 1,
        satsUsed: used, pdop: num(f[15]), hdop: num(f[16]), vdop: num(f[17]),
      };
      return gsa;
    }
    case 'GSV': {
      const sats: NmeaGsvSat[] = [];
      for (let i = 4; i + 3 < f.length; i += 4) {
        const prn = parseInt(f[i] || '', 10);
        if (Number.isNaN(prn)) continue;
        sats.push({ prn, elevation: num(f[i + 1]), azimuth: num(f[i + 2]), snr: num(f[i + 3]) });
      }
      const gsv: NmeaGsv = {
        type: 'GSV', totalMsgs: parseInt(f[1] || '0', 10) || 0, msgNum: parseInt(f[2] || '0', 10) || 0,
        satellitesInView: parseInt(f[3] || '0', 10) || 0, sats,
      };
      return gsv;
    }
    default:
      return null;
  }
}

/** Parsuje wieloliniowy strumień NMEA. */
export function parseNmeaStream(text: string): NmeaSentence[] {
  return text.split(/\r?\n/).map(parseNmea).filter((x): x is NmeaSentence => x !== null);
}

/** Składa czytelny stan GNSS z listy zdań (ostatnie wartości mają priorytet). */
export function buildSnapshot(sentences: NmeaSentence[]): GnssSnapshot {
  const snap: GnssSnapshot = {
    quality: 'invalid', satellitesUsed: 0, satellitesInView: 0, hdop: null, pdop: null,
    altitude: null, lat: null, lng: null, speedKmh: null, heading: null, time: '',
  };
  for (const s of sentences) {
    if (s.type === 'GGA') {
      snap.quality = s.quality; snap.satellitesUsed = s.satellites; snap.hdop = s.hdop ?? snap.hdop;
      snap.altitude = s.altitude ?? snap.altitude; snap.lat = s.lat ?? snap.lat; snap.lng = s.lng ?? snap.lng;
      snap.time = s.time || snap.time;
    } else if (s.type === 'RMC') {
      snap.speedKmh = s.speedKmh ?? snap.speedKmh; snap.heading = s.heading ?? snap.heading;
      snap.lat = s.lat ?? snap.lat; snap.lng = s.lng ?? snap.lng; snap.time = s.time || snap.time;
    } else if (s.type === 'VTG') {
      snap.speedKmh = s.speedKmh ?? snap.speedKmh; snap.heading = s.headingTrue ?? snap.heading;
    } else if (s.type === 'GSA') {
      snap.pdop = s.pdop ?? snap.pdop; snap.hdop = s.hdop ?? snap.hdop;
    } else if (s.type === 'GSV') {
      snap.satellitesInView = Math.max(snap.satellitesInView, s.satellitesInView);
    }
  }
  return snap;
}
