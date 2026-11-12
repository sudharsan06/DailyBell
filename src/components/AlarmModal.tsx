import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { acknowledgeAlarm } from '../services/alarmController';
import { useAlarmStore } from '../store/useAlarmStore';
import { useTheme } from '../theme/ThemeContext';
import { formatMinutes, formatRange } from '../utils/time';

/** In-app alarm shown when a bell rings while the app is open. */
export const AlarmModal = () => {
  const t = useTheme();
  const alarm = useAlarmStore(s => s.activeAlarm);
  const swing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alarm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(swing, {
          toValue: -1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(swing, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [alarm, swing]);

  if (!alarm) return null;
  const { event } = alarm;
  const isStart = event.kind === 'start';
  const headline = isStart ? 'Time to start' : 'Activity finished';
  const title = event.activity.name;
  const detail = isStart
    ? formatRange(event.activity.startMinutes, event.activity.endMinutes)
    : event.nextActivity
    ? `Next: ${event.nextActivity.name} at ${formatMinutes(
        event.nextActivity.startMinutes,
      )}`
    : 'That was the last activity today.';

  const rotate = swing.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={acknowledgeAlarm}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
          <Animated.Text style={[styles.bell, { transform: [{ rotate }] }]}>
            🔔
          </Animated.Text>
          <Text style={[styles.headline, { color: t.colors.primary }]}>
            {headline}
          </Text>
          <Text style={[styles.title, { color: t.colors.text }]}>{title}</Text>
          <Text style={[styles.detail, { color: t.colors.textMuted }]}>
            {detail}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={acknowledgeAlarm}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: t.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: t.colors.onPrimary }]}>
              Got it
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={acknowledgeAlarm}
            style={styles.secondaryBtn}
          >
            <Text style={[styles.secondaryText, { color: t.colors.textMuted }]}>
              Dismiss
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,10,20,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  bell: { fontSize: 56 },
  headline: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  detail: { fontSize: 15, textAlign: 'center', marginTop: 6 },
  primaryBtn: {
    marginTop: 24,
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
