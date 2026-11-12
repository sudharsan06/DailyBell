import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  message: string;
  actionLabel: string;
  onPress: () => void;
}

export const PermissionBanner = ({ message, actionLabel, onPress }: Props) => {
  const t = useTheme();
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: t.colors.warningSoft,
          borderColor: t.colors.warning,
        },
      ]}
    >
      <Text style={[styles.text, { color: t.colors.text }]}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
        <Text style={[styles.action, { color: t.colors.warning }]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  text: { flex: 1, fontSize: 13, marginRight: 10, lineHeight: 18 },
  action: { fontSize: 13, fontWeight: '800' },
});
