import { useMemo } from 'react';
import { classifyDeviation, crossTrackError, distanceToLineEnd, nearestLine, type GuidanceGeometry, type GuidanceQuality } from '@/geometry/guidance';
import type { GpsFix } from './useGps';

export interface GuidanceInfo {
  activeLine: ReturnType<typeof nearestLine>['line'];
  activeIndex: number;
  xte: number;
  steer: 'left' | 'right' | 'center';
  quality: GuidanceQuality;
  distanceToEnd: number;
}

export function useFieldGuidance(
  geometry: GuidanceGeometry | null,
  fix: GpsFix | null,
  offsetCorr = 0,
): GuidanceInfo {
  return useMemo(() => {
    if (!geometry || !fix || geometry.lines.length === 0) {
      return {
        activeLine: null,
        activeIndex: 0,
        xte: 0,
        steer: 'center',
        quality: 'ideal',
        distanceToEnd: 0,
      };
    }

    const result = nearestLine(
      { lat: fix.lat, lng: fix.lng },
      geometry,
      offsetCorr,
    );
    const xte = result.line
      ? crossTrackError(
          { lat: fix.lat, lng: fix.lng },
          geometry,
          result.line,
          offsetCorr,
        )
      : 0;

    return {
      activeLine: result.line,
      activeIndex: result.line ? geometry.lines.indexOf(result.line) + 1 : 0,
      xte,
      steer: Math.abs(xte) <= 0.05 ? 'center' : xte > 0 ? 'right' : 'left',
      quality: classifyDeviation(xte),
      distanceToEnd: result.line
        ? distanceToLineEnd(
            { lat: fix.lat, lng: fix.lng },
            geometry,
            result.line,
          )
        : 0,
    };
  }, [geometry, fix, offsetCorr]);
}
