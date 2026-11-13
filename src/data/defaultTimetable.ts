import { Activity, BellSound, BellVolumeLevel } from '../models/types';
import { toMinutes } from '../utils/time';

const make = (
  id: string,
  name: string,
  start: string,
  end: string,
): Activity => ({
  id,
  name,
  startMinutes: toMinutes(start),
  endMinutes: toMinutes(end),
});

export const DEFAULT_TIMETABLE: Activity[] = [
  make('morning-routine', 'Morning Routine', '07:30', '08:30'),
  make('personal-time', 'Personal Time', '08:30', '09:30'),
  make('office-1', 'Office Work – Session 1', '09:30', '11:00'),
  make('short-break', 'Short Break', '11:00', '11:15'),
  make('office-2', 'Office Work – Session 2', '11:15', '12:45'),
  make('lunch', 'Lunch', '12:45', '13:15'),
  make('swimmingo', 'SwimminGO Development', '13:15', '15:15'),
  make('tea-break', 'Tea Break', '15:15', '15:30'),
  make('ai-learning', 'AI Learning / Interview Preparation', '15:30', '17:00'),
  make('mobile-free', 'Mobile Free Time', '17:00', '17:30'),
  make('palm-astro', 'Palm Astro Development', '17:30', '18:30'),
  make('daily-review', 'Daily Review', '18:30', '18:45'),
  make('buffer', 'Buffer Time', '18:45', '19:00'),
];

export const BELL_SOUNDS: BellSound[] = [
  {
    id: 'bell_school',
    label: 'School Bell',
    description: 'Classic hall bell · rings 3 times',
    fileName: 'bell_school.wav',
  },
  {
    id: 'bell_chime',
    label: 'Soft Chime',
    description: 'Three gentle rising strikes',
    fileName: 'bell_chime.wav',
  },
  {
    id: 'bell_digital',
    label: 'Digital Beep',
    description: 'Three short double-beeps',
    fileName: 'bell_digital.wav',
  },
];

export const getBellSound = (id: string): BellSound =>
  BELL_SOUNDS.find(s => s.id === id) ?? BELL_SOUNDS[0];

/**
 * Bell volume slider. Notification sounds can't be scaled at runtime, so every
 * step below Max ships as its own pre-attenuated file (<sound>_vol<step>.wav),
 * written by scripts/generate-bells.py with the same curve.
 */
export const MIN_BELL_VOLUME: BellVolumeLevel = 1;
export const MAX_BELL_VOLUME: BellVolumeLevel = 10;
/** Very low by default; the user turns it up in Settings. */
export const DEFAULT_BELL_VOLUME: BellVolumeLevel = 2;
/** Each step is this much louder (equal perceived steps). */
const DB_PER_STEP = 2.5;

export const isBellVolumeLevel = (v: unknown): v is BellVolumeLevel =>
  Number.isInteger(v) &&
  (v as number) >= MIN_BELL_VOLUME &&
  (v as number) <= MAX_BELL_VOLUME;

/** Linear amplitude 0..1 for a step (step 2 ≈ −20 dB, step 10 = 0 dB). */
export const bellVolumeGain = (level: BellVolumeLevel) =>
  Math.pow(10, (-(MAX_BELL_VOLUME - level) * DB_PER_STEP) / 20);

export const bellVolumeLabel = (level: BellVolumeLevel) =>
  level <= 2
    ? 'Very low'
    : level <= 4
    ? 'Low'
    : level <= 6
    ? 'Medium'
    : level <= 8
    ? 'High'
    : 'Max';

/** Notification sound resource name (no extension) for a sound at a volume. */
export const bellResourceName = (id: string, level: BellVolumeLevel) => {
  const base = getBellSound(id).id;
  return level === MAX_BELL_VOLUME ? base : `${base}_vol${level}`;
};

/** Bundled file name (with extension) for a sound at a volume. */
export const bellFileName = (id: string, level: BellVolumeLevel) =>
  `${bellResourceName(id, level)}.wav`;
