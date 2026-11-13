import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  CHANNEL_VERSION,
  notificationService,
} from '../services/notificationService';
import { useAlarmStore } from '../store/useAlarmStore';
import {
  selectAlarmSettings,
  useSettingsStore,
} from '../store/useSettingsStore';
import { useTimetableStore } from '../store/useTimetableStore';
import { buildBellEvents, scheduleSignature } from '../utils/schedule';
import { timeZoneSignature } from '../utils/time';

/**
 * Keeps native scheduled notifications in sync with the timetable/settings.
 * Runs after storage hydration (restores alarms after restart), whenever the
 * timetable or alarm settings change, and when the app returns to the
 * foreground (catches permission changes, reboots and time-zone changes).
 */
export const useAlarmSync = () => {
  const activities = useTimetableStore(s => s.activities);
  const timetableHydrated = useTimetableStore(s => s.hydrated);
  const settingsHydrated = useSettingsStore(s => s.hydrated);
  const alarmsEnabled = useSettingsStore(s => s.alarmsEnabled);
  const vibrationEnabled = useSettingsStore(s => s.vibrationEnabled);
  const ringAtEnd = useSettingsStore(s => s.ringAtEnd);
  const bellSound = useSettingsStore(s => s.bellSound);
  const bellVolume = useSettingsStore(s => s.bellVolume);
  const accent = useSettingsStore(s => s.accent);
  const running = useRef<Promise<void> | null>(null);
  const pending = useRef(false);

  const sync = useCallback(async (force = false) => {
    if (running.current) {
      pending.current = true;
      return;
    }
    const run = async () => {
      const settingsState = useSettingsStore.getState();
      const settings = selectAlarmSettings(settingsState);
      const list = useTimetableStore.getState().activities;
      const setStatus = useAlarmStore.getState().setStatus;
      try {
        const perm = await notificationService.getPermissionInfo();
        setStatus({
          permission: perm.permission,
          exactAlarmAllowed: perm.exactAlarmAllowed,
        });

        const events = buildBellEvents(list, settings.ringAtEnd);
        const sig = scheduleSignature(
          settings.alarmsEnabled ? events : [],
          [
            CHANNEL_VERSION, // new sounds/channels force a reschedule
            settings.alarmsEnabled,
            settings.bellSound,
            settings.bellVolume,
            settings.vibrationEnabled,
            settings.accent,
            perm.permission,
            perm.exactAlarmAllowed,
            timeZoneSignature(),
          ].join(','),
        );
        const scheduledIds = await notificationService.getScheduledIds();
        const expected =
          settings.alarmsEnabled && perm.permission !== 'denied'
            ? events.length
            : 0;
        const upToDate =
          !force &&
          sig === settingsState.lastScheduleSignature &&
          scheduledIds.length === expected;

        if (!upToDate) {
          const count = await notificationService.sync(list, settings);
          useSettingsStore.getState().setLastScheduleSignature(sig);
          setStatus({ scheduledCount: count, lastSyncError: undefined });
        } else {
          setStatus({
            scheduledCount: scheduledIds.length,
            lastSyncError: undefined,
          });
        }
      } catch (e) {
        useSettingsStore.getState().setLastScheduleSignature(undefined);
        setStatus({
          lastSyncError: e instanceof Error ? e.message : String(e),
        });
      }
    };
    running.current = run();
    await running.current;
    running.current = null;
    if (pending.current) {
      pending.current = false;
      await sync(force);
    }
  }, []);

  const ready = timetableHydrated && settingsHydrated;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => sync(), 300);
    return () => clearTimeout(t);
  }, [
    ready,
    activities,
    alarmsEnabled,
    vibrationEnabled,
    ringAtEnd,
    bellSound,
    bellVolume,
    accent,
    sync,
  ]);

  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [ready, sync]);

  return { resync: () => sync(true) };
};
