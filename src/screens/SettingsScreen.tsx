import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { SettingRow } from '../components/SettingRow';
import { StepSlider } from '../components/StepSlider';
import {
  BELL_SOUNDS,
  MAX_BELL_VOLUME,
  MIN_BELL_VOLUME,
  bellVolumeLabel,
} from '../data/defaultTimetable';
import { RootStackParamList } from '../navigation/types';
import { BellVolumeLevel, ThemePreference } from '../models/types';
import { maybeShowSettingsInterstitial } from '../services/adsService';
import { bellService } from '../services/bellService';
import { notificationService } from '../services/notificationService';
import { WidgetStatus, widgetService } from '../services/widgetService';
import { useAlarmStore } from '../store/useAlarmStore';
import {
  selectAlarmSettings,
  useSettingsStore,
} from '../store/useSettingsStore';
import { useTimetableStore } from '../store/useTimetableStore';
import { ACCENTS } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const permissionLabel = {
  granted: 'Allowed',
  denied: 'Blocked',
  'not-determined': 'Not asked yet',
  unknown: 'Checking…',
} as const;

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const volumeText = (v: BellVolumeLevel) => `${v * 10}% · ${bellVolumeLabel(v)}`;

export const SettingsScreen = ({ navigation }: Props) => {
  const t = useTheme();
  const s = useSettingsStore();
  const {
    permission,
    exactAlarmAllowed,
    scheduledCount,
    lastSyncError,
    setStatus,
  } = useAlarmStore();

  const refreshPermission = useCallback(async () => {
    setStatus(await notificationService.getPermissionInfo());
  }, [setStatus]);

  const [widget, setWidget] = useState<WidgetStatus>();
  /** Slider position while dragging; saved (and previewed) on release. */
  const [draftVolume, setDraftVolume] = useState<BellVolumeLevel>();
  const refreshWidget = useCallback(async () => {
    setWidget(await widgetService.getStatus());
  }, []);

  // Each visit to Settings may show an interstitial (frequency-capped).
  useEffect(() => {
    maybeShowSettingsInterstitial();
  }, []);

  // Re-check when the user comes back from system Settings or the launcher.
  useEffect(() => {
    refreshWidget();
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return;
      refreshPermission();
      refreshWidget();
    });
    return () => sub.remove();
  }, [refreshPermission, refreshWidget]);

  const addWidget = async () => {
    if (widget?.pinSupported && (await widgetService.requestPin())) {
      // The launcher shows its own confirm dialog; recheck once it's handled.
      setTimeout(refreshWidget, 1500);
      return;
    }
    Alert.alert(
      'Add the DailyBell widget',
      '1. Long-press an empty spot on your home screen.\n2. Tap "Widgets".\n3. Find DailyBell and drag the widget onto your home screen.',
    );
  };

  const onPermissionPress = async () => {
    if (permission === 'not-determined') {
      setStatus(await notificationService.requestPermission());
    } else {
      notificationService.openSettings();
    }
  };

  const testBell = () =>
    bellService.ring(s.bellSound, s.bellVolume, s.vibrationEnabled);

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <SectionHeader title="Alarms" />
      <Card style={styles.groupCard}>
        <SettingRow
          title="Enable alarms"
          subtitle="Ring a bell when each activity starts"
          value={s.alarmsEnabled}
          onValueChange={async v => {
            s.update({ alarmsEnabled: v });
            if (v && permission !== 'granted')
              setStatus(await notificationService.requestPermission());
          }}
        />
        <SettingRow
          title="Ring when an activity ends"
          subtitle="Only when no other activity starts at that moment"
          value={s.ringAtEnd}
          onValueChange={v => s.update({ ringAtEnd: v })}
          disabled={!s.alarmsEnabled}
        />
        <SettingRow
          title="Vibration"
          subtitle={
            Platform.OS === 'ios'
              ? 'In-app vibration. Background vibration follows iOS sound settings.'
              : 'Vibrate with each bell'
          }
          value={s.vibrationEnabled}
          onValueChange={v => s.update({ vibrationEnabled: v })}
          disabled={!s.alarmsEnabled}
          last
        />
      </Card>

      <SectionHeader title="Bell sound" />
      <Card style={styles.groupCard}>
        {BELL_SOUNDS.map((sound, i) => {
          const selected = s.bellSound === sound.id;
          return (
            <SettingRow
              key={sound.id}
              title={sound.label}
              subtitle={sound.description}
              onPress={() => {
                s.update({ bellSound: sound.id });
                bellService.ring(sound.id, s.bellVolume, false);
              }}
              last={i === BELL_SOUNDS.length - 1}
              right={
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected
                        ? t.colors.primary
                        : t.colors.border,
                    },
                  ]}
                >
                  {selected && (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: t.colors.primary },
                      ]}
                    />
                  )}
                </View>
              }
            />
          );
        })}
      </Card>

      <SectionHeader title="Volume" />
      <Card>
        <Text style={[styles.cardTitle, { color: t.colors.text }]}>
          Bell volume
        </Text>
        <Text style={[styles.cardSubtitle, { color: t.colors.textMuted }]}>
          {volumeText(draftVolume ?? s.bellVolume)} · also limited by your
          phone's {Platform.OS === 'ios' ? 'ringer' : 'notification'} volume
        </Text>
        <View style={styles.volumeSlider}>
          <StepSlider
            value={s.bellVolume}
            min={MIN_BELL_VOLUME}
            max={MAX_BELL_VOLUME}
            accessibilityLabel="Bell volume"
            formatValue={v => volumeText(v as BellVolumeLevel)}
            onChange={v => setDraftVolume(v as BellVolumeLevel)}
            onComplete={v => {
              const level = v as BellVolumeLevel;
              setDraftVolume(undefined);
              s.update({ bellVolume: level });
              bellService.ring(s.bellSound, level, false);
            }}
          />
        </View>
      </Card>

      <Pressable
        onPress={testBell}
        style={({ pressed }) => [
          styles.testBtn,
          { backgroundColor: t.colors.primarySoft, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.testText, { color: t.colors.primary }]}>
          🔔 Test bell
        </Text>
      </Pressable>

      <SectionHeader title="Notifications" />
      <Card style={styles.groupCard}>
        <SettingRow
          title="Notification permission"
          subtitle={
            permission === 'denied'
              ? 'Blocked. Open settings to allow bells in the background.'
              : 'Needed for bells while DailyBell is closed'
          }
          onPress={onPermissionPress}
          right={
            <Text
              style={[
                styles.status,
                {
                  color:
                    permission === 'granted'
                      ? t.colors.success
                      : t.colors.warning,
                },
              ]}
            >
              {permissionLabel[permission]} ›
            </Text>
          }
        />
        {Platform.OS === 'android' && (
          <SettingRow
            title="Exact alarms"
            subtitle="Android 12+: lets bells ring on the minute instead of a few minutes late"
            onPress={() => notificationService.openExactAlarmSettings()}
            right={
              <Text
                style={[
                  styles.status,
                  {
                    color: exactAlarmAllowed
                      ? t.colors.success
                      : t.colors.warning,
                  },
                ]}
              >
                {exactAlarmAllowed ? 'Allowed' : 'Off'} ›
              </Text>
            }
          />
        )}
        <SettingRow
          title="Scheduled bells"
          subtitle={
            lastSyncError
              ? `Last sync failed: ${lastSyncError}`
              : 'Repeat every day at local time'
          }
          right={
            <Text style={[styles.status, { color: t.colors.textMuted }]}>
              {scheduledCount}
            </Text>
          }
          last
        />
      </Card>

      <SectionHeader title="Timetable" />
      <Card style={styles.groupCard}>
        <SettingRow
          title="Edit activities"
          subtitle="Rename, retime, add or delete"
          onPress={() => navigation.navigate('Timetable')}
          last
        />
      </Card>

      <SectionHeader title="Home screen widget" />
      <Card style={styles.groupCard}>
        {widget?.available === false ? (
          <SettingRow
            title="Widget"
            subtitle="Coming soon on iPhone"
            disabled
            last
          />
        ) : (
          <SettingRow
            title={
              widget?.installed
                ? 'Add another widget'
                : 'Add widget to home screen'
            }
            subtitle={
              widget?.installed
                ? `On your home screen (${widget.installed}) · tap it to open DailyBell`
                : 'See the current activity and countdown without opening the app'
            }
            onPress={addWidget}
            right={
              <Text style={[styles.status, { color: t.colors.primary }]}>
                {widget?.installed ? 'Added ✓' : 'Add'}
              </Text>
            }
            last
          />
        )}
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <Text style={[styles.cardTitle, { color: t.colors.text }]}>
          Theme colour
        </Text>
        <Text style={[styles.cardSubtitle, { color: t.colors.textMuted }]}>
          {ACCENTS.find(a => a.id === s.accent)?.label ?? 'Indigo'} · applies
          across the whole app
        </Text>
        <View style={styles.swatchGrid}>
          {ACCENTS.map(a => {
            const active = s.accent === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => s.update({ accent: a.id })}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${a.label} theme colour`}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.swatchCell,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.swatchRing,
                    active && { borderColor: a.color },
                  ]}
                >
                  <View style={[styles.swatch, { backgroundColor: a.color }]}>
                    {active && <Text style={styles.swatchCheck}>✓</Text>}
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.swatchLabel,
                    active && styles.swatchLabelActive,
                    { color: active ? t.colors.text : t.colors.textMuted },
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View
        style={[
          styles.segment,
          styles.segmentGap,
          { backgroundColor: t.colors.surfaceAlt },
        ]}
      >
        {THEMES.map(opt => {
          const active = s.theme === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => s.update({ theme: opt.id })}
              style={[
                styles.segmentItem,
                active && { backgroundColor: t.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? t.colors.text : t.colors.textMuted },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.note, { color: t.colors.textFaint }]}>
        Bells are delivered by your phone's notification system. Battery saver,
        Focus / Do Not Disturb, silent mode or disabled notifications can delay
        or silence them — DailyBell can't guarantee playback when the OS
        restricts it.
      </Text>

      <Pressable
        onPress={() =>
          Alert.alert('Reset alarms?', 'Cancels and reschedules every bell.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reschedule',
              onPress: async () => {
                await notificationService.cancelAll();
                const settings = selectAlarmSettings(
                  useSettingsStore.getState(),
                );
                const count = await notificationService.sync(
                  useTimetableStore.getState().activities,
                  settings,
                );
                useSettingsStore.getState().setLastScheduleSignature(undefined);
                setStatus({ scheduledCount: count });
              },
            },
          ])
        }
        style={styles.resetBtn}
      >
        <Text style={[styles.resetText, { color: t.colors.danger }]}>
          Reschedule all bells
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  groupCard: { paddingVertical: 0 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  testBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  testText: { fontSize: 15, fontWeight: '700' },
  status: { fontSize: 14, fontWeight: '700' },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segmentGap: { marginTop: 12 },
  volumeSlider: { marginTop: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -4,
  },
  swatchCell: { width: '20%', alignItems: 'center', paddingVertical: 6 },
  swatchRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  swatchLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  swatchLabelActive: { fontWeight: '800' },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 20, paddingHorizontal: 4 },
  resetBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  resetText: { fontSize: 14, fontWeight: '700' },
});
