import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

const THUMB = 26;
const TRACK = 6;

/**
 * A slider over whole numbers.
 *
 * <p>Built rather than installed. The two things that make one of these feel
 * right are a thumb that lands exactly on a value and a tick you can feel as it
 * passes each one, and both want direct control of the gesture — a generic
 * slider gives continuous motion and a value that only settles when you let go,
 * which reads as vague when the number is the whole point.
 *
 * <p>So the thumb snaps. Every step is a position it can occupy and none of the
 * space between them is, which is honest about what is being chosen: you are
 * not sliding through a range, you are picking one of thirty-eight numbers.
 */
export function StepSlider({
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  value: number;
  onChange(next: number): void;
  minLabel?: string;
  maxLabel?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const width = useSharedValue(0);
  const held = useSharedValue(0);

  const commit = useCallback(
    (raw: number) => {
      const next = Math.min(max, Math.max(min, Math.round(raw)));
      if (next !== value) {
        // One tick per number crossed, which is what makes a stepped slider
        // feel like notches rather than a smear.
        haptics.tick();
        onChange(next);
      }
    },
    [haptics, max, min, onChange, value],
  );

  const pan = Gesture.Pan()
    // Zero, so a straight tap on the track counts. Without it the gesture waits
    // for movement and a tap does nothing at all.
    .minDistance(0)
    .onBegin((event) => {
      held.value = withSpring(1, { damping: 16, stiffness: 240 });
      const travel = width.value - THUMB;
      if (travel > 0) {
        const ratio = Math.min(1, Math.max(0, (event.x - THUMB / 2) / travel));
        runOnJS(commit)(min + ratio * (max - min));
      }
    })
    .onUpdate((event) => {
      const travel = width.value - THUMB;
      if (travel > 0) {
        const ratio = Math.min(1, Math.max(0, (event.x - THUMB / 2) / travel));
        runOnJS(commit)(min + ratio * (max - min));
      }
    })
    .onFinalize(() => {
      held.value = withSpring(0, { damping: 16, stiffness: 240 });
    });

  const ratio = (value - min) / (max - min || 1);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ratio * Math.max(0, width.value - THUMB) },
      { scale: 1 + held.value * 0.16 },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: THUMB / 2 + ratio * Math.max(0, width.value - THUMB),
  }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          onLayout={(event) => {
            width.value = event.nativeEvent.layout.width;
          }}
          accessibilityRole="adjustable"
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') {
              commit(value + 1);
            } else if (event.nativeEvent.actionName === 'decrement') {
              commit(value - 1);
            }
          }}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      {minLabel || maxLabel ? (
        <View style={styles.scale}>
          <Text style={styles.scaleText}>{minLabel ?? min}</Text>
          <Text style={styles.scaleText}>{maxLabel ?? max}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  hit: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: TRACK,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
  },
  fill: {
    position: 'absolute',
    height: TRACK,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
    borderWidth: 3,
    borderColor: c.surface,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleText: {
    ...typography.micro,
    color: c.textMuted,
  },
});
