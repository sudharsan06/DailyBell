import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { Activity } from '../models/types';
import { RootStackParamList } from '../navigation/types';
import { useTimetableStore } from '../store/useTimetableStore';
import { useTheme } from '../theme/ThemeContext';
import { validateActivity } from '../utils/schedule';
import {
  dateToMinutes,
  formatDuration,
  formatMinutes,
  minutesOfDate,
  minutesToDate,
} from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'EditActivity'>;
type Field = 'start' | 'end';

const newId = () =>
  `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface TimeFieldProps {
  label: string;
  value: number;
  open: boolean;
  onToggle: () => void;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
}

const TimeField = ({
  label,
  value,
  open,
  onToggle,
  onChange,
}: TimeFieldProps) => {
  const t = useTheme();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${formatMinutes(value)}`}
        style={({ pressed }) => [
          styles.timeRow,
          {
            borderColor: open ? t.colors.primary : t.colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.timeLabel, { color: t.colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.timeValue, { color: t.colors.text }]}>
          {formatMinutes(value)}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={minutesToDate(value)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={onChange}
          themeVariant={t.dark ? 'dark' : 'light'}
        />
      )}
    </View>
  );
};

export const EditActivityScreen = ({ navigation, route }: Props) => {
  const t = useTheme();
  const activities = useTimetableStore(s => s.activities);
  const upsert = useTimetableStore(s => s.upsertActivity);
  const remove = useTimetableStore(s => s.removeActivity);
  const editingId = route.params?.activityId;
  const original = activities.find(a => a.id === editingId);

  // Computed once per screen: the store changing underneath (e.g. a sync or a
  // save) must not hand a new activity a different id mid-edit.
  const [defaults] = useState<Activity>(() => {
    if (original) return original;
    // Default to the later of: end of the last activity, or the next 5-minute slot from now.
    const last = activities[activities.length - 1];
    const nextSlot = Math.ceil((minutesOfDate(new Date()) + 1) / 5) * 5;
    const start = Math.min(Math.max(last?.endMinutes ?? 0, nextSlot), 23 * 60);
    return {
      id: newId(),
      name: '',
      startMinutes: start,
      endMinutes: Math.min(start + 30, 23 * 60 + 59),
    };
  });

  const [name, setName] = useState(defaults.name);
  const [start, setStart] = useState(defaults.startMinutes);
  const [end, setEnd] = useState(defaults.endMinutes);
  const [picker, setPicker] = useState<Field | null>(null);
  const [error, setError] = useState<string>();

  const candidate: Activity = {
    id: defaults.id,
    name: name.trim(),
    startMinutes: start,
    endMinutes: end,
  };

  // Guards against double taps closing two screens.
  const closing = useRef(false);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    navigation.goBack();
  };

  const save = () => {
    if (closing.current) return;
    const result = validateActivity(candidate, activities);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    upsert(candidate);
    close();
  };

  const confirmDelete = () => {
    if (!original) return;
    Alert.alert(
      'Delete activity?',
      `"${original.name}" and its bell will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (closing.current) return;
            remove(original.id);
            close();
          },
        },
      ],
    );
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Header buttons call through a ref so options are set once, not every render
  // (setOptions on every render re-renders the navigator in a loop).
  const saveRef = useRef(save);
  saveRef.current = save;
  const isEditing = !!original;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit activity' : 'New activity',
      // Centre the title on Android too, so it never sits against "Cancel".
      headerTitleAlign: 'center',
      headerLeft: () => (
        <Pressable
          onPress={() => closeRef.current()}
          hitSlop={10}
          accessibilityRole="button"
          style={styles.headerBtnWrap}
        >
          <Text style={[styles.headerBtn, { color: t.colors.textMuted }]}>
            Cancel
          </Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => saveRef.current()}
          hitSlop={10}
          accessibilityRole="button"
          style={[styles.headerBtnWrap, styles.headerBtnRight]}
        >
          <Text
            style={[styles.headerBtn, styles.bold, { color: t.colors.primary }]}
          >
            Save
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, isEditing, t]);

  const onPick =
    (field: Field) => (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') setPicker(null);
      if (event.type === 'dismissed' || !date) return;
      const m = dateToMinutes(date);
      field === 'start' ? setStart(m) : setEnd(m);
      setError(undefined);
    };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={[styles.label, { color: t.colors.textMuted }]}>
            Activity name
          </Text>
          <TextInput
            value={name}
            onChangeText={v => {
              setName(v);
              setError(undefined);
            }}
            placeholder="e.g. Deep work"
            placeholderTextColor={t.colors.textFaint}
            style={[
              styles.input,
              {
                color: t.colors.text,
                borderColor: t.colors.border,
                backgroundColor: t.colors.surfaceAlt,
              },
            ]}
            maxLength={60}
            returnKeyType="done"
            autoFocus={!original}
          />

          <View style={styles.spacer} />
          <TimeField
            label="Starts"
            value={start}
            open={picker === 'start'}
            onToggle={() => setPicker(picker === 'start' ? null : 'start')}
            onChange={onPick('start')}
          />
          <View style={styles.spacerSm} />
          <TimeField
            label="Ends"
            value={end}
            open={picker === 'end'}
            onToggle={() => setPicker(picker === 'end' ? null : 'end')}
            onChange={onPick('end')}
          />

          <Text style={[styles.duration, { color: t.colors.textMuted }]}>
            {end > start
              ? `Duration ${formatDuration(end - start)}`
              : 'End must be after start'}
          </Text>
          {!!error && (
            <Text style={[styles.error, { color: t.colors.danger }]}>
              {error}
            </Text>
          )}
        </Card>

        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.saveText, { color: t.colors.onPrimary }]}>
            Save activity
          </Text>
        </Pressable>

        {original && (
          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={[styles.deleteText, { color: t.colors.danger }]}>
              Delete activity
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  headerBtnWrap: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 64 },
  headerBtnRight: { alignItems: 'flex-end' },
  headerBtn: { fontSize: 16 },
  bold: { fontWeight: '700' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  spacer: { height: 18 },
  spacerSm: { height: 10 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  timeLabel: { fontSize: 15, fontWeight: '600' },
  timeValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  duration: { fontSize: 13, marginTop: 12 },
  error: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  saveBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '800' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { fontSize: 15, fontWeight: '700' },
});
