import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { buildTheme, lightTheme, Theme } from './theme';

const ThemeContext = createContext<Theme>(lightTheme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const pref = useSettingsStore(s => s.theme);
  const accent = useSettingsStore(s => s.accent);
  const theme = useMemo(() => {
    const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
    return buildTheme(accent, dark);
  }, [pref, system, accent]);
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
