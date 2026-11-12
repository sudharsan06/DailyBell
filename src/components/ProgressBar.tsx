import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  progress: number;
  color: string;
  track: string;
  height?: number;
}

export const ProgressBar = ({ progress, color, track, height = 8 }: Props) => (
  <View
    style={[
      styles.track,
      { backgroundColor: track, height, borderRadius: height / 2 },
    ]}
  >
    <View
      style={{
        width: `${Math.min(100, Math.max(0, progress * 100))}%`,
        backgroundColor: color,
        height,
        borderRadius: height / 2,
      }}
    />
  </View>
);

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
