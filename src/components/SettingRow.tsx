import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
  last?: boolean;
}

export const SettingRow = ({
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  right,
  disabled,
  last,
}: Props) => {
  const t = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomColor: t.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.texts}>
        <Text style={[styles.title, { color: t.colors.text }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: t.colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {onValueChange ? (
        <Switch
          value={!!value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: t.colors.primary, false: t.colors.surfaceAlt }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={t.colors.surfaceAlt}
        />
      ) : (
        right ??
        (onPress ? (
          <Text style={[styles.chevron, { color: t.colors.textFaint }]}>›</Text>
        ) : null)
      )}
    </View>
  );
  if (onPress && !onValueChange) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 56,
  },
  texts: { flex: 1, marginRight: 12 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  chevron: { fontSize: 24, fontWeight: '300' },
  disabled: { opacity: 0.45 },
});
