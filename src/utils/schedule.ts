import { Activity, BellEvent, ScheduleSnapshot } from '../models/types';
import { MINUTES_PER_DAY, secondsOfDate } from './time';

export const sortActivities = (list: Activity[]) =>
  [...list].sort((a, b) => a.startMinutes - b.startMinutes);

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validates one activity against the others (no overlap, end after start). */
export const validateActivity = (
  candidate: Activity,
  all: Activity[],
): ValidationResult => {
  if (!candidate.name.trim()) {
    return { ok: false, error: 'Please enter an activity name.' };
  }
  if (candidate.endMinutes <= candidate.startMinutes) {
    return {
      ok: false,
      error: 'End time must be after start time (same day).',
    };
  }
  const clash = all.find(
    a =>
      a.id !== candidate.id &&
      candidate.startMinutes < a.endMinutes &&
      a.startMinutes < candidate.endMinutes,
  );
  if (clash) {
    return { ok: false, error: `Overlaps with "${clash.name}".` };
  }
  return { ok: true };
};

/**
 * Builds the list of bell moments. A start bell for every activity, plus an
 * end bell (if enabled) only where no other activity starts at the same minute
 * — so back-to-back slots ring once, never twice.
 */
export const buildBellEvents = (
  activities: Activity[],
  ringAtEnd: boolean,
): BellEvent[] => {
  const sorted = sortActivities(activities);
  const startsAt = new Map<number, Activity>();
  sorted.forEach(a => startsAt.set(a.startMinutes, a));

  const events: BellEvent[] = sorted.map(a => ({
    id: `db-start-${a.id}`,
    minute: a.startMinutes,
    kind: 'start',
    activity: a,
    nextActivity: a,
  }));

  if (ringAtEnd) {
    sorted.forEach(a => {
      if (!startsAt.has(a.endMinutes)) {
        events.push({
          id: `db-end-${a.id}`,
          minute: a.endMinutes % MINUTES_PER_DAY,
          kind: 'end',
          activity: a,
          nextActivity: sorted.find(n => n.startMinutes > a.endMinutes),
        });
      }
    });
  }
  return events.sort((x, y) => x.minute - y.minute);
};

/** Pure snapshot of "where are we in the day" for local time `now`. */
export const getSnapshot = (
  activities: Activity[],
  now: Date,
): ScheduleSnapshot => {
  const sorted = sortActivities(activities);
  const nowSec = secondsOfDate(now);
  const current = sorted.find(
    a => nowSec >= a.startMinutes * 60 && nowSec < a.endMinutes * 60,
  );
  const next =
    sorted.find(a => a.startMinutes * 60 > nowSec) ??
    (sorted.length ? sorted[0] : undefined);
  const nextIsTomorrow = !!next && next.startMinutes * 60 <= nowSec;

  let secondsRemaining = 0;
  let progress = 0;
  if (current) {
    const total = (current.endMinutes - current.startMinutes) * 60;
    secondsRemaining = current.endMinutes * 60 - nowSec;
    progress = total > 0 ? 1 - secondsRemaining / total : 0;
  } else if (next) {
    secondsRemaining =
      next.startMinutes * 60 -
      nowSec +
      (nextIsTomorrow ? MINUTES_PER_DAY * 60 : 0);
  }

  return {
    current,
    next: current
      ? sorted.find(a => a.startMinutes >= current.endMinutes)
      : next,
    secondsRemaining,
    progress,
    statusOf: a => {
      if (a.endMinutes * 60 <= nowSec) return 'completed';
      if (a.startMinutes * 60 <= nowSec) return 'current';
      return 'upcoming';
    },
  };
};

/** Stable string representing everything that affects scheduled notifications. */
export const scheduleSignature = (events: BellEvent[], extra: string) =>
  `${extra}#` +
  events.map(e => `${e.id}@${e.minute}:${e.activity.name}`).join('|');

const isMinute = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isInteger(v) &&
  v >= 0 &&
  v <= MINUTES_PER_DAY;

/**
 * Cleans a timetable read from storage: drops malformed entries, duplicate
 * ids and overlaps (keeping the earlier activity), so a corrupted save can
 * never crash rendering or scheduling. Returns undefined if input isn't a list.
 */
export const sanitizeActivities = (raw: unknown): Activity[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const valid = raw.filter((a): a is Activity => {
    if (!a || typeof a !== 'object') return false;
    const { id, name, startMinutes, endMinutes } = a as Partial<Activity>;
    if (typeof id !== 'string' || !id || seen.has(id)) return false;
    if (typeof name !== 'string' || !name.trim()) return false;
    if (!isMinute(startMinutes) || !isMinute(endMinutes)) return false;
    if (endMinutes <= startMinutes) return false;
    seen.add(id);
    return true;
  });
  const kept: Activity[] = [];
  sortActivities(valid).forEach(a => {
    const prev = kept[kept.length - 1];
    if (!prev || a.startMinutes >= prev.endMinutes) {
      kept.push({
        id: a.id,
        name: a.name,
        startMinutes: a.startMinutes,
        endMinutes: a.endMinutes,
      });
    }
  });
  return kept;
};
