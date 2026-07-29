import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Measured off the reference recording rather than guessed.
 *
 * The mascot there travels 18px peak-to-peak in a 456x640 capture — about 16pt
 * once scaled to a phone — over a full cycle of roughly 4.9 seconds. Both
 * numbers matter and both are easy to get wrong in the same direction: the
 * instinct is to make a float bigger and faster than it really is, which turns
 * "alive" into "fidgeting".
 */
const TRAVEL = 8;
const HALF_CYCLE = 2450;

interface FloatingPromptProps {
  /** Small line above the question. */
  eyebrow: string;
  /** The question itself, given the display type. */
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /**
   * Replaces the icon badge entirely — pass the mascot here rather than
   * stacking him above, which just gives the screen two competing subjects.
   */
  subject?: React.ReactNode;
  /**
   * Peak-to-peak travel. The default is the small, measured hover that suits
   * an icon; a mascot with beating wings wants considerably more, or the
   * flapping looks unrelated to the movement.
   */
  travel?: number;
  /** Raise when the subject is taller than the 64pt badge. */
  stageHeight?: number;
}

/**
 * The chat screen's resting state: an icon and a question, breathing.
 *
 * Three details separate a float from a slide, and the reference has all three:
 *
 * 1. **Sine easing, not linear.** Tracking the reference frame by frame, the
 *    mascot dwells about ten frames at each extreme and moves fastest through
 *    the middle. That is what a pendulum does. A linear loop reads as
 *    mechanical because real hovering things never move at constant speed.
 * 2. **A shadow that answers the movement.** The ellipse beneath shrinks and
 *    fades as the subject rises. Without it the eye reads the motion as the
 *    whole element sliding up the page; with it, the element is clearly above
 *    a surface. This is the detail that does most of the work.
 * 3. **The text stays put.** Only the icon floats. Animating the words too
 *    would make the reader chase a moving target, and the reference does not
 *    do it either.
 */
export function FloatingPrompt({
  eyebrow,
  title,
  icon = 'sparkles',
  subject,
  travel = TRAVEL,
  stageHeight = 96,
}: FloatingPromptProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  // 0 = resting low, 1 = at the top of the arc.
  const lift = useSharedValue(0);

  useEffect(() => {
    // `withRepeat(..., -1, true)` is the one place an infinite loop is right:
    // this is ambient state, not an announcement, and it stops the moment a
    // message arrives and the empty state unmounts.
    lift.value = withRepeat(
      withTiming(1, {
        duration: HALF_CYCLE,
        // inOut(sin) reproduces the dwell-at-the-extremes seen in the capture.
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [lift]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1], [travel, -travel]) }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    // Higher up means a smaller, fainter, softer shadow. The ranges are
    // deliberately gentle — an obvious scale makes it read as a separate
    // pulsing blob rather than as cast shadow.
    transform: [{ scaleX: interpolate(lift.value, [0, 1], [1, 0.72]) }],
    opacity: interpolate(lift.value, [0, 1], [0.5, 0.2]),
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { height: stageHeight }]}>
        <Animated.View style={[subject ? null : styles.badge, floatStyle]}>
          {subject ?? <Ionicons name={icon} size={30} color={colors.accentVivid} />}
        </Animated.View>
        <Animated.View style={[styles.shadow, shadowStyle]} pointerEvents="none" />
      </View>

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    // Fixed height so the float cannot push the copy below it up and down.
    // Overridden per subject; the default suits the 64pt badge.
    stage: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.ink,
    },
    shadow: {
      position: 'absolute',
      bottom: 4,
      width: 56,
      height: 9,
      borderRadius: radius.pill,
      backgroundColor: c.textMuted,
    },
    eyebrow: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: spacing.xl,
    },
    title: {
      ...typography.display,
      color: c.text,
      textAlign: 'center',
      marginTop: spacing.xs,
      maxWidth: 300,
    },
  });
