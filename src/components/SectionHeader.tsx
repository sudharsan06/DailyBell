import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export const SectionHeader = ({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) => {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: t.colors.textMuted }]}>{title}</Text>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
