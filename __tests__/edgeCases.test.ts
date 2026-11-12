import { DEFAULT_TIMETABLE } from '../src/data/defaultTimetable';
import { Activity } from '../src/models/types';
import {
  buildBellEvents,
  getSnapshot,
  sanitizeActivities,
  scheduleSignature,
  validateActivity,
} from '../src/utils/schedule';
import {
  formatCountdown,
  formatDuration,
  formatMinutes,
} from '../src/utils/time';

const day = (h: number, m: number, s = 0) => new Date(2026, 10, 12, h, m, s);
const act = (id: string, s: number, e: number, name = id): Activity => ({
  id,
  name,
  startMinutes: s,
  endMinutes: e,
});

describe('empty and tiny timetables', () => {
  it('empty timetable produces no current/next and no bells', () => {
    const snap = getSnapshot([], day(10, 0));
    expect(snap.current).toBeUndefined();
    expect(snap.next).toBeUndefined();
    expect(snap.secondsRemaining).toBe(0);
    expect(buildBellEvents([], true)).toEqual([]);
  });

  it('single activity: after it ends, next is tomorrow', () => {
    const list = [act('a', 600, 660)];
    const snap = getSnapshot(list, day(12, 0));
    expect(snap.current).toBeUndefined();
    expect(snap.next?.id).toBe('a');
    expect(snap.secondsRemaining).toBe(22 * 3600);
  });

  it('during the last activity there is no next', () => {
    const snap = getSnapshot(DEFAULT_TIMETABLE, day(18, 59, 30));
    expect(snap.current).toBeDefined();
    expect(snap.next).toBeUndefined();
    expect(snap.secondsRemaining).toBe(30);
  });

  it('gap between activities counts down to the next start', () => {
    const list = [act('a', 600, 660), act('b', 720, 780)];
    const snap = getSnapshot(list, day(11, 30));
    expect(snap.current).toBeUndefined();
    expect(snap.next?.id).toBe('b');
    expect(snap.secondsRemaining).toBe(1800);
  });

  it('unsorted input is handled', () => {
    const list = [act('b', 720, 780), act('a', 600, 660)];
    expect(getSnapshot(list, day(10, 30)).current?.id).toBe('a');
    expect(buildBellEvents(list, false).map(e => e.id)).toEqual([
      'db-start-a',
      'db-start-b',
    ]);
  });
});

describe('day boundaries', () => {
  it('activity ending at 23:59 and starting at midnight', () => {
    const list = [act('night', 0, 30), act('late', 1380, 1439)];
    expect(getSnapshot(list, day(0, 0)).current?.id).toBe('night');
    expect(getSnapshot(list, day(23, 59, 30)).current).toBeUndefined();
    const ends = buildBellEvents(list, true).filter(e => e.kind === 'end');
    ends.forEach(e => expect(e.minute).toBeLessThan(1440));
  });

  it('end bell at 24:00 wraps to minute 0', () => {
    const events = buildBellEvents([act('x', 1380, 1440)], true);
    expect(events.find(e => e.kind === 'end')?.minute).toBe(0);
  });

  it('progress stays within 0..1', () => {
    const list = [act('a', 600, 660)];
    for (const [h, m, s] of [
      [10, 0, 0],
      [10, 30, 0],
      [10, 59, 59],
    ]) {
      const p = getSnapshot(list, day(h, m, s)).progress;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe('validation edge cases', () => {
  const list = [act('a', 600, 660, 'Alpha')];
  it('allows back-to-back activities', () => {
    expect(validateActivity(act('b', 660, 700, 'B'), list).ok).toBe(true);
    expect(validateActivity(act('b', 540, 600, 'B'), list).ok).toBe(true);
  });
  it('rejects whitespace names and zero length', () => {
    expect(validateActivity(act('b', 700, 720, '   '), list).ok).toBe(false);
    expect(validateActivity(act('b', 700, 700, 'B'), list).ok).toBe(false);
  });
  it('rejects an activity that fully contains another', () => {
    const r = validateActivity(act('b', 500, 800, 'B'), list);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Alpha');
  });
  it('editing an activity does not clash with itself', () => {
    expect(validateActivity(act('a', 610, 670, 'Alpha'), list).ok).toBe(true);
  });
});

describe('sanitizeActivities (corrupted storage)', () => {
  it('returns undefined for non-arrays', () => {
    expect(sanitizeActivities(undefined)).toBeUndefined();
    expect(sanitizeActivities(null)).toBeUndefined();
    expect(sanitizeActivities('oops')).toBeUndefined();
    expect(sanitizeActivities({})).toBeUndefined();
  });
  it('keeps the default timetable intact', () => {
    expect(sanitizeActivities(DEFAULT_TIMETABLE)).toEqual(DEFAULT_TIMETABLE);
  });
  it('drops malformed, duplicate and overlapping entries', () => {
    const out = sanitizeActivities([
      null,
      42,
      { id: 'x' },
      { id: 'n', name: 'NaN', startMinutes: NaN, endMinutes: 10 },
      { id: 'neg', name: 'Neg', startMinutes: -5, endMinutes: 10 },
      { id: 'big', name: 'Big', startMinutes: 100, endMinutes: 5000 },
      { id: 'inv', name: 'Inv', startMinutes: 100, endMinutes: 50 },
      { id: 'blank', name: ' ', startMinutes: 1, endMinutes: 2 },
      act('a', 600, 660, 'A'),
      act('a', 700, 760, 'Dup'),
      act('o', 630, 690, 'Overlap'),
      act('b', 660, 720, 'B'),
    ]);
    expect(out?.map(a => a.id)).toEqual(['a', 'b']);
  });
  it('strips unknown fields', () => {
    const out = sanitizeActivities([{ ...act('a', 1, 2, 'A'), extra: true }]);
    expect(out?.[0]).toEqual(act('a', 1, 2, 'A'));
  });
});

describe('formatting edge cases', () => {
  it('handles negative and huge values safely', () => {
    expect(formatCountdown(-10)).toBe('00:00');
    expect(formatCountdown(NaN)).toBe('00:00');
    expect(formatMinutes(-30)).toBe('11:30 PM');
    expect(formatMinutes(1440)).toBe('12:00 AM');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(90)).toBe('1h 30m');
  });
});

describe('signature', () => {
  it('changes when a name or time changes, not otherwise', () => {
    const base = buildBellEvents(DEFAULT_TIMETABLE, true);
    const sig = scheduleSignature(base, 'x');
    expect(
      scheduleSignature(buildBellEvents(DEFAULT_TIMETABLE, true), 'x'),
    ).toBe(sig);
    const renamed = DEFAULT_TIMETABLE.map((a, i) =>
      i === 0 ? { ...a, name: 'Changed' } : a,
    );
    expect(scheduleSignature(buildBellEvents(renamed, true), 'x')).not.toBe(
      sig,
    );
  });
});

describe('theme colours', () => {
  const { ACCENTS, buildTheme, mix } = require('../src/theme/theme');
  it('has 10 distinct accents with valid hex colours', () => {
    expect(ACCENTS).toHaveLength(10);
    expect(new Set(ACCENTS.map((a: { id: string }) => a.id)).size).toBe(10);
    ACCENTS.forEach((a: { color: string }) =>
      expect(a.color).toMatch(/^#[0-9A-F]{6}$/),
    );
  });
  it('mixes colours', () => {
    expect(mix('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#FF0000');
  });
  it('every accent builds valid light and dark themes', () => {
    ACCENTS.forEach((a: { id: string; color: string }) => {
      for (const dark of [false, true]) {
        const th = buildTheme(a.id, dark);
        Object.values(th.colors).forEach(c =>
          expect(c).toMatch(/^(#[0-9A-F]{6}|rgba\(.+\))$/),
        );
        if (!dark) expect(th.colors.primary).toBe(a.color);
      }
    });
    expect(buildTheme('green', false).colors.heroStart).not.toBe(
      buildTheme('indigo', false).colors.heroStart,
    );
  });
  it('falls back to indigo for unknown ids', () => {
    expect(buildTheme('nope', false).colors.primary).toBe('#5B5BD6');
  });
});
