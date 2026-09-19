import { useEffect, useState } from 'react';
import type { Field, WeatherDay } from '@/types';

const demoDays: WeatherDay[] = [
  { date: '2026-08-06', temp: 24, tempMin: 15, humidity: 58, wind: 3.2, gusts: 5.4, rain: 0.1, icon: '☀️', desc: 'Słonecznie' },
  { date: '2026-08-07', temp: 26, tempMin: 16, humidity: 60, wind: 3.8, gusts: 6.2, rain: 0.2, icon: '☀️', desc: 'Pochmurno' },
  { date: '2026-08-08', temp: 22, tempMin: 14, humidity: 73, wind: 5.4, gusts: 9.1, rain: 2.5, icon: '🌦️', desc: 'Przelotne opady' },
  { date: '2026-08-09', temp: 21, tempMin: 13, humidity: 76, wind: 6.1, gusts: 11.2, rain: 4.3, icon: '🌧️', desc: 'Deszcz' },
  { date: '2026-08-10', temp: 23, tempMin: 14, humidity: 68, wind: 4.8, gusts: 8, rain: 1.1, icon: '⛅', desc: 'Częściowo pochmurno' },
  { date: '2026-08-11', temp: 27, tempMin: 17, humidity: 56, wind: 3.4, gusts: 5.6, rain: 0, icon: '☀️', desc: 'Słonecznie' },
  { date: '2026-08-12', temp: 28, tempMin: 18, humidity: 54, wind: 4.2, gusts: 7.2, rain: 0, icon: '☀️', desc: 'Upał' },
];

export const centroid = (fields: Field[]): [number, number] => {
  const points = fields.flatMap((field) => field.geo);
  if (!points.length) return [52, 19];
  return [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length];
};
export const fieldCentroid = (field?: Field): [number, number] => centroid(field ? [field] : []);

export function sprayVerdict(day: WeatherDay) {
  const tone: 'ok' | 'warn' | 'bad' = day.rain > 1 || day.wind > 6 || day.gusts > 10 ? 'bad' : day.wind > 4 || day.humidity > 85 ? 'warn' : 'ok';
  return { tone, label: tone === 'ok' ? 'Warunki dobre' : tone === 'warn' ? 'Warunkowo' : 'Nie opryskiwać', reasons: [tone === 'ok' ? 'Warunki pogodowe umożliwiają oprysk.' : tone === 'warn' ? 'Sprawdź dodatkowo warunki przed zabiegiem.' : 'Przekroczone limity wiatru lub opadów.'] };
}

export function useWeather(lat: number, lng: number) {
  const [days, setDays] = useState<WeatherDay[]>(demoDays);
  const [source, setSource] = useState<'live' | 'demo'>('demo');
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const controller = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,windgusts_10m_max&current=relative_humidity_2m&timezone=auto`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[]; windspeed_10m_max?: number[]; windgusts_10m_max?: number[] }; current?: { relative_humidity_2m?: number } }) => {
        const daily = payload.daily;
        if (!daily?.time) return;
        setDays(daily.time.map((date, index) => ({ date, temp: Math.round(daily.temperature_2m_max?.[index] ?? 20), tempMin: Math.round(daily.temperature_2m_min?.[index] ?? 14), humidity: Math.round(payload.current?.relative_humidity_2m ?? 60), wind: Number((daily.windspeed_10m_max?.[index] ?? 0).toFixed(1)), gusts: Number((daily.windgusts_10m_max?.[index] ?? 0).toFixed(1)), rain: Number((daily.precipitation_sum?.[index] ?? 0).toFixed(1)), icon: (daily.precipitation_sum?.[index] ?? 0) > 1 ? '🌦️' : '☀️', desc: (daily.precipitation_sum?.[index] ?? 0) > 1 ? 'Opady' : 'Słonecznie' })));
        setSource('live');
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [lat, lng]);
  return { days, today: days[0] ?? demoDays[0], source, place: [lat, lng] as [number, number] };
}
