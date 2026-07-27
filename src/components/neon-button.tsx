import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * The pill button.
 *
 * `primary` is a solid ink slab — the palette flips it to cyan in dark mode,
 * where navy on near-black would be invisible. `accent` is the saturated cyan
 * fill, reserved for the one action a screen exists to perform (record, submit
 * an answer). There should be at most one filled button in view; the fill stops
 * meaning "do this" the moment three things wear it.
 *
 * The name is a holdover from the neon era. The glow is gone — a solid fill and
 * a soft shadow do the work now.
 */
export function NeonButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}: NeonButtonProps) {
  const { colors, glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 56 : 50;
  const filled = variant === 'primary' || variant === 'accent';

  // Scale lives on the outer wrapper so the shadow dips with the button.
  const { animatedStyle, handlers } = usePressScale(0.97, !isDisabled);

  const spinnerColor =
    variant === 'primary'
      ? colors.onFillPrimary
      : variant === 'accent'
        ? colors.textOnAccent
        : variant === 'danger'
          ? colors.danger
          : colors.accent;

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        filled && !isDisabled && glow.accentSoft,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...handlers}
      >
        <View
          style={[
            styles.base,
            { height },
            variant === 'primary' && styles.primary,
            variant === 'accent' && styles.accent,
            variant === 'secondary' && styles.secondary,
            variant === 'ghost' && styles.ghost,
            variant === 'danger' && styles.danger,
          ]}
        >
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="small" color={spinnerColor} />
            ) : (
              <>
                {icon}
                <Text
                  style={[
                    styles.label,
                    variant === 'primary' && styles.labelOnPrimary,
                    variant === 'accent' && styles.labelOnAccent,
                    variant === 'danger' && styles.labelDanger,
                    size === 'lg' && styles.labelLarge,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    fullWidth: {
      alignSelf: 'stretch',
    },
    base: {
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primary: {
      backgroundColor: c.fillPrimary,
    },
    accent: {
      backgroundColor: c.accentVivid,
    },
    // Tinted rather than outlined, so a secondary action next to a filled one
    // reads as quieter instead of merely emptier.
    secondary: {
      backgroundColor: c.accentSoft,
    },
    ghost: {
      backgroundColor: c.surfaceSunken,
    },
    danger: {
      backgroundColor: c.dangerSoft,
    },
    label: {
      ...typography.bodyStrong,
      color: c.accent,
    },
    labelOnPrimary: {
      color: c.onFillPrimary,
      fontWeight: '600',
    },
    labelOnAccent: {
      color: c.textOnAccent,
      fontWeight: '600',
    },
    labelDanger: {
      color: c.danger,
    },
    labelLarge: {
      fontSize: 16,
    },
    disabled: {
      opacity: 0.45,
    },
  });
