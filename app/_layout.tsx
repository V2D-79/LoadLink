/**
 * app/_layout.tsx
 *
 * Root layout:
 * 1. Polyfill for tweetnacl CSPRNG (must be first import)
 * 2. i18n initialization
 * 3. Load custom fonts
 * 4. Auth context provider
 * 5. Error boundary
 * 6. Splash screen management
 * 7. Gesture handler root
 */

import 'react-native-get-random-values';
import '../src/i18n'; // side-effect: sets up i18next

// Suppress Firebase Auth's "no AsyncStorage" warning — we use localStorage polyfill instead.
// Must run before firebase.ts is first evaluated.
const _cw = console.warn;
console.warn = (...a: any[]) => {
  if (typeof a[0] === 'string' && a[0].includes('initializeAuth') && a[0].includes('AsyncStorage')) return;
  _cw(...a);
};

import React, { useCallback, useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';

import { AuthProvider } from '../src/hooks/AuthContext';
import ErrorBoundary from '../src/ui/ErrorBoundary';
import { COLORS } from '../src/constants/theme';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // If font loading fails, still hide splash (app works with system fonts)
  useEffect(() => {
    if (fontError) {
      console.warn('[RootLayout] Font loading failed, using system fonts:', fontError);
      SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Splash still showing
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <StatusBar
              style="light"
              backgroundColor={COLORS.charcoal}
              translucent={false}
            />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(factory)" />
              <Stack.Screen name="(driver)" />
            </Stack>
          </View>
        </GestureHandlerRootView>
      </AuthProvider>
    </ErrorBoundary>
  );
}
