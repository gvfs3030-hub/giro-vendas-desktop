// [LOCAL] — contexto de tema claro/escuro
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '../platform/storage';
import { Colors } from '../constants/theme';
import type { ThemeMode } from '../types';

type ColorScheme = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textCaption: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  danger: string;
  skeleton: string;
  tabBar: string;
  statusBar: 'light' | 'dark';
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorScheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  isDark: false,
  colors: Colors.light as ColorScheme,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setModeState(val);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('theme', m).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = (isDark ? Colors.dark : Colors.light) as ColorScheme;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
