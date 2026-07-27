import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { radius, spacing, useTheme, useThemedStyles, type Palette } from '@/theme';

export type CardTone = 'default' | 'ink';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Tints the card so it reads as the one that matters on the screen. */
  active?: boolean;
  /** Ink slab — for a hero or a section that should anchor the page. */
  tone?: CardTone;
  padded?: boolean;
  style?: ViewStyle;
}

/**
 * The surface everything sits on.
 *
 * Opaque, generously rounded, and lifted by shadow rather than outlined by a
 * border. That last part is the whole idea: a hairline around every card makes
 * a screen read as a wireframe, because an outline says "here is a box" while a
 * shadow says "here is a thing on top of the page". Only one of those is what a
 * card actually is.
 *
 * This replaces the old glassmorphic card. Translucency cost a blend per frame
 * on every scroll and, on a light ground, produced grey haze instead of depth.
 */
export function Card({
  children,
  onPress,
  active = false,
  tone = 'default',
  padded = true,
  style,
}: CardProps) {
  const { glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { animatedStyle, handlers } = usePressScale(0.97, !!onPress);

  const surface = (
    <View
      style={[
        styles.card,
        tone === 'ink' && styles.ink,
        active && tone !== 'ink' && styles.active,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );

  // Shadow has to live on a wrapper, not on the card itself: `overflow:
  // hidden` is what keeps children inside the rounded corners, and on Android
  // it clips the elevation shadow along with them.
  const elevation = tone === 'ink' ? glow.lifted : active ? glow.accentSoft : glow.card;

  if (!onPress) {
    return <View style={[styles.wrap, elevation]}>{surface}</View>;
  }

  return (
    <Animated.View style={[styles.wrap, elevation, animatedStyle]}>
      <Pressable onPress={onPress} {...handlers}>
        {surface}
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
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    padded: {
      padding: spacing.lg,
    },
    active: {
      backgroundColor: c.accentSoft,
    },
    ink: {
      backgroundColor: c.ink,
    },
  });
