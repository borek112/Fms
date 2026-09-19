import { useCallback, useEffect, useRef, useState } from 'react';
import { parseNmea, buildSnapshot } from './nmeaParser';
import type { NmeaSentence, GnssSnapshot } from './types';
import { externalGnss } from './externalGnss';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const BAUD_RATES = [4800, 9600, 19200, 38400, 57600, 115200];

/** Odczyt strumienia NMEA z odbiornika GNSS przez Web Serial API. Bez fikcyjnego połączenia. */
export function useSerialNmea() {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator && typeof window !== 'undefined' && (window.isSecureContext ?? true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baud, setBaud] = useState(9600);
  const [lines, setLines] = useState<string[]>([]);
  const [snap, setSnap] = useState<GnssSnapshot | null>(null);

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepRef = useRef(false);
  const recent = useRef<NmeaSentence[]>([]);

  const handleLine = useCallback((line: string) => {
    const s = parseNmea(line);
    setLines((prev) => [line, ...prev].slice(0, 14));
    if (!s) return;
    recent.current = [...recent.current, s].slice(-24);
    const snapshot = buildSnapshot(recent.current);
    setSnap(snapshot);
    if (snapshot.lat != null && snapshot.lng != null) {
      externalGnss.set({
        lat: snapshot.lat,
        lng: snapshot.lng,
        accuracy: snapshot.hdop != null ? Math.max(0.3, snapshot.hdop * 2) : 3,
        speed: snapshot.speedKmh != null ? snapshot.speedKmh / 3.6 : -1,
        heading: snapshot.heading != null ? snapshot.heading : NaN,
        altitude: snapshot.altitude,
        timestamp: Date.now(),
      });
    }
  }, []);

  const connect = useCallback(async () => {
    if (!supported) { setError('Web Serial API niedostępne w tej przeglądarce (wymagany Chrome/Edge na komputerze, HTTPS).'); return; }
    try {
      setError(null);
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baud });
      portRef.current = port;
      keepRef.current = true;
      recent.current = [];
      setConnected(true);
      externalGnss.setConnected(true);

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => undefined);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buf = '';
      (async () => {
        try {
          while (keepRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;
            let idx: number;
            while ((idx = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (line.startsWith('$')) handleLine(line);
            }
          }
        } catch {
          if (keepRef.current) setError('Utracono połączenie z odbiornikiem.');
        }
      })();
    } catch (e: any) {
      if (e?.name !== 'NotFoundError') setError('Nie udało się otworzyć portu szeregowego.');
    }
  }, [supported, baud, handleLine]);

  const disconnect = useCallback(async () => {
    keepRef.current = false;
    externalGnss.setConnected(false);
    setConnected(false);
    try { await readerRef.current?.cancel(); } catch { /* ignore */ }
    try { readerRef.current?.releaseLock(); } catch { /* ignore */ }
    try { await portRef.current?.close(); } catch { /* ignore */ }
    readerRef.current = null;
    portRef.current = null;
  }, []);

  useEffect(() => () => { keepRef.current = false; externalGnss.setConnected(false); }, []);

  return { supported, connected, error, baud, setBaud, lines, snap, connect, disconnect };
}
