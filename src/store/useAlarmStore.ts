import { create } from 'zustand';
import { ActiveAlarm } from '../models/types';

export type PermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'not-determined';

interface AlarmState {
  activeAlarm?: ActiveAlarm;
  /** Keys of bell moments already handled in-app, so one moment rings once. */
  handledKeys: string[];
  permission: PermissionState;
  exactAlarmAllowed: boolean;
  scheduledCount: number;
  lastSyncError?: string;
  showAlarm: (alarm: ActiveAlarm) => void;
  clearAlarm: () => void;
  markHandled: (key: string) => boolean;
  setStatus: (
    patch: Partial<
      Pick<
        AlarmState,
        'permission' | 'exactAlarmAllowed' | 'scheduledCount' | 'lastSyncError'
      >
    >,
  ) => void;
}

export const useAlarmStore = create<AlarmState>()((set, get) => ({
  activeAlarm: undefined,
  handledKeys: [],
  permission: 'unknown',
  exactAlarmAllowed: true,
  scheduledCount: 0,
  showAlarm: alarm => set({ activeAlarm: alarm }),
  clearAlarm: () => set({ activeAlarm: undefined }),
  /** Returns true if the key was newly marked (i.e. caller should ring). */
  markHandled: key => {
    if (get().handledKeys.includes(key)) return false;
    set(s => ({ handledKeys: [...s.handledKeys.slice(-50), key] }));
    return true;
  },
  setStatus: patch => set(patch),
}));
