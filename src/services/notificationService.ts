import { Linking, Platform } from 'react-native';
import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  AuthorizationStatus,
  Notification,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from 'react-native-notify-kit';
import { getBellSound } from '../data/defaultTimetable';
import {
  Activity,
  AlarmSettings,
  BellEvent,
  BellSoundId,
} from '../models/types';
import { PermissionState } from '../store/useAlarmStore';
import { getAccent } from '../theme/theme';
import { buildBellEvents } from '../utils/schedule';
import { formatMinutes, formatRange, nextOccurrence } from '../utils/time';

export const NOTIFICATION_ID_PREFIX = 'db-';
export const IOS_CATEGORY_ID = 'dailybell-bell';
export const ACTION_ACKNOWLEDGE = 'acknowledge';
export const ACTION_DISMISS = 'dismiss';

/** Three pulses, matching the three rings of every bell sound. */
const VIBRATION = [300, 400, 250, 400, 250, 400];

/**
 * Every bell sound rings exactly 3 times and then stops (see
 * scripts/generate-bells.py). Notifications never loop or repeat.
 * Bump this when sounds or vibration change: Android channels can't be edited.
 */
export const CHANNEL_VERSION = 'v2';

/**
 * Android notification channels lock sound + vibration once created, so each
 * combination gets its own channel. Switching sound in Settings just moves the
 * scheduled notifications to another channel.
 */
const channelIdFor = (sound: BellSoundId, vibrate: boolean) =>
  `dailybell_${sound}_${vibrate ? 'vib' : 'novib'}_${CHANNEL_VERSION}`;

let staleRemoved = false;
/** Deletes channels from older versions so users don't see duplicates in system settings. */
const removeStaleChannels = async () => {
  if (staleRemoved) return;
  staleRemoved = true;
  try {
    const channels = await notifee.getChannels();
    await Promise.all(
      channels
        .filter(
          c =>
            c.id.startsWith('dailybell_') &&
            !c.id.endsWith(`_${CHANNEL_VERSION}`),
        )
        .map(c => notifee.deleteChannel(c.id)),
    );
  } catch {
    staleRemoved = false; // try again next sync
  }
};

const ensureAndroidChannel = async (sound: BellSoundId, vibrate: boolean) => {
  const id = channelIdFor(sound, vibrate);
  if (Platform.OS !== 'android') return id;
  await removeStaleChannels();
  await notifee.createChannel({
    id,
    name: `${getBellSound(sound).label}${vibrate ? ' + vibration' : ''}`,
    description: 'Timetable bell reminders',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound, // res/raw/<sound>.wav
    vibration: vibrate,
    vibrationPattern: vibrate ? VIBRATION : undefined,
  });
  return id;
};

const mapAuth = (status: AuthorizationStatus): PermissionState => {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    default:
      return 'not-determined';
  }
};

export interface PermissionInfo {
  permission: PermissionState;
  /** Android 12+: exact alarms permission ("Alarms & reminders"). */
  exactAlarmAllowed: boolean;
}

export const notificationService = {
  async init() {
    if (Platform.OS === 'ios') {
      await notifee.setNotificationCategories([
        {
          id: IOS_CATEGORY_ID,
          actions: [
            { id: ACTION_ACKNOWLEDGE, title: 'Got it' },
            { id: ACTION_DISMISS, title: 'Dismiss', destructive: true },
          ],
        },
      ]);
    }
  },

  async getPermissionInfo(): Promise<PermissionInfo> {
    const settings = await notifee.getNotificationSettings();
    return {
      permission: mapAuth(settings.authorizationStatus),
      exactAlarmAllowed:
        Platform.OS !== 'android' ||
        settings.android.alarm !== AndroidNotificationSetting.DISABLED,
    };
  },

  async requestPermission(): Promise<PermissionInfo> {
    await notifee.requestPermission({ alert: true, sound: true, badge: false });
    return this.getPermissionInfo();
  },

  async openSettings() {
    try {
      await notifee.openNotificationSettings();
    } catch {
      await Linking.openSettings();
    }
  },

  async openExactAlarmSettings() {
    if (Platform.OS === 'android') await notifee.openAlarmPermissionSettings();
  },

  async getScheduledIds(): Promise<string[]> {
    const ids = await notifee.getTriggerNotificationIds();
    return ids.filter(id => id.startsWith(NOTIFICATION_ID_PREFIX));
  },

  async cancelAll() {
    const ids = await this.getScheduledIds();
    if (ids.length) await notifee.cancelTriggerNotifications(ids);
    const shown = await notifee.getDisplayedNotifications();
    const shownIds = shown
      .map(n => n.id)
      .filter(
        (id): id is string => !!id && id.startsWith(NOTIFICATION_ID_PREFIX),
      );
    if (shownIds.length) await notifee.cancelDisplayedNotifications(shownIds);
  },

  async cancelDisplayed(id: string) {
    await notifee.cancelDisplayedNotification(id).catch(() => undefined);
  },

  /**
   * Makes the OS schedule match the timetable exactly:
   *  - one daily-repeating native trigger per bell moment (stable ids → no duplicates)
   *  - stale ids (deleted activities, end bells turned off) are cancelled
   * Native triggers fire with the app backgrounded or killed; Android restores
   * them after reboot, iOS keeps them across reboots.
   */
  async sync(activities: Activity[], settings: AlarmSettings): Promise<number> {
    if (!settings.alarmsEnabled) {
      await this.cancelAll();
      return 0;
    }

    const { permission, exactAlarmAllowed } = await this.getPermissionInfo();
    if (permission === 'denied') {
      await this.cancelAll();
      return 0;
    }

    const events = buildBellEvents(activities, settings.ringAtEnd);
    const wanted = new Set(events.map(e => e.id));
    const existing = await this.getScheduledIds();
    const stale = existing.filter(id => !wanted.has(id));
    if (stale.length) await notifee.cancelTriggerNotifications(stale);

    const channelId = await ensureAndroidChannel(
      settings.bellSound,
      settings.vibrationEnabled,
    );
    const soundFile = getBellSound(settings.bellSound).fileName;
    const now = new Date();

    for (const event of events) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextOccurrence(event.minute, now).getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: {
          type: exactAlarmAllowed
            ? AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE
            : AlarmType.SET_AND_ALLOW_WHILE_IDLE,
        },
      };
      // Same id replaces the previous trigger rather than adding another.
      await notifee.createTriggerNotification(
        buildNotification(
          event,
          channelId,
          soundFile,
          getAccent(settings.accent).color,
        ),
        trigger,
      );
    }
    return events.length;
  },
};

const buildNotification = (
  event: BellEvent,
  channelId: string,
  soundFile: string,
  accentColor: string,
): Notification => {
  const { activity, nextActivity, kind } = event;
  const title =
    kind === 'start' ? `🔔 ${activity.name}` : `🔔 ${activity.name} finished`;
  const body =
    kind === 'start'
      ? `Starts now · ${formatRange(
          activity.startMinutes,
          activity.endMinutes,
        )}`
      : nextActivity
      ? `Next: ${nextActivity.name} at ${formatMinutes(
          nextActivity.startMinutes,
        )}`
      : 'That was the last activity for today. Well done!';

  return {
    id: event.id,
    title,
    body,
    data: {
      eventId: event.id,
      kind,
      activityId: activity.id,
      minute: String(event.minute),
    },
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_stat_bell',
      color: accentColor,
      autoCancel: true,
      showTimestamp: true,
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: 'Got it', pressAction: { id: ACTION_ACKNOWLEDGE } },
        { title: 'Dismiss', pressAction: { id: ACTION_DISMISS } },
      ],
    },
    ios: {
      categoryId: IOS_CATEGORY_ID,
      sound: soundFile,
      // 'timeSensitive' needs the Time Sensitive capability on a paid team; see README.
      interruptionLevel: 'active',
      // In the foreground the app rings its own bell + shows an in-app alarm,
      // so suppress the system banner/sound to avoid a double bell.
      foregroundPresentationOptions: {
        banner: false,
        list: true,
        sound: false,
        badge: false,
      },
    },
  };
};
