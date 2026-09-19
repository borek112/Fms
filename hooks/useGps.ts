import { useEffect, useState } from 'react';

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
}

export type GpsStatusKind = 'fix' | 'weak' | 'none';

export function useGps(enabled = true) {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setError(null);
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? 0,
          heading: position.coords.heading ?? Number.NaN,
          timestamp: position.timestamp,
        });
      },
      (geoError) => setError(geoError.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  const status: GpsStatusKind = !fix ? 'none' : fix.accuracy <= 5 ? 'fix' : 'weak';

  return { fix, error, status };
}
