import { config } from '../config';

/** Source of the current time; tests replace it with a fixed clock. */
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

const OFFSET_MS = config.utcOffsetHours * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

/** Local date (UTC+7) of an instant, as YYYY-MM-DD. */
export function localDate(d: Date): string {
  const t = new Date(d.getTime() + OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Local time (UTC+7) of an instant, as HH:mm. */
export function localTime(d: Date): string {
  const t = new Date(d.getTime() + OFFSET_MS);
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/** Instant of a local date and time (UTC+7). */
export function fromLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

/** Day of week of a local date: 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const toMinutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const fromMinutes = (m: number): string => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
export const isTime = (s: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
