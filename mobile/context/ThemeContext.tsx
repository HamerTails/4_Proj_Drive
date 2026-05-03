import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
};

export const lightColors = {
  bg:          '#f3f4f6',
  card:        '#ffffff',
  border:      '#e5e7eb',
  text:        '#111827',
  textMuted:   '#6b7280',
  textLight:   '#9ca3af',
  primary:     '#2563eb',
  primaryBg:   '#eff6ff',
  danger:      '#dc2626',
  success:     '#16a34a',
  inputBg:     '#f9fafb',
  headerBg:    '#ffffff',
  tabBar:      '#ffffff',
};

export const darkColors: typeof lightColors = {
  bg:          '#000000',
  card:        '#111111',
  border:      '#333333',
  text:        '#f5f5f5',
  textMuted:   '#888888',
  textLight:   '#555555',
  primary:     '#3b82f6',
  primaryBg:   '#0c1a2e',
  danger:      '#ef4444',
  success:     '#22c55e',
  inputBg:     '#1a1a1a',
  headerBg:    '#0a0a0a',
  tabBar:      '#161616',
};

const ThemeContext = createContext<ThemeContextType>({
  theme:       'light',
  toggleTheme: () => {},
  colors:      lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
      // Sinon on garde 'light' par défaut (pas de switch automatique selon le système)
    });
  }, []);

  const toggleTheme = () => {
    console.log('[Theme] toggleTheme called');
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      console.log('[Theme] Switching from', prev, 'to', next);
      AsyncStorage.setItem('theme', next).catch(() => {});
      return next;
    });
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}