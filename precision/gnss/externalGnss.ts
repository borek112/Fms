import { useEffect, useState } from 'react';
import type { GpsFix } from '@/hooks/useGps';

// Współdzielony most dla pozycji z zewnętrznego odbiornika GNSS (Web Serial NMEA).
// Field Pilot i GNSS Center czytają z niego bez wzajemnej zależności.
type Listener = (f: GpsFix | null) => void;

let current: GpsFix | null = null;
let connected = false;
const listeners = new Set<Listener>();

export const externalGnss = {
  set(fix: GpsFix | null) { current = fix; listeners.forEach((l) => l(fix)); },
  setConnected(v: boolean) { connected = v; if (!v) { current = null; listeners.forEach((l) => l(null)); } },
  get() { return current; },
  isConnected() { return connected; },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Hook zwracający ostatnią pozycję z odbiornika zewnętrznego (lub null). */
export function useExternalGnss() {
  const [fix, setFix] = useState<GpsFix | null>(externalGnss.get());
  useEffect(() => externalGnss.subscribe(setFix), []);
  return { fix, connected: fix !== null || externalGnss.isConnected() };
}
