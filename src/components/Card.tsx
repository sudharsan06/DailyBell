import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: Props) => {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderRadius: t.radius.lg,
          shadowOpacity: t.dark ? 0 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1A1D3A',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 1,
  },
});
