import { AppState } from 'react-native';
import notifee, { Event, EventType } from 'react-native-notify-kit';
import { ActiveAlarm, BellEvent } from '../models/types';
import { useAlarmStore } from '../store/useAlarmStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTimetableStore } from '../store/useTimetableStore';
import { buildBellEvents } from '../utils/schedule';
import { dateKey, secondsOfDate } from '../utils/time';
import { bellService } from './bellService';
import {
  ACTION_ACKNOWLEDGE,
  ACTION_DISMISS,
  notificationService,
} from './notificationService';

/** Window after a bell moment in which the foreground app still rings it. */
const RING_WINDOW_SECONDS = 60;

const alarmKey = (event: BellEvent, now: Date) => `${dateKey(now)}:${event.id}`;

/**
 * Foreground bell: called every second while the app is active. Rings each
 * bell moment at most once per day (handledKeys), independent of the OS
 * notification — which covers background / terminated states.
 */
export const checkForegroundBell = (now: Date) => {
  if (AppState.currentState !== 'active') return;
  const settings = useSettingsStore.getState();
  if (!settings.hydrated || !settings.alarmsEnabled) return;
  const { activities } = useTimetableStore.getState();
  const nowSec = secondsOfDate(now);

  const due = buildBellEvents(activities, settings.ringAtEnd).find(e => {
    const delta = nowSec - e.minute * 60;
    return delta >= 0 && delta < RING_WINDOW_SECONDS;
  });
  if (!due) return;

  const key = alarmKey(due, now);
  const alarms = useAlarmStore.getState();
  if (!alarms.markHandled(key)) return;

  const alarm: ActiveAlarm = { key, event: due, firedAt: now.getTime() };
  alarms.showAlarm(alarm);
  bellService.ring(settings.bellSound, settings.vibrationEnabled);
  // If the OS notification also arrived, remove it from the tray: the
  // in-app alarm is the one the user acknowledges.
  notificationService.cancelDisplayed(due.id);
};

/** Mark the moment as seen so it doesn't re-ring when the app opens. */
const markEventHandled = (eventId?: string) => {
  if (!eventId) return;
  const now = new Date();
  useAlarmStore.getState().markHandled(`${dateKey(now)}:${eventId}`);
};

export const acknowledgeAlarm = () => {
  const alarm = useAlarmStore.getState().activeAlarm;
  bellService.stop();
  if (alarm) notificationService.cancelDisplayed(alarm.event.id);
  useAlarmStore.getState().clearAlarm();
};

/** Shared handling for notification interactions (foreground & background). */
export const handleNotificationEvent = async ({ type, detail }: Event) => {
  const id = detail.notification?.id;
  const eventId = detail.notification?.data?.eventId as string | undefined;
  switch (type) {
    case EventType.ACTION_PRESS:
      if (
        detail.pressAction?.id === ACTION_ACKNOWLEDGE ||
        detail.pressAction?.id === ACTION_DISMISS
      ) {
        markEventHandled(eventId);
        if (id) await notifee.cancelDisplayedNotification(id);
      }
      break;
    case EventType.PRESS:
    case EventType.DISMISSED:
      markEventHandled(eventId);
      break;
    default:
      break;
  }
};

/** Foreground listener; returns unsubscribe. */
export const registerForegroundHandler = () =>
  notifee.onForegroundEvent(event => {
    handleNotificationEvent(event).catch(() => undefined);
    if (
      event.type === EventType.ACTION_PRESS &&
      useAlarmStore.getState().activeAlarm?.event.id ===
        event.detail.notification?.id
    ) {
      acknowledgeAlarm();
    }
  });
