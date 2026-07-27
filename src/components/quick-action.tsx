import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { useAmbientPulse } from '@/components/animated/pulse-glow';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

interface QuickActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  caption?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  /**
   * Announce the card with a few pulses of the halo — for the one beacon
   * action. Deliberately finite: see {@link pulseCycles}.
   */
  pulse?: boolean;
  /** Breaths to run before settling. -1 loops forever; use that sparingly. */
  pulseCycles?: number;
  style?: ViewStyle;
}

/**
 * Home screen's two big shortcuts. A card, not a pill — a pill this wide
 * either truncates the label or centers icon-and-text awkwardly; a card
 * gives the icon a badge, the label room to breathe, and a caption line
 * that a plain button has nowhere to put.
 */
export function QuickAction({
  icon,
  label,
  caption,
  onPress,
  variant = 'primary',
  pulse = false,
  pulseCycles = 1,
  style,
}: QuickActionProps) {
  const { colors, glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isPrimary = variant === 'primary';
  const { animatedStyle, handlers } = usePressScale(0.96);
  // The halo lives inside the card's own definite-sized wrapper, so it fills
  // reliably under flex on web rather than collapsing a wrapping layer to zero.
  //
  // 640ms each way: slow enough to read as a breath, done in ~1.3s. The
  // original 1200 left it pulsing 2.4 seconds after the screen appeared, long
  // after the cards had settled — which is what made the screen feel like it
  // was struggling rather than finishing.
  const pulseStyle = useAmbientPulse(pulse, 640, pulseCycles);

  const body = (
    <View style={styles.inner}>
      <View style={[styles.iconBadge, isPrimary && styles.iconBadgePrimary]}>
        <Ionicons
          name={icon}
          size={19}
          color={isPrimary ? colors.onFillPrimary : colors.accent}
        />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.label, isPrimary && styles.labelPrimary]} numberOfLines={1}>
          {label}
        </Text>
        {caption ? (
          <Text style={[styles.caption, isPrimary && styles.captionPrimary]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <Animated.View style={[styles.wrap, isPrimary && glow.accent, animatedStyle, style]}>
      {pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.halo, pulseStyle]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...handlers}
      >
        <View style={[styles.base, isPrimary ? styles.primaryBase : styles.secondaryBase]}>
          {body}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: radius.lg,
  },
  halo: {
    // Sits behind the card and bleeds outward, so the scaled pulse reads as a
    // glow cast by the button rather than a plate growing under it.
    margin: -5,
    borderRadius: radius.lg,
    backgroundColor: c.accentVivid,
  },
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 96,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  primaryBase: {
    backgroundColor: c.fillPrimary,
  },
  secondaryBase: {
    backgroundColor: c.surface,
  },
  inner: {
    gap: spacing.md,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  // A light wash, because it sits on a filled slab in both schemes — ink navy
  // in light, cyan in dark. A dark wash would vanish into the first and muddy
  // the second.
  iconBadgePrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  textBlock: {
    gap: 2,
  },
  label: {
    ...typography.bodyStrong,
    color: c.text,
  },
  labelPrimary: {
    color: c.onFillPrimary,
    fontWeight: '700',
  },
  caption: {
    ...typography.micro,
    color: c.textMuted,
  },
  captionPrimary: {
    color: c.onFillPrimaryMuted,
  },
});
