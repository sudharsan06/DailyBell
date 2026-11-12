import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  title?: string;
  subtitle?: string;
}

const TRACK_W = 64;
const TRACK_H = 36;
const KNOB = 28;

/** Large, animated alarm switch used on the dashboard. */
export const AlarmToggle = ({
  value,
  onChange,
  title = 'Bell alarms',
  subtitle,
}: Props) => {
  const t = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 80,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, TRACK_W - KNOB - 4],
  });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [t.colors.surfaceAlt, t.colors.primary],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: value ? t.colors.primarySoft : t.colors.surfaceAlt,
          },
        ]}
      >
        <Text style={styles.iconText}>{value ? '🔔' : '🔕'}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: t.colors.text }]}>{title}</Text>
        {!!subtitle && (
          <Text
            style={[styles.subtitle, { color: t.colors.textMuted }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 20 },
  texts: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
