import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_TIMETABLE } from '../data/defaultTimetable';
import { Activity } from '../models/types';
import { sanitizeActivities, sortActivities } from '../utils/schedule';
import { persistStorage } from './storage';

interface TimetableState {
  activities: Activity[];
  hydrated: boolean;
  upsertActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  resetToDefault: () => void;
}

export const useTimetableStore = create<TimetableState>()(
  persist(
    set => ({
      activities: DEFAULT_TIMETABLE,
      hydrated: false,
      upsertActivity: activity =>
        set(state => {
          const exists = state.activities.some(a => a.id === activity.id);
          const next = exists
            ? state.activities.map(a => (a.id === activity.id ? activity : a))
            : [...state.activities, activity];
          return { activities: sortActivities(next) };
        }),
      removeActivity: id =>
        set(state => ({
          activities: state.activities.filter(a => a.id !== id),
        })),
      resetToDefault: () => set({ activities: DEFAULT_TIMETABLE }),
    }),
    {
      name: 'dailybell.timetable.v1',
      storage: persistStorage,
      partialize: state => ({ activities: state.activities }),
      version: 2,
      // < v2: renamed default activities (v1 was an incomplete dev-only attempt). Only names still exactly equal
      // to the old default are changed, so user-edited names are kept.
      migrate: (persisted, version) => {
        const state = persisted as { activities?: unknown } | undefined;
        if (version < 2 && Array.isArray(state?.activities)) {
          const renames: Record<string, string> = {
            'SwimminGO Development': 'App 1',
            'AI Learning / Interview Preparation': 'Learning and Preparation',
            'Palm Astro Development': 'App 2',
          };
          state.activities = state.activities.map(a =>
            a &&
            typeof a === 'object' &&
            typeof a.name === 'string' &&
            renames[a.name]
              ? { ...a, name: renames[a.name] }
              : a,
          );
        }
        return state as TimetableState;
      },
      // Never trust storage blindly: a corrupted save falls back to defaults.
      merge: (persisted, current) => {
        const activities = sanitizeActivities(
          (persisted as { activities?: unknown } | undefined)?.activities,
        );
        return { ...current, activities: activities ?? current.activities };
      },
      onRehydrateStorage: () => () => {
        useTimetableStore.setState({ hydrated: true });
      },
    },
  ),
);
