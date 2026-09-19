import { useCallback, useEffect, useRef } from 'react';

export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const enable = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: 'screen') => Promise<WakeLockSentinel>;
      };
    };

    try {
      sentinelRef.current = await nav.wakeLock?.request('screen');
    } catch {
      // Ignored: browser may reject permission or not support it.
    }
  }, []);

  const disable = useCallback(() => {
    if (sentinelRef.current) {
      void sentinelRef.current.release();
      sentinelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => disable();
  }, [disable]);

  return { enable, disable };
}
