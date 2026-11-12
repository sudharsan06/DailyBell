import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Activity } from '../models/types';
import { useTheme } from '../theme/ThemeContext';
import { formatDuration, formatRange } from '../utils/time';
import { Card } from './Card';

export const NextActivityCard = ({ next }: { next?: Activity }) => {
  const t = useTheme();
  if (!next) return null;
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: t.colors.warningSoft }]}>
        <Text style={styles.iconText}>⏭</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: t.colors.textFaint }]}>
          UP NEXT
        </Text>
        <Text style={[styles.name, { color: t.colors.text }]} numberOfLines={1}>
          {next.name}
        </Text>
        <Text style={[styles.meta, { color: t.colors.textMuted }]}>
          {formatRange(next.startMinutes, next.endMinutes)} ·{' '}
          {formatDuration(next.endMinutes - next.startMinutes)}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18 },
  body: { flex: 1 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  name: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 13, marginTop: 2 },
});
