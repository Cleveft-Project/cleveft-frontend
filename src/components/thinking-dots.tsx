import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, useTheme, useThemedStyles, type Palette } from '@/theme';

const DOT_COUNT = 3;
const CYCLE_MS = 1200;

/**
 * The "still working" indicator for a pending answer.
 *
 * A travelling wave of three dots rather than a spinner: a spinner says
 * "loading", which is a system state, while dots say "composing", which is what
 * is actually happening — the model is reading the student's own lectures.
 *
 * One driver runs all three dots, offset in phase, so the cost is a single
 * animation regardless of how many dots there are.
 */
export function ThinkingDots({ size = 6 }: { size?: number }) {
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  return (
    <View style={styles.row}>
      {new Array(DOT_COUNT).fill(0).map((_, index) => (
        <Dot key={index} index={index} size={size} progress={progress} />
      ))}
    </View>
  );
}

function Dot({
  index,
  size,
  progress,
}: {
  index: number;
  size: number;
  progress: { value: number };
}) {
  const { colors } = useTheme();
  const offset = index / DOT_COUNT;

  const style = useAnimatedStyle(() => {
    // Wrapped into 0-1 so each dot rides the same wave a third of a cycle
    // behind the last, and the loop has no seam.
    const phase = (progress.value + offset) % 1;
    return {
      opacity: interpolate(phase, [0, 0.5, 1], [0.3, 1, 0.3]),
      transform: [{ translateY: interpolate(phase, [0, 0.5, 1], [0, -size * 0.7, 0]) }],
    };
  }, [offset, size]);

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: colors.accentVivid },
        style,
      ]}
    />
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      // Keeps the row's height stable while the dots bob, so the message list
      // does not reflow on every frame of the animation.
      height: 14,
    },
  });
