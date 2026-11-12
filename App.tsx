/**
 * DailyBell – personal timetable with bell reminders.
 *
 * @format
 */
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmModal } from './src/components/AlarmModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAlarmSync } from './src/hooks/useAlarmSync';
import { AppNavigator } from './src/navigation/AppNavigator';
import { registerForegroundHandler } from './src/services/alarmController';
import { bellService } from './src/services/bellService';
import { notificationService } from './src/services/notificationService';
import { widgetService } from './src/services/widgetService';
import { useAlarmStore } from './src/store/useAlarmStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { useTimetableStore } from './src/store/useTimetableStore';
import { buildTheme } from './src/theme/theme';
import { ThemeProvider } from './src/theme/ThemeContext';

const AlarmEngine = () => {
  useAlarmSync();
  const hydrated = useSettingsStore(s => s.hydrated);
  const bellSound = useSettingsStore(s => s.bellSound);
  const accent = useSettingsStore(s => s.accent);
  const activities = useTimetableStore(s => s.activities);
  const timetableHydrated = useTimetableStore(s => s.hydrated);

  useEffect(() => {
    notificationService.init().catch(() => undefined);
    return registerForegroundHandler();
  }, []);

  useEffect(() => {
    bellService.preload(bellSound);
  }, [bellSound]);

  // Keep the home-screen widget in step with the timetable and theme colour.
  useEffect(() => {
    if (!hydrated || !timetableHydrated) return;
    widgetService
      .update(activities, buildTheme(accent, false).colors.heroStart)
      .catch(() => undefined);
  }, [hydrated, timetableHydrated, activities, accent]);

  // First launch: ask for notification permission once, if alarms are on.
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      const info = await notificationService.getPermissionInfo();
      useAlarmStore.getState().setStatus(info);
      if (
        info.permission === 'not-determined' &&
        useSettingsStore.getState().alarmsEnabled
      ) {
        useAlarmStore
          .getState()
          .setStatus(await notificationService.requestPermission());
      }
    })().catch(() => undefined);
  }, [hydrated]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlarmEngine />
          <AppNavigator />
          <AlarmModal />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
