/** Minutes since local midnight (0–1439). */
export type MinuteOfDay = number;

export interface Activity {
  id: string;
  name: string;
  startMinutes: MinuteOfDay;
  endMinutes: MinuteOfDay;
}

export type ActivityStatus = 'completed' | 'current' | 'upcoming';

export type BellSoundId = 'bell_school' | 'bell_chime' | 'bell_digital';

export interface BellSound {
  id: BellSoundId;
  label: string;
  description: string;
  /** File name bundled in iOS main bundle / Android res/raw. */
  fileName: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type AccentId =
  | 'indigo'
  | 'aubergine'
  | 'purple'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'ocean'
  | 'graphite';

export interface AlarmSettings {
  alarmsEnabled: boolean;
  vibrationEnabled: boolean;
  ringAtEnd: boolean;
  bellSound: BellSoundId;
  theme: ThemePreference;
  accent: AccentId;
}

/** A single bell moment derived from the timetable. */
export interface BellEvent {
  /** Stable id: used as notification id so rescheduling never duplicates. */
  id: string;
  minute: MinuteOfDay;
  kind: 'start' | 'end';
  activity: Activity;
  /** Activity starting at this moment (if any), for "next up" copy. */
  nextActivity?: Activity;
}

export interface ScheduleSnapshot {
  current?: Activity;
  next?: Activity;
  /** Seconds left in current activity, or until next activity when idle. */
  secondsRemaining: number;
  /** 0..1 progress through the current activity. */
  progress: number;
  statusOf: (activity: Activity) => ActivityStatus;
}

export interface ActiveAlarm {
  key: string;
  event: BellEvent;
  firedAt: number;
}
