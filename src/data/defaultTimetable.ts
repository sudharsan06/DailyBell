import { Activity, BellSound } from '../models/types';
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
