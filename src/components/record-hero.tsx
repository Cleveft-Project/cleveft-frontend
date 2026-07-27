import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Bar heights as fractions of the strip. Hand-picked rather than random: a
 * random set re-rolls on every render and, more importantly, tends to look like
 * noise. This reads as a waveform because it has a shape — a swell in the
 * middle and quieter ends, the way a sentence actually looks.
 */
const BARS = [0.35, 0.6, 0.45, 0.85, 1, 0.7, 0.5, 0.75, 0.4, 0.55, 0.3];

interface RecordHeroProps {
  onPress: () => void;
  /** Shown as the eyebrow line — e.g. "3 lectures this week". */
  eyebrow: string;
  title: string;
}

/**
 * The one thing this app is for, given the largest object on the screen.
 *
 * A dark slab on a light page, which is the strongest contrast available here
 * and therefore the right way to say "start here" without an accent colour
 * having to shout. Everything below it is white-on-white and reads as quieter
 * by comparison — the hierarchy comes from the slab existing, not from the
 * cards beneath being small.
 *
 * The bars are decoration, not data. They are still worth drawing: they say
 * "this records audio" faster than the word "record" does.
 */
export function RecordHero({ onPress, eyebrow, title }: RecordHeroProps) {
  const { colors, glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { animatedStyle, handlers } = usePressScale(0.98);

  return (
    <Animated.View style={[styles.wrap, glow.lifted, animatedStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Record a lecture"
        style={styles.card}
        {...handlers}
      >
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.footer}>
          <View style={styles.mic}>
            <Ionicons name="mic" size={22} color={colors.textOnAccent} />
          </View>

          <View style={styles.bars} pointerEvents="none">
            {BARS.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: `${height * 100}%`,
                    // The tallest bars take the bright cyan and the short ones
                    // recede into the slab, so the strip has depth instead of
                    // reading as a flat comb.
                    backgroundColor: height > 0.65 ? colors.accentVivid : colors.textOnInkMuted,
                    opacity: height > 0.65 ? 1 : 0.45,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      borderRadius: radius.lg,
    },
    card: {
      borderRadius: radius.lg,
      backgroundColor: c.ink,
      padding: spacing.xl,
      overflow: 'hidden',
    },
    eyebrow: {
      ...typography.micro,
      fontSize: 12,
      color: c.accentVivid,
      letterSpacing: 0.3,
    },
    title: {
      ...typography.title,
      color: c.textOnInk,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    mic: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentVivid,
    },
    bars: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 32,
    },
    bar: {
      flex: 1,
      maxWidth: 4,
      borderRadius: radius.pill,
      minHeight: 4,
    },
  });
