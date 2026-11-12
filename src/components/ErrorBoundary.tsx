import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTimetableStore } from '../store/useTimetableStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  error?: Error;
}

/**
 * Last line of defence: a render error shows a recovery screen instead of
 * closing the app. Scheduled bells keep working (they live in the OS).
 * Kept free of theme/context hooks so it works even if those failed.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DailyBell] render error', error, info.componentStack);
  }

  private retry = () => this.setState({ error: undefined });

  private resetTimetable = () => {
    useTimetableStore.getState().resetToDefault();
    this.retry();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Your scheduled bells are unaffected. Try again, or restore the default
          timetable if the problem keeps coming back.
        </Text>
        <Pressable
          onPress={this.retry}
          style={[styles.btn, styles.primary]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
        <Pressable
          onPress={this.resetTimetable}
          style={styles.btn}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Restore default timetable</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F4F6FB',
  },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  btn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  primary: { backgroundColor: '#4F46E5' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
