// src/theme/ThemeProvider.tsx
// Light/dark theme that follows the OS setting. Cairo is loaded in app/_layout
// via @expo-google-fonts/cairo — the family names below must match those exports.

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  headerBg: string;
  headerText: string;
  userBubble: string;
  userBubbleText: string;
  botBubble: string;
  botBubbleText: string;
  inputBg: string;
  error: string;
  errorBg: string;
  success: string;
  warning: string;
}

export interface Theme {
  dark: boolean;
  font: string;
  fontBold: string;
  colors: ThemeColors;
}

export const FONT = 'Cairo_400Regular';
export const FONT_BOLD = 'Cairo_700Bold';

const light: ThemeColors = {
  background: '#f4f6fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f7',
  border: '#e3e7ee',
  text: '#1b1f27',
  textMuted: '#5f6672',
  primary: '#1a73e8',
  primarySoft: '#e8f0fe',
  onPrimary: '#ffffff',
  headerBg: '#1a73e8',
  headerText: '#ffffff',
  userBubble: '#1a73e8',
  userBubbleText: '#ffffff',
  botBubble: '#ffffff',
  botBubbleText: '#1b1f27',
  inputBg: '#ffffff',
  error: '#c5221f',
  errorBg: '#fce8e6',
  success: '#0d652e',
  warning: '#b06000',
};

const dark: ThemeColors = {
  background: '#101418',
  surface: '#1a2027',
  surfaceAlt: '#232b34',
  border: '#2c3540',
  text: '#e8eaf0',
  textMuted: '#9aa3b0',
  primary: '#8ab4f8',
  primarySoft: '#26313d',
  onPrimary: '#101418',
  headerBg: '#161b21',
  headerText: '#8ab4f8',
  userBubble: '#33527e',
  userBubbleText: '#e8eaf0',
  botBubble: '#1a2027',
  botBubbleText: '#e8eaf0',
  inputBg: '#1a2027',
  error: '#f28b82',
  errorBg: '#3a2321',
  success: '#81c995',
  warning: '#fdd663',
};

const ThemeContext = createContext<Theme>({
  dark: false,
  font: FONT,
  fontBold: FONT_BOLD,
  colors: light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo<Theme>(
    () => ({
      dark: scheme === 'dark',
      font: FONT,
      fontBold: FONT_BOLD,
      colors: scheme === 'dark' ? dark : light,
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
