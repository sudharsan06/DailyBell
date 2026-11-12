import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { EditActivityScreen } from '../screens/EditActivityScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { useTheme } from '../theme/ThemeContext';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const t = useTheme();
  const navTheme = useMemo(() => {
    const base = t.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.primary,
        background: t.colors.background,
        card: t.colors.background,
        text: t.colors.text,
        border: t.colors.border,
      },
    };
  }, [t]);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: t.colors.primary,
          headerTitleStyle: { color: t.colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: t.colors.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Timetable"
          component={TimetableScreen}
          options={{ title: 'Edit timetable' }}
        />
        <Stack.Screen
          name="EditActivity"
          component={EditActivityScreen}
          options={{ presentation: 'modal', title: 'Activity' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
