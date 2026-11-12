import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BELL_SOUNDS } from '../data/defaultTimetable';
import { AlarmSettings } from '../models/types';
import { DEFAULT_ACCENT, isAccentId } from '../theme/theme';
import { persistStorage } from './storage';

interface SettingsState extends AlarmSettings {
  hydrated: boolean;
  /** Signature of the last successfully scheduled set (dedupe across restarts). */
  lastScheduleSignature?: string;
  update: (patch: Partial<AlarmSettings>) => void;
  setLastScheduleSignature: (sig?: string) => void;
}

export const DEFAULT_SETTINGS: AlarmSettings = {
  alarmsEnabled: true,
  vibrationEnabled: true,
  ringAtEnd: true,
  bellSound: 'bell_school',
  theme: 'system',
  accent: DEFAULT_ACCENT,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      lastScheduleSignature: undefined,
      update: patch => set(patch),
      setLastScheduleSignature: sig => set({ lastScheduleSignature: sig }),
    }),
    {
      name: 'dailybell.settings.v1',
      storage: persistStorage,
      partialize: ({
        hydrated: _h,
        update: _u,
        setLastScheduleSignature: _s,
        ...rest
      }) => rest,
      // Keep only well-typed values from storage; anything else uses defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const bool = (k: keyof AlarmSettings) =>
          typeof p[k] === 'boolean' ? (p[k] as boolean) : current[k];
        return {
          ...current,
          alarmsEnabled: bool('alarmsEnabled') as boolean,
          vibrationEnabled: bool('vibrationEnabled') as boolean,
          ringAtEnd: bool('ringAtEnd') as boolean,
          bellSound: BELL_SOUNDS.some(s => s.id === p.bellSound)
            ? (p.bellSound as AlarmSettings['bellSound'])
            : current.bellSound,
          theme: ['system', 'light', 'dark'].includes(p.theme as string)
            ? (p.theme as AlarmSettings['theme'])
            : current.theme,
          accent: isAccentId(p.accent) ? p.accent : current.accent,
          lastScheduleSignature:
            typeof p.lastScheduleSignature === 'string'
              ? p.lastScheduleSignature
              : undefined,
        };
      },
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);

export const selectAlarmSettings = (s: SettingsState): AlarmSettings => ({
  alarmsEnabled: s.alarmsEnabled,
  vibrationEnabled: s.vibrationEnabled,
  ringAtEnd: s.ringAtEnd,
  bellSound: s.bellSound,
  theme: s.theme,
  accent: s.accent,
});
