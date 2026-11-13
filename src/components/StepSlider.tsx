import React, { useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: number;
  min: number;
  max: number;
  /** Called while dragging (each time the step changes). */
  onChange?: (v: number) => void;
  /** Called once the finger lifts, or on a −/+ tap. */
  onComplete: (v: number) => void;
  accessibilityLabel: string;
  formatValue?: (v: number) => string;
}

const THUMB = 26;

/** Stepped horizontal slider with −/+ buttons. Pure JS: no native module. */
export const StepSlider = ({
  value,
  min,
  max,
  onChange,
  onComplete,
  accessibilityLabel,
  formatValue = String,
}: Props) => {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number>();
  const shown = dragValue ?? value;

  // Refs so the (created-once) PanResponder always sees current values.
  const live = useRef({
    width,
    min,
    max,
    value,
    onChange,
    onComplete,
    last: value,
  });
  live.current = {
    ...live.current,
    width,
    min,
    max,
    value,
    onChange,
    onComplete,
  };

  const valueAt = (x: number) => {
    const { width: w, min: lo, max: hi } = live.current;
    const usable = Math.max(1, w - THUMB);
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / usable));
    return Math.round(lo + ratio * (hi - lo));
  };

  // Gesture: horizontal drag moves the thumb; a still tap jumps to that step;
  // a vertical swipe is handed to the parent ScrollView and changes nothing.
  const gesture = useRef({ startX: 0, dragging: false });
  const isHorizontal = (dx: number, dy: number) =>
    Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy);
  const isTap = (dx: number, dy: number) =>
    Math.abs(dx) < 6 && Math.abs(dy) < 6;

  const pan = useMemo(
    () => {
      const preview = (v: number) => {
        if (v === live.current.last) return;
        live.current.last = v;
        setDragValue(v);
        live.current.onChange?.(v);
      };
      const finish = (commit: boolean) => {
        const { last, value: committed } = live.current;
        gesture.current.dragging = false;
        setDragValue(undefined);
        if (commit && last !== committed) live.current.onComplete(last);
        else live.current.last = committed;
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => isHorizontal(g.dx, g.dy),
        // Let the ScrollView take over a vertical swipe.
        onPanResponderTerminationRequest: () => !gesture.current.dragging,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          gesture.current = { startX: e.nativeEvent.locationX, dragging: false };
          live.current.last = live.current.value;
        },
        onPanResponderMove: (_, g) => {
          if (!gesture.current.dragging && !isHorizontal(g.dx, g.dy)) return;
          gesture.current.dragging = true;
          preview(valueAt(gesture.current.startX + g.dx));
        },
        onPanResponderRelease: (_, g) => {
          if (!gesture.current.dragging && isTap(g.dx, g.dy)) {
            preview(valueAt(gesture.current.startX));
          }
          finish(true);
        },
        onPanResponderTerminate: () => finish(false),
      });
    },
    [],
  );

  const step = (delta: number) => {
    const v = Math.min(max, Math.max(min, value + delta));
    if (v !== value) onComplete(v);
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') step(1);
    if (e.nativeEvent.actionName === 'decrement') step(-1);
  };

  const ratio = (shown - min) / (max - min);
  const thumbLeft = ratio * Math.max(0, width - THUMB);

  const button = (label: string, delta: number, disabled: boolean) => (
    <Pressable
      onPress={() => step(delta)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Increase volume' : 'Decrease volume'}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: t.colors.surfaceAlt },
        { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.stepText, { color: t.colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button('−', -1, value <= min)}
      <View
        style={styles.trackArea}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: shown, text: formatValue(shown) }}
        accessibilityActions={[
          { name: 'increment' },
          { name: 'decrement' },
        ]}
        onAccessibilityAction={onAccessibilityAction}
        {...pan.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[styles.track, { backgroundColor: t.colors.surfaceAlt }]}
        >
          <View
            style={[
              styles.fill,
              {
                width: thumbLeft + THUMB / 2,
                backgroundColor: t.colors.primary,
              },
            ]}
          />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: t.colors.surface,
              borderColor: t.colors.primary,
            },
          ]}
        />
      </View>
      {button('+', 1, value >= max)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackArea: { flex: 1, height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
