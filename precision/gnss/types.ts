// FMS PRECISION — GNSS / NMEA 0183 — typy
export type FixQuality =
  | 'invalid' | 'gps' | 'dgps' | 'pps'
  | 'rtk-fixed' | 'rtk-float' | 'estimated' | 'manual' | 'simulation';

export interface NmeaGga {
  type: 'GGA';
  time: string;
  lat: number | null;
  lng: number | null;
  qualityCode: number;
  quality: FixQuality;
  satellites: number;
  hdop: number | null;
  altitude: number | null; // m npm
}

export interface NmeaRmc {
  type: 'RMC';
  time: string;
  status: 'A' | 'V'; // A=active, V=void
  lat: number | null;
  lng: number | null;
  speedKn: number | null;
  speedKmh: number | null;
  heading: number | null; // deg
  date: string;
}

export interface NmeaVtg {
  type: 'VTG';
  headingTrue: number | null;
  speedKn: number | null;
  speedKmh: number | null;
}

export interface NmeaGsa {
  type: 'GSA';
  mode: 'M' | 'A';
  fixType: number; // 1=none 2=2D 3=3D
  satsUsed: number[];
  pdop: number | null;
  hdop: number | null;
  vdop: number | null;
}

export interface NmeaGsvSat {
  prn: number;
  elevation: number | null;
  azimuth: number | null;
  snr: number | null;
}

export interface NmeaGsv {
  type: 'GSV';
  totalMsgs: number;
  msgNum: number;
  satellitesInView: number;
  sats: NmeaGsvSat[];
}

export type NmeaSentence = NmeaGga | NmeaRmc | NmeaVtg | NmeaGsa | NmeaGsv;

/** Zagregowany, „czytelny" stan GNSS złożony z wielu zdań NMEA. */
export interface GnssSnapshot {
  quality: FixQuality;
  satellitesUsed: number;
  satellitesInView: number;
  hdop: number | null;
  pdop: number | null;
  altitude: number | null;
  lat: number | null;
  lng: number | null;
  speedKmh: number | null;
  heading: number | null;
  time: string;
}
