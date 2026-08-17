// app/_layout.tsx
// Root layout: loads Cairo fonts + persisted state in parallel behind the
// splash screen, then mounts the theme provider and the router stack.

import React, { useEffect } from 'react';
import { I18nManager, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Cairo_400Regular, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { loadSettings } from '../src/store/settings';
import { loadChat } from '../src/store/chat';
import { loadModels } from '../src/store/models';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cairo_400Regular, Cairo_700Bold });

  useEffect(() => {
    void Promise.all([loadSettings(), loadChat(), loadModels()]);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null; // splash still covering

  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  );
}

function RootStack() {
  const { colors, dark } = useTheme();
  const scheme = useColorScheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="privacy" />
      </Stack>
    </>
  );
}
