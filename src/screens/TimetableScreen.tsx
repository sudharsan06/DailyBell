import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { useTimetableStore } from '../store/useTimetableStore';
import { useTheme } from '../theme/ThemeContext';
import { formatDuration, formatRange } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Timetable'>;

export const TimetableScreen = ({ navigation }: Props) => {
  const t = useTheme();
  const activities = useTimetableStore(s => s.activities);
  const removeActivity = useTimetableStore(s => s.removeActivity);
  const resetToDefault = useTimetableStore(s => s.resetToDefault);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('EditActivity', {})}
          hitSlop={10}
        >
          <Text style={[styles.headerBtn, { color: t.colors.primary }]}>
            Add
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, t]);

  const confirmDelete = (id: string, name: string) =>
    Alert.alert('Delete activity?', `"${name}" and its bell will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeActivity(id),
      },
    ]);

  const confirmReset = () =>
    Alert.alert(
      'Restore default timetable?',
      'Your changes will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: resetToDefault },
      ],
    );

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={[styles.hint, { color: t.colors.textMuted }]}>
        Tap an activity to rename or change its times. Bells reschedule
        automatically.
      </Text>
      <Card style={styles.list}>
        {activities.map((a, i) => (
          <Pressable
            key={a.id}
            onPress={() =>
              navigation.navigate('EditActivity', { activityId: a.id })
            }
            onLongPress={() => confirmDelete(a.id, a.name)}
            style={({ pressed }) => [
              styles.row,
              i < activities.length - 1 && {
                borderBottomColor: t.colors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[styles.index, { backgroundColor: t.colors.primarySoft }]}
            >
              <Text style={[styles.indexText, { color: t.colors.primary }]}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text
                style={[styles.name, { color: t.colors.text }]}
                numberOfLines={1}
              >
                {a.name}
              </Text>
              <Text style={[styles.meta, { color: t.colors.textMuted }]}>
                {formatRange(a.startMinutes, a.endMinutes)} ·{' '}
                {formatDuration(a.endMinutes - a.startMinutes)}
              </Text>
            </View>
            <Pressable
              onPress={() => confirmDelete(a.id, a.name)}
              hitSlop={10}
              accessibilityLabel={`Delete ${a.name}`}
            >
              <Text style={[styles.delete, { color: t.colors.danger }]}>✕</Text>
            </Pressable>
          </Pressable>
        ))}
        {activities.length === 0 && (
          <Text style={[styles.empty, { color: t.colors.textMuted }]}>
            No activities. Tap Add.
          </Text>
        )}
      </Card>
      <Pressable onPress={confirmReset} style={styles.reset}>
        <Text style={[styles.resetText, { color: t.colors.danger }]}>
          Restore default timetable
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
  flex: { flex: 1 },
  headerBtn: { fontSize: 16, fontWeight: '700' },
  hint: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  index: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  indexText: { fontSize: 13, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12.5, marginTop: 2 },
  delete: { fontSize: 16, fontWeight: '700', paddingLeft: 12 },
  empty: { paddingVertical: 20, textAlign: 'center' },
  reset: { alignItems: 'center', paddingVertical: 18 },
  resetText: { fontSize: 14, fontWeight: '700' },
});
