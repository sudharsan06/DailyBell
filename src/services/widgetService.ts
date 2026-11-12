import { NativeModules, Platform } from 'react-native';
import { Activity } from '../models/types';

/**
 * Home-screen widget bridge (Android). iOS has no widget yet: that needs a
 * WidgetKit extension + App Group, which require a paid Apple team.
 */
interface NativeWidget {
  setData(json: string): Promise<void>;
  getStatus(): Promise<{ installed: number; pinSupported: boolean }>;
  requestPin(): Promise<boolean>;
}

const native: NativeWidget | undefined =
  Platform.OS === 'android' ? NativeModules.DailyBellWidget : undefined;

export interface WidgetStatus {
  /** The platform has a DailyBell widget at all. */
  available: boolean;
  /** Number of widgets currently on the home screen. */
  installed: number;
  /** The launcher supports the in-app "Add widget" dialog (Android 8+). */
  pinSupported: boolean;
}

let lastPayload: string | undefined;

export const widgetService = {
  available: !!native,

  /** Sends the timetable + colour; skipped when nothing changed. */
  async update(activities: Activity[], color: string) {
    if (!native) return;
    const payload = JSON.stringify({
      color,
      activities: activities.map(a => ({
        name: a.name,
        start: a.startMinutes,
        end: a.endMinutes,
      })),
    });
    if (payload === lastPayload) return;
    await native.setData(payload);
    lastPayload = payload;
  },

  async getStatus(): Promise<WidgetStatus> {
    if (!native) return { available: false, installed: 0, pinSupported: false };
    try {
      const s = await native.getStatus();
      return { available: true, ...s };
    } catch {
      return { available: true, installed: 0, pinSupported: false };
    }
  },

  /** Opens the launcher's "Add to home screen" dialog. False if unsupported. */
  async requestPin(): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.requestPin();
    } catch {
      return false;
    }
  },
};
