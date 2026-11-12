import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlarmToggle } from '../components/AlarmToggle';
import { Card } from '../components/Card';
import { CurrentActivityCard } from '../components/CurrentActivityCard';
import { NextActivityCard } from '../components/NextActivityCard';
import { PermissionBanner } from '../components/PermissionBanner';
import { SectionHeader } from '../components/SectionHeader';
import { TimelineItem } from '../components/TimelineItem';
import { useNow } from '../hooks/useNow';
import { useSchedule } from '../hooks/useSchedule';
import { RootStackParamList } from '../navigation/types';
import { checkForegroundBell } from '../services/alarmController';
import { notificationService } from '../services/notificationService';
import { useAlarmStore } from '../store/useAlarmStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../theme/ThemeContext';
import { formatMinutes } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(checkForegroundBell);
  const { activities, current, next, secondsRemaining, progress, statusOf } =
    useSchedule(now);

  const alarmsEnabled = useSettingsStore(s => s.alarmsEnabled);
  const updateSettings = useSettingsStore(s => s.update);
  const { permission, exactAlarmAllowed, scheduledCount, setStatus } =
    useAlarmStore();

  const completedCount = activities.filter(
    a => statusOf(a) === 'completed',
  ).length;

  const toggleAlarms = useCallback(
    async (value: boolean) => {
      updateSettings({ alarmsEnabled: value });
      if (value && permission !== 'granted') {
        const info = await notificationService.requestPermission();
        setStatus(info);
      }
    },
    [permission, setStatus, updateSettings],
  );

  const fixPermission = useCallback(async () => {
    if (permission === 'not-determined') {
      setStatus(await notificationService.requestPermission());
    } else {
      notificationService.openSettings();
    }
  }, [permission, setStatus]);

  const dateLine = now.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const dayLine = now.toLocaleDateString(undefined, { weekday: 'long' });
  const clock = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const alarmSubtitle = !alarmsEnabled
    ? 'Off — no bells or reminders'
    : permission === 'denied'
    ? 'Notifications blocked — bells only while app is open'
    : `${scheduledCount} daily bell${
        scheduledCount === 1 ? '' : 's'
      } scheduled${next ? ` · next ${formatMinutes(next.startMinutes)}` : ''}`;

  return (
    <View style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={[styles.day, { color: t.colors.primary }]}>
              {dayLine}
            </Text>
            <Text style={[styles.date, { color: t.colors.text }]}>
              {dateLine}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.clock, { color: t.colors.textMuted }]}>
              {clock}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: t.colors.surface,
                  borderColor: t.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.iconBtnText}>⚙️</Text>
            </Pressable>
          </View>
        </View>

        <CurrentActivityCard
          current={current}
          next={next}
          secondsRemaining={secondsRemaining}
          progress={progress}
        />

        <View style={styles.gap} />
        <NextActivityCard next={next} />

        <View style={styles.gap} />
        <Card>
          <AlarmToggle
            value={alarmsEnabled}
            onChange={toggleAlarms}
            subtitle={alarmSubtitle}
          />
        </Card>

        {alarmsEnabled &&
          permission !== 'granted' &&
          permission !== 'unknown' && (
            <View style={styles.bannerWrap}>
              <PermissionBanner
                message="Allow notifications so the bell can ring when DailyBell is in the background."
                actionLabel={
                  permission === 'not-determined' ? 'Allow' : 'Settings'
                }
                onPress={fixPermission}
              />
            </View>
          )}
        {alarmsEnabled && permission === 'granted' && !exactAlarmAllowed && (
          <View style={styles.bannerWrap}>
            <PermissionBanner
              message="Exact alarms are off, so Android may deliver bells a few minutes late."
              actionLabel="Allow"
              onPress={() => notificationService.openExactAlarmSettings()}
            />
          </View>
        )}

        <SectionHeader
          title={`Today's timetable · ${completedCount}/${activities.length}`}
          right={
            <Pressable
              onPress={() => navigation.navigate('Timetable')}
              hitSlop={8}
            >
              <Text style={[styles.edit, { color: t.colors.primary }]}>
                Edit
              </Text>
            </Pressable>
          }
        />
        {activities.length === 0 ? (
          <Card>
            <Text style={{ color: t.colors.textMuted }}>
              No activities yet. Tap Edit to add one.
            </Text>
          </Card>
        ) : (
          activities.map((a, i) => (
            <TimelineItem
              key={a.id}
              activity={a}
              status={statusOf(a)}
              progress={current?.id === a.id ? progress : 0}
              isFirst={i === 0}
              isLast={i === activities.length - 1}
              onPress={() =>
                navigation.navigate('EditActivity', { activityId: a.id })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  day: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  date: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  clock: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtnText: { fontSize: 18 },
  gap: { height: 12 },
  bannerWrap: { marginTop: 12 },
  edit: { fontSize: 14, fontWeight: '700' },
});
