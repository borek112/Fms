import { useEffect, useState } from 'react';

export function useDeviceHeading(enabled = true) {
  const [heading, setHeading] = useState<number | null>(null);
  const [granted, setGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const value = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? (event.alpha === null ? null : 360 - event.alpha);
      if (value !== null) { setHeading(value); setGranted(true); setNeedsPermission(false); }
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [enabled]);
  const requestPermission = async () => {
    const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    if (ctor.requestPermission) await ctor.requestPermission();
    setNeedsPermission(false);
    setGranted(true);
  };
  return { heading, granted, needsPermission, requestPermission };
}
