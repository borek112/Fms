import { describe, it, expect } from 'vitest';
import { parseNmea, parseCoord, nmeaChecksum, parseNmeaStream, buildSnapshot, FIX_QUALITY } from './nmeaParser';
import type { NmeaGga, NmeaRmc, NmeaVtg, NmeaGsa, NmeaGsv } from './types';

describe('NMEA parser', () => {
  it('parseCoord ddmm.mmmm -> stopnie dziesiętne (+ półkule)', () => {
    expect(parseCoord('4807.038', 'N')).toBeCloseTo(48.1173, 3);
    expect(parseCoord('01131.000', 'E')).toBeCloseTo(11.5167, 3);
    expect(parseCoord('4807.038', 'S')).toBeCloseTo(-48.1173, 3);
    expect(parseCoord('', 'N')).toBeNull();
  });

  it('suma kontrolna: poprawna vs uszkodzona', () => {
    expect(nmeaChecksum('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47')).toBe(true);
    expect(nmeaChecksum('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A')).toBe(true);
    expect(nmeaChecksum('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*00')).toBe(false);
  });

  it('GGA — pozycja, jakość, satelity, HDOP, wysokość', () => {
    const s = parseNmea('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47') as NmeaGga;
    expect(s.type).toBe('GGA');
    expect(s.lat).toBeCloseTo(48.1173, 3);
    expect(s.lng).toBeCloseTo(11.5167, 3);
    expect(s.quality).toBe('gps');
    expect(s.satellites).toBe(8);
    expect(s.hdop).toBeCloseTo(0.9);
    expect(s.altitude).toBeCloseTo(545.4);
  });

  it('GGA — wykrywa RTK FIX i RTK FLOAT tylko gdy dane to potwierdzają', () => {
    const fix = parseNmea('$GNGGA,120000,5230.000,N,01900.000,E,4,14,0.6,120.0,M,40.0,M,,*6A') as NmeaGga;
    expect(fix.quality).toBe('rtk-fixed');
    const flt = parseNmea('$GNGGA,120000,5230.000,N,01900.000,E,5,14,0.7,120.0,M,40.0,M,,*6B') as NmeaGga;
    expect(flt.quality).toBe('rtk-float');
    expect(FIX_QUALITY[1]).toBe('gps'); // zwykły GPS NIE jest RTK
  });

  it('RMC — prędkość (kn->km/h), kurs, status', () => {
    const s = parseNmea('$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A') as NmeaRmc;
    expect(s.status).toBe('A');
    expect(s.speedKn).toBeCloseTo(22.4);
    expect(s.speedKmh).toBeCloseTo(22.4 * 1.852, 2);
    expect(s.heading).toBeCloseTo(84.4);
  });

  it('VTG — kurs i prędkość', () => {
    const s = parseNmea('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48') as NmeaVtg;
    expect(s.headingTrue).toBeCloseTo(54.7);
    expect(s.speedKmh).toBeCloseTo(10.2);
  });

  it('GSA — typ fixu i DOP', () => {
    const s = parseNmea('$GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1*39') as NmeaGsa;
    expect(s.fixType).toBe(3);
    expect(s.hdop).toBeCloseTo(1.3);
    expect(s.satsUsed).toContain(4);
  });

  it('GSV — satelity w zasięgu', () => {
    const s = parseNmea('$GPGSV,3,1,11,01,40,083,46,02,17,308,41,12,07,344,39,14,22,228,45*75') as NmeaGsv;
    expect(s.satellitesInView).toBe(11);
    expect(s.sats.length).toBe(4);
    expect(s.sats[0].prn).toBe(1);
  });

  it('strumień + snapshot agreguje dane', () => {
    const stream = `$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
$GPGSV,3,1,11,01,40,083,46,02,17,308,41,12,07,344,39,14,22,228,45*75`;
    const parsed = parseNmeaStream(stream);
    expect(parsed.length).toBe(3);
    const snap = buildSnapshot(parsed);
    expect(snap.quality).toBe('gps');
    expect(snap.satellitesUsed).toBe(8);
    expect(snap.satellitesInView).toBe(11);
    expect(snap.speedKmh).toBeCloseTo(22.4 * 1.852, 2);
  });

  it('ignoruje nie-NMEA i nieznane zdania', () => {
    expect(parseNmea('losowy tekst')).toBeNull();
    expect(parseNmea('$GPZZZ,1,2,3*00')).toBeNull();
  });
});
