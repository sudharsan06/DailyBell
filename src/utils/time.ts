import { MinuteOfDay } from '../models/types';

export const MINUTES_PER_DAY = 24 * 60;

/** "HH:mm" (24h) -> minutes since midnight. */
export const toMinutes = (hhmm: string): MinuteOfDay => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const minutesOfDate = (d: Date): MinuteOfDay =>
  d.getHours() * 60 + d.getMinutes();

export const secondsOfDate = (d: Date): number =>
  d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

/** 12-hour display string, e.g. "9:30 AM". Uses device local time. */
export const formatMinutes = (m: MinuteOfDay): string => {
  const norm = ((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(norm / 60);
  const min = norm % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min.toString().padStart(2, '0')} ${suffix}`;
};

export const formatRange = (start: MinuteOfDay, end: MinuteOfDay) =>
  `${formatMinutes(start)} – ${formatMinutes(end)}`;

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

/** Countdown "HH:MM:SS" or "MM:SS". */
export const formatCountdown = (totalSeconds: number): string => {
  const s = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/** Next local Date at which the clock reads `minute` (today if still ahead, else tomorrow). */
export const nextOccurrence = (
  minute: MinuteOfDay,
  from: Date = new Date(),
): Date => {
  const d = new Date(from);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  if (d.getTime() <= from.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const minutesToDate = (minute: MinuteOfDay, base: Date = new Date()) => {
  const d = new Date(base);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
};

export const dateToMinutes = (d: Date): MinuteOfDay => minutesOfDate(d);

/** Identity of the device time zone; changes trigger a reschedule. */
export const timeZoneSignature = (): string => {
  let zone = 'unknown';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown';
  } catch {
    // Intl may be limited on some engines; offset alone still works.
  }
  return `${zone}|${new Date().getTimezoneOffset()}`;
};
