import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { CleveftMark } from '@/components/cleveft-mark';
import { spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The mark's own timeline runs ~2.3s. Holding the overlay slightly past that
 * lets the animation finish rather than being cut off mid-sweep on a warm
 * start, where auth restores in a few hundred milliseconds.
 */
const MIN_VISIBLE_MS = 2500;
const EXIT_MS = 480;

interface SplashOverlayProps {
  /** The app behind is done bootstrapping and safe to reveal. */
  ready: boolean;
  onFinish: () => void;
}

export function SplashOverlay({ ready, onFinish }: SplashOverlayProps) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(createStyles);
  const mountedAt = useRef(Date.now()).current;
  const fade = useRef(new Animated.Value(1)).current;
  const copy = useRef(new Animated.Value(0)).current;

  // Hand off from the native splash the moment this one is on screen — any
  // earlier and there is a flash of bare background between the two.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or the module is unavailable on web. Nothing to do.
    });
  }, []);

  useEffect(() => {
    const animation = Animated.timing(copy, {
      toValue: 1,
      duration: 620,
      delay: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [copy]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt));
    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    }, remaining);

    return () => clearTimeout(timer);
  }, [fade, mountedAt, onFinish, ready]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          opacity: fade,
          // Lifting away rather than simply dissolving reads as the splash
          // stepping aside for the app, not the app flickering in.
          transform: [
            { scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) },
          ],
        },
      ]}
    >
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        {/* A cool bloom keyed to the mark's node, so the glow looks cast by
            the logo instead of pasted behind it. */}
        <View style={styles.bloom} pointerEvents="none" />

        <CleveftMark size={188} />

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copy,
              transform: [
                { translateY: copy.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.wordmark}>Cleveft</Text>
          <Text style={styles.tagline}>Every lecture, remembered.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    backgroundColor: c.bg,
    zIndex: 100,
    elevation: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxxl,
  },
  bloom: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(18, 227, 209, 0.07)',
  },
  copy: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  wordmark: {
    ...typography.display,
    color: c.text,
    letterSpacing: 1.5,
  },
  tagline: {
    ...typography.caption,
    color: c.textSecondary,
    letterSpacing: 0.4,
  },
});
