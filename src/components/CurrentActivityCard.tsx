import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Activity } from '../models/types';
import { useTheme } from '../theme/ThemeContext';
import { formatCountdown, formatDuration, formatRange } from '../utils/time';
import { ProgressBar } from './ProgressBar';

interface Props {
  current?: Activity;
  next?: Activity;
  secondsRemaining: number;
  progress: number;
}

/** Hero card: current activity, big countdown and progress. */
export const CurrentActivityCard = ({
  current,
  next,
  secondsRemaining,
  progress,
}: Props) => {
  const t = useTheme();
  const c = t.colors;
  const label = current ? 'NOW' : next ? 'FREE TIME' : 'NO ACTIVITIES';
  const title =
    current?.name ??
    (next ? 'Nothing scheduled right now' : 'Add an activity to begin');
  const caption = current ? 'remaining' : next ? `until ${next.name}` : '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.heroStart, borderRadius: t.radius.xl },
      ]}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: c.track }]}>
          {current && <View style={styles.liveDot} />}
          <Text style={[styles.badgeText, { color: c.heroText }]}>{label}</Text>
        </View>
        {current && (
          <Text style={[styles.duration, { color: c.heroMuted }]}>
            {formatDuration(current.endMinutes - current.startMinutes)}
          </Text>
        )}
      </View>

      <Text style={[styles.title, { color: c.heroText }]} numberOfLines={2}>
        {title}
      </Text>
      {current && (
        <Text style={[styles.range, { color: c.heroMuted }]}>
          {formatRange(current.startMinutes, current.endMinutes)}
        </Text>
      )}

      {(current || next) && (
        <View style={styles.countdownBlock}>
          <Text
            style={[styles.countdown, { color: c.heroText }]}
            accessibilityLabel={`${formatCountdown(
              secondsRemaining,
            )} ${caption}`}
          >
            {formatCountdown(secondsRemaining)}
          </Text>
          <Text
            style={[styles.caption, { color: c.heroMuted }]}
            numberOfLines={1}
          >
            {caption}
          </Text>
        </View>
      )}

      {current && (
        <ProgressBar progress={progress} color="#FFFFFF" track={c.track} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 22, overflow: 'hidden' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5CF0A8',
    marginRight: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  duration: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', marginTop: 14, lineHeight: 30 },
  range: { fontSize: 15, marginTop: 4, fontWeight: '500' },
  countdownBlock: { marginTop: 18, marginBottom: 16 },
  countdown: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  caption: { fontSize: 14, marginTop: -2 },
});
