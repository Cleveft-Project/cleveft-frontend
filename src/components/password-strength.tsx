import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * How strong the password being typed actually is.
 *
 * <p>A minimum length is a rule, not feedback: it tells a student when they may
 * proceed, never whether what they have chosen is any good. "password1" clears
 * eight characters and is among the first things anyone would try.
 *
 * <p>Scored on what makes a password hard to guess rather than on character-
 * class checkboxes. Requiring one uppercase and one symbol is why so many
 * passwords are `Password1!` — the rules are satisfied and the password is
 * still terrible. Length carries the most weight here because it genuinely
 * matters most.
 */

/** Passwords so common that any attacker tries them first, whatever their shape. */
const OBVIOUS = [
  'password', 'passw0rd', '12345678', '123456789', 'qwerty', 'abc123',
  'letmein', 'welcome', 'iloveyou', 'admin123', 'cleveft',
];

export interface Strength {
  score: 0 | 1 | 2 | 3;
  label: string;
  /** Shown under the bar — the single most useful next step, not a rule list. */
  advice: string | null;
}

export function scorePassword(password: string): Strength {
  const value = password ?? '';

  if (!value) {
    return { score: 0, label: '', advice: null };
  }

  const lower = value.toLowerCase();
  if (OBVIOUS.some((entry) => lower.includes(entry))) {
    return {
      score: 0,
      label: 'Very weak',
      advice: 'That is one of the first things anyone would guess.',
    };
  }

  let points = 0;
  if (value.length >= 8) points++;
  if (value.length >= 12) points++;
  if (value.length >= 16) points++;

  // Variety counts once, not once per class — the point is that the search
  // space is wider, not that a particular box was ticked.
  const classes =
    (/[a-z]/.test(value) ? 1 : 0)
    + (/[A-Z]/.test(value) ? 1 : 0)
    + (/\d/.test(value) ? 1 : 0)
    + (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  if (classes >= 3) points++;

  // A single repeated character or a straight run reads long without being it.
  if (/^(.)\1+$/.test(value) || /0123|1234|2345|abcd|qwer/i.test(lower)) {
    points = Math.max(0, points - 2);
  }

  const score = Math.min(3, points) as 0 | 1 | 2 | 3;

  const advice =
    value.length < 8
      ? 'Too short — eight characters at least.'
      : score <= 1
        ? 'Longer is stronger. Try a few words together.'
        : null;

  return {
    score,
    label: ['Weak', 'Fair', 'Good', 'Strong'][score],
    advice,
  };
}

export function PasswordStrength({ password }: { password: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const strength = useMemo(() => scorePassword(password), [password]);
  const filled = password ? strength.score + 1 : 0;

  const tint =
    strength.score >= 3 ? colors.accent
      : strength.score === 2 ? colors.accent
        : strength.score === 1 ? colors.warning
          : colors.danger;

  if (!password) {
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((index) => (
          <Segment key={index} active={index < filled} tint={tint} />
        ))}
      </View>

      <View style={styles.textRow}>
        <Text style={[styles.label, { color: tint }]}>{strength.label}</Text>
        {strength.advice ? <Text style={styles.advice}>{strength.advice}</Text> : null}
      </View>
    </View>
  );
}

/** Animated so the bar grows into place rather than snapping per keystroke. */
function Segment({ active, tint }: { active: boolean; tint: string }) {
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(active ? 1 : 0);

  // In an effect, not in the render body. Assigning to a shared value while
  // React is rendering is a write during render — Reanimated warns about it
  // because the animation is started from a phase that may be discarded and
  // re-run, so it can fire twice or be abandoned half way.
  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.18 + progress.value * 0.82,
    transform: [{ scaleY: 0.6 + progress.value * 0.4 }],
  }));

  return <Animated.View style={[styles.segment, { backgroundColor: tint }, style]} />;
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  label: {
    ...typography.micro,
  },
  advice: {
    ...typography.micro,
    color: c.textMuted,
    flex: 1,
  },
});
