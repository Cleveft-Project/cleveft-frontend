import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { radius, useTheme, useThemedStyles, type Palette } from '@/theme';

interface PulseGlowProps {
  children: React.ReactNode;
  /** Pulse only while true. Off = the halo fades out and the loop is cancelled. */
  active?: boolean;
  color?: string;
  /** Match the wrapped control's corner radius so the halo tracks its shape. */
  borderRadius?: number;
  /** Half a breath, in ms. The full cycle is twice this. */
  halfCycleMs?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * An ambient pulsing halo behind a control — the "this is live / listening"
 * signal on the record button and on AI-processing placeholders.
 *
 * A soft accent-coloured layer sits behind the children and breathes: opacity
 * and scale ease between rest and 1.2 on a loop. It is intentionally gentle and
 * slow — a fast or high-contrast pulse stops reading as ambient and starts
 * competing with the content for attention.
 *
 * pointerEvents are off on the halo so it never intercepts a tap meant for the
 * button it sits behind.
 */
export function PulseGlow({
  children,
  active = true,
  color,
  borderRadius = radius.pill,
  halfCycleMs = 1400,
  style,
}: PulseGlowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // Defaulted here rather than in the parameter list: the accent is now
  // per-scheme, and a default parameter is evaluated outside the component's
  // hook scope where the theme is not readable.
  const haloColor = color ?? colors.accent;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: halfCycleMs, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: halfCycleMs, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 300 });
    }

    return () => cancelAnimation(progress);
  }, [active, halfCycleMs, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.2]) }],
  }));

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.halo,
          { backgroundColor: haloColor, borderRadius },
          haloStyle,
        ]}
      />
      {children}
    </View>
  );
}

/**
 * The raw animated style, for callers that want to drive their own layer (e.g.
 * a ring rather than a fill) instead of the packaged {@link PulseGlow}.
 *
 * @param cycles how many breaths to run, or -1 to loop forever. A finite count
 * is the right default for anything that is drawing attention to itself: a
 * halo that never stops stops being noticed and just becomes visual noise the
 * eye has to work to ignore. Reserve the infinite loop for state that is
 * genuinely ongoing, like a recording in progress.
 */
export function useAmbientPulse(active = true, halfCycleMs = 1400, cycles = -1) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      // The sequence ends back at 0, so a finite run settles at rest on its own
      // — no fade-out needed, and it never stops mid-breath.
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: halfCycleMs, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: halfCycleMs, easing: Easing.inOut(Easing.ease) }),
        ),
        cycles,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(progress);
  }, [active, cycles, halfCycleMs, progress]);

  return useAnimatedStyle(() => ({
    // Rest is fully transparent rather than 0.35: a finite pulse has to end at
    // *nothing*, or the button sits there permanently wearing a faint halo that
    // looks like a rendering artefact.
    opacity: interpolate(progress.value, [0, 1], [0, 0.85]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.2]) }],
  }));
}

const createStyles = (c: Palette) => StyleSheet.create({
  // Deliberately layout-neutral: the halo is absolutely filled to this wrapper,
  // and the wrapper takes its size from the child. That lets the same component
  // sit behind a fixed circular button and behind a flex-stretched card without
  // forcing a size on either.
  wrap: {},
  halo: {
    // Bleeds slightly past the control so the scaled halo reads as a glow
    // cast outward rather than a growing plate underneath it.
    margin: -6,
  },
});
