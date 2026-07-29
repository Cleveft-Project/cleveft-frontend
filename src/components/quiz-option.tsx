import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { pop, shake, SNAPPY } from '@/components/animated/motion';
import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

/**
 * What the option currently is, from the student's point of view.
 *
 * Deliberately one prop rather than four booleans: an option cannot be both
 * `correct` and `wrong`, and encoding that in the type removes a whole class of
 * impossible render.
 */
export type QuizOptionState =
  /** Not chosen, quiz still live. */
  | 'idle'
  /** Chosen, not yet graded. */
  | 'selected'
  /** Graded: this was the right answer. */
  | 'correct'
  /** Graded: the student picked this and it was wrong. */
  | 'wrong'
  /** Graded: not the answer, not their pick. Recedes. */
  | 'muted';

interface QuizOptionProps {
  label: string;
  text: string;
  state: QuizOptionState;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * One answer in a quiz — and the single most important interaction in Cleveft.
 *
 * This is the only place in the app where the student finds out, in the moment,
 * whether they actually knew something. Everything else is reading. So the
 * feedback has to be immediate and physical: the option springs under the
 * finger on press, pops when it turns out to be right, and shakes when it does
 * not.
 *
 * A component per option, rather than the animation living in the quiz screen,
 * because each option needs its own shared values — hooks cannot be called from
 * inside a `.map()`.
 */
export function QuizOption({ label, text, state, onPress, disabled = false }: QuizOptionProps) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  // Grading happens once, and the reaction should fire once with it. Tracking
  // the previous state stops a re-render — a parent state change, a theme
  // switch — from replaying the pop every time.
  const previousState = useRef(state);

  useEffect(() => {
    if (previousState.current === state) {
      return;
    }
    previousState.current = state;

    if (state === 'correct') {
      scale.value = pop(1.04);
    } else if (state === 'wrong') {
      shift.value = shake(7);
    }
  }, [scale, shift, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shift.value }],
  }));

  const graded = state === 'correct' || state === 'wrong' || state === 'muted';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) {
            // On press *in*, not on press — the tap should land with the finger
            // rather than after the gesture resolves, or it feels like a
            // delayed reaction rather than a response.
            haptics.tap();
            scale.value = withSpring(0.975, SNAPPY);
          }
        }}
        onPressOut={() => {
          if (!disabled) {
            scale.value = withSpring(1, SNAPPY);
          }
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: state === 'selected' || state === 'correct', disabled }}
        accessibilityLabel={`${label}. ${text}`}
        style={[
          styles.option,
          state === 'selected' && styles.optionSelected,
          state === 'correct' && styles.optionCorrect,
          state === 'wrong' && styles.optionWrong,
          state === 'muted' && styles.optionMuted,
        ]}
      >
        <View
          style={[
            styles.badge,
            state === 'selected' && styles.badgeSelected,
            state === 'correct' && styles.badgeCorrect,
            state === 'wrong' && styles.badgeWrong,
          ]}
        >
          <Text
            style={[
              styles.badgeLabel,
              (state === 'selected' || state === 'correct' || state === 'wrong') &&
                styles.badgeLabelActive,
            ]}
          >
            {/* After grading, the mark says what the badge letter cannot. */}
            {state === 'correct' ? '✓' : state === 'wrong' ? '✕' : label}
          </Text>
        </View>

        <Text style={[styles.text, state === 'muted' && styles.textMuted]}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  optionSelected: {
    backgroundColor: c.accentSoft,
    borderColor: c.borderStrong,
  },
  optionCorrect: {
    backgroundColor: c.accentSoft,
    borderColor: c.accent,
  },
  optionWrong: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
  },
  // The options that were neither right nor chosen step back, so the eye goes
  // straight to the answer instead of scanning five equal boxes.
  optionMuted: {
    opacity: 0.55,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  badgeSelected: {
    backgroundColor: c.accentVivid,
    borderColor: c.accent,
  },
  badgeCorrect: {
    backgroundColor: c.accentVivid,
    borderColor: c.accent,
  },
  badgeWrong: {
    backgroundColor: c.danger,
    borderColor: c.danger,
  },
  badgeLabel: {
    ...typography.caption,
    color: c.textMuted,
  },
  badgeLabelActive: {
    color: c.textOnAccent,
    fontWeight: '700',
  },
  text: {
    ...typography.body,
    color: c.text,
    flex: 1,
  },
  textMuted: {
    color: c.textSecondary,
  },
});
