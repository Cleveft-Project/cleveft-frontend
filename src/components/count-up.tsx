import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface CountUpProps {
  /** The number to arrive at. Changing it animates from wherever it currently is. */
  value: number;
  duration?: number;
  delay?: number;
  /** Appended without a space — `%`, `/10`, `days`. */
  suffix?: string;
  style?: StyleProp<TextStyle>;
  /** Decimal places. Counts are integers; a rate might not be. */
  precision?: number;
}

/**
 * A number that counts up to its value instead of appearing at it.
 *
 * Worth the machinery for one reason: a figure that climbs is *read*. A figure
 * that is simply present gets skipped. This is the whole trick behind every
 * score reveal and stat dashboard that feels rewarding — the eye follows
 * movement, so movement is what makes a student notice they got 80%.
 *
 * Deliberately eased-out: the count decelerates into its final value rather
 * than stopping dead, which is what makes the landing feel deliberate.
 *
 * ## Why it re-renders
 *
 * Reanimated cannot write into a `Text` child from the UI thread without
 * `react-native-reanimated`'s text-specific APIs, so this bridges back with
 * `runOnJS`. That means real React renders — fine for a handful of figures on
 * screen, wrong for a list of hundreds. If that ever becomes the case, swap the
 * body for `useAnimatedProps` on a `TextInput`.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  suffix = '',
  style,
  precision = 0,
}: CountUpProps) {
  const progress = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, duration, progress, value]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      const rounded = Number(current.toFixed(precision));
      // Only cross the bridge when the *displayed* value would change, rather
      // than on every frame — at 0 decimal places that is at most `value`
      // renders instead of 60 per second.
      if (previous === null || rounded !== Number(previous.toFixed(precision))) {
        runOnJS(setShown)(rounded);
      }
    },
    [precision],
  );

  return (
    <Text style={style}>
      {shown.toFixed(precision)}
      {suffix}
    </Text>
  );
}
