import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/feedback';
import { SplashOverlay } from '@/components/splash-overlay';
import { AuthProvider, useAuth } from '@/state/auth-context';
import { ChromeProvider } from '@/state/chrome-context';
import { FeedbackProvider } from '@/state/feedback-context';
import { ThemeProvider, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The native splash is dismissed by the JS splash overlay once it has mounted,
 * not automatically — otherwise there is a frame of bare background between
 * the two while the bundle finishes evaluating.
 */
void SplashScreen.preventAutoHideAsync().catch(() => {
  // Not available on web, and a no-op if it already hid. Neither is fatal.
});

/**
 * Keeps the root native view in step with the theme.
 *
 * That view's background defaults to white until JS paints over it. Every
 * `sceneStyle`/`contentStyle` here themes the *screen content*, but
 * react-native-screens' native transitions briefly reveal the root view
 * underneath — which is what used to flash white on every tab switch.
 *
 * It has to run on every scheme change rather than once at module load, or
 * switching to light would leave a black root behind every transition.
 */
function useNativeBackground() {
  const { colors } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);
}

/**
 * Redirects between the signed-in and signed-out halves of the app.
 *
 * Kept as a navigation effect rather than conditional rendering so that expo
 * -router keeps ownership of the URL — on web, rendering the wrong tree without
 * navigating would leave the address bar pointing at a route the user is not on.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const { isAuthenticated, isBootstrapping } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Must match app/index.tsx. These two both decide where a signed-out
      // visitor goes, and when they disagreed they fired competing navigations
      // on the same launch.
      router.replace('/onboarding');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/home');
    }
  }, [isAuthenticated, isBootstrapping, segments, router]);

  if (isBootstrapping) {
    return (
      <View style={styles.boot}>
        <LoadingState label="Getting your lectures ready…" />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Sits inside AuthProvider so the splash can wait on the real bootstrap rather
 * than a fixed timer — the overlay covers the auth gate's loading state, so
 * the student never sees two loading screens in a row.
 */
function RootShell() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isBootstrapping } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useNativeBackground();

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <View style={styles.root}>
      {/* Inverted against the background, not pinned to light — dark status
          glyphs are unreadable on the dark theme and light ones vanish on the
          light one. No backgroundColor: Android is edge-to-edge as of SDK 56
          and the prop was removed. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="topic" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="library" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="transcript" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="quiz" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="upgrade" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </AuthGate>

      {splashDone ? null : (
        <SplashOverlay ready={!isBootstrapping} onFinish={handleSplashFinish} />
      )}
    </View>
  );
}

/**
 * Split from RootLayout so it sits *inside* ThemeProvider — the root view's
 * own background is themed, and a component cannot consume a context it is
 * itself rendering.
 */
function ThemedRoot() {
  const styles = useThemedStyles(createStyles);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <FeedbackProvider>
            <ChromeProvider>
              <RootShell />
            </ChromeProvider>
          </FeedbackProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
  },
  boot: {
    flex: 1,
    backgroundColor: c.bg,
  },
});
