import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Activity, ActivityStatus } from '../models/types';
import { useTheme } from '../theme/ThemeContext';
import { formatDuration, formatMinutes } from '../utils/time';
import { ProgressBar } from './ProgressBar';

interface Props {
  activity: Activity;
  status: ActivityStatus;
  progress?: number;
  isFirst: boolean;
  isLast: boolean;
  onPress?: () => void;
}

/** One row of the vertical timeline: dot + rail + card. */
export const TimelineItem = ({
  activity,
  status,
  progress = 0,
  isFirst,
  isLast,
  onPress,
}: Props) => {
  const t = useTheme();
  const c = t.colors;
  const isCurrent = status === 'current';
  const isDone = status === 'completed';

  const dotColor = isCurrent ? c.primary : isDone ? c.success : c.border;
  const railTop = isFirst
    ? 'transparent'
    : isDone || isCurrent
    ? c.success
    : c.border;
  const railBottom = isLast ? 'transparent' : isDone ? c.success : c.border;

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.time,
          { color: isCurrent ? c.primary : isDone ? c.textFaint : c.textMuted },
          isCurrent && styles.timeCurrent,
        ]}
      >
        {formatMinutes(activity.startMinutes)}
      </Text>

      <View style={styles.rail}>
        <View style={[styles.railSeg, { backgroundColor: railTop }]} />
        <View
          style={[
            styles.dot,
            {
              borderColor: dotColor,
              backgroundColor: isDone ? c.success : c.surface,
            },
            isCurrent && {
              backgroundColor: c.primary,
              transform: [{ scale: 1.25 }],
            },
          ]}
        >
          {isDone && <Text style={styles.check}>✓</Text>}
        </View>
        <View style={[styles.railSeg, { backgroundColor: railBottom }]} />
      </View>

      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${activity.name}, ${status}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isCurrent ? c.primarySoft : c.surface,
            borderColor: isCurrent ? c.primary : c.border,
            borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
            opacity: isDone ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <Text
            style={[
              styles.name,
              { color: c.text },
              isDone && styles.nameDone,
              isCurrent && styles.nameCurrent,
            ]}
            numberOfLines={2}
          >
            {activity.name}
          </Text>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: isCurrent
                  ? c.primary
                  : isDone
                  ? c.successSoft
                  : c.surfaceAlt,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                {
                  color: isCurrent
                    ? c.onPrimary
                    : isDone
                    ? c.success
                    : c.textMuted,
                },
              ]}
            >
              {isCurrent
                ? 'Now'
                : isDone
                ? 'Done'
                : formatDuration(activity.endMinutes - activity.startMinutes)}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {formatMinutes(activity.startMinutes)} –{' '}
          {formatMinutes(activity.endMinutes)}
        </Text>
        {isCurrent && (
          <View style={styles.progress}>
            <ProgressBar
              progress={progress}
              color={c.primary}
              track={c.border}
              height={5}
            />
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 76 },
  time: {
    width: 64,
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 18,
    textAlign: 'right',
  },
  timeCurrent: { fontWeight: '800' },
  rail: { width: 28, alignItems: 'center' },
  railSeg: { width: 2, flex: 1 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 11 },
  card: { flex: 1, borderRadius: 14, padding: 12, marginVertical: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { flex: 1, fontSize: 15, fontWeight: '600', marginRight: 8 },
  nameDone: { textDecorationLine: 'line-through' },
  nameCurrent: { fontWeight: '800' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
  progress: { marginTop: 8 },
});
