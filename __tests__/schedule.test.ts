import { DEFAULT_TIMETABLE } from '../src/data/defaultTimetable';
import {
  buildBellEvents,
  getSnapshot,
  validateActivity,
} from '../src/utils/schedule';
import {
  formatCountdown,
  formatMinutes,
  nextOccurrence,
  toMinutes,
} from '../src/utils/time';

const at = (hhmm: string, sec = 0) => {
  const d = new Date(2026, 10, 11);
  const m = toMinutes(hhmm);
  d.setHours(Math.floor(m / 60), m % 60, sec, 0);
  return d;
};

describe('time utils', () => {
  it('formats 12h times', () => {
    expect(formatMinutes(toMinutes('07:30'))).toBe('7:30 AM');
    expect(formatMinutes(toMinutes('12:45'))).toBe('12:45 PM');
    expect(formatMinutes(0)).toBe('12:00 AM');
  });
  it('formats countdowns', () => {
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(3725)).toBe('1:02:05');
  });
  it('next occurrence rolls to tomorrow once passed', () => {
    const now = at('10:00');
    expect(nextOccurrence(toMinutes('11:00'), now).getDate()).toBe(11);
    expect(nextOccurrence(toMinutes('09:00'), now).getDate()).toBe(12);
    expect(nextOccurrence(toMinutes('10:00'), now).getDate()).toBe(12);
  });
});

describe('snapshot', () => {
  it('finds current and next activity', () => {
    const s = getSnapshot(DEFAULT_TIMETABLE, at('10:15'));
    expect(s.current?.name).toBe('Office Work – Session 1');
    expect(s.next?.name).toBe('Short Break');
    expect(s.secondsRemaining).toBe(45 * 60);
    expect(s.progress).toBeCloseTo(0.5);
  });
  it('treats end minute as exclusive', () => {
    const s = getSnapshot(DEFAULT_TIMETABLE, at('11:00'));
    expect(s.current?.name).toBe('Short Break');
  });
  it('before the day starts counts down to first activity', () => {
    const s = getSnapshot(DEFAULT_TIMETABLE, at('07:00'));
    expect(s.current).toBeUndefined();
    expect(s.next?.name).toBe('Morning Routine');
    expect(s.secondsRemaining).toBe(30 * 60);
  });
  it('after the day ends counts down to tomorrow', () => {
    const s = getSnapshot(DEFAULT_TIMETABLE, at('20:00'));
    expect(s.current).toBeUndefined();
    expect(s.next?.name).toBe('Morning Routine');
    expect(s.secondsRemaining).toBe((4 * 60 + 7 * 60 + 30) * 60);
  });
  it('classifies statuses', () => {
    const s = getSnapshot(DEFAULT_TIMETABLE, at('12:00'));
    expect(s.statusOf(DEFAULT_TIMETABLE[0])).toBe('completed');
    expect(s.statusOf(DEFAULT_TIMETABLE[4])).toBe('current');
    expect(s.statusOf(DEFAULT_TIMETABLE[12])).toBe('upcoming');
  });
});

describe('bell events', () => {
  it('one bell per start, end bell only when nothing starts then', () => {
    const events = buildBellEvents(DEFAULT_TIMETABLE, true);
    expect(events).toHaveLength(14); // 13 starts + final 7:00 PM end
    expect(new Set(events.map(e => e.id)).size).toBe(events.length);
    expect(events[events.length - 1]).toMatchObject({
      kind: 'end',
      minute: toMinutes('19:00'),
    });
    expect(new Set(events.map(e => e.minute)).size).toBe(events.length);
  });
  it('no end bells when disabled', () => {
    expect(buildBellEvents(DEFAULT_TIMETABLE, false)).toHaveLength(13);
  });
});

describe('validation', () => {
  it('rejects overlaps and inverted ranges', () => {
    const base = {
      id: 'x',
      name: 'Test',
      startMinutes: toMinutes('10:00'),
      endMinutes: toMinutes('10:30'),
    };
    expect(validateActivity(base, DEFAULT_TIMETABLE).ok).toBe(false);
    expect(
      validateActivity(
        { ...base, startMinutes: 1200, endMinutes: 1230 },
        DEFAULT_TIMETABLE,
      ).ok,
    ).toBe(true);
    expect(
      validateActivity({ ...base, startMinutes: 1230, endMinutes: 1200 }, [])
        .ok,
    ).toBe(false);
    expect(validateActivity({ ...base, name: '  ' }, []).ok).toBe(false);
  });
});
