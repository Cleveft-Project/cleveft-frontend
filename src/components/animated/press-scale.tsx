import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';

/**
 * Tactile spring feedback for anything pressable.
 *
 * The spring is deliberately tuned once, here, so every button and card in the
 * app dips and settles with the same physical character — a scattering of
 * bespoke timings is what makes an interface feel unowned.
 *
 * damping/stiffness are the values from the design brief: a quick, slightly
 * springy settle that reads as "physical" without the bounce overshooting far
 * enough to look like a toy.
 */
const PRESS_SPRING = { damping: 15, stiffness: 150, mass: 0.5 } as const;

const DEFAULT_PRESSED_SCALE = 0.96;

/**
 * Drives a scale shared value from press state.
 *
 * Prefer this hook over {@link PressableScale} when a component already owns a
 * {@link Pressable} with its own gradient children or function-style props
 * (NeonButton, QuickAction, GlassCard all do): keep their Pressable, spread
 * {@link handlers} onto it, and wrap the outermost node in an
 * {@link Animated.View} carrying {@link animatedStyle}. Wrapping the *outer*
 * node — not the inner content — means the neon shadow scales with the surface
 * rather than detaching from it.
 */
export function usePressScale(pressedScale: number = DEFAULT_PRESSED_SCALE, enabled = true) {
  const scale = useSharedValue(1);
  const haptics = useHaptics();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlers = {
    onPressIn: () => {
      if (enabled) {
        // Every card, button and tile in the app springs through this hook, so
        // the tap belongs here rather than at eight call sites. Anything that
        // dips visually now answers physically too, which is the whole of what
        // "micro-interaction" means on a phone.
        haptics.tap();
        scale.value = withSpring(pressedScale, PRESS_SPRING);
      }
    },
    onPressOut: () => {
      if (enabled) {
        scale.value = withSpring(1, PRESS_SPRING);
      }
    },
  };

  return { animatedStyle, handlers };
}

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  pressedScale?: number;
  /** Any static style — no function form, since the scale lives on the wrapper. */
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * A drop-in {@link Pressable} that springs on press. Use for the simple cases
 * (an input trigger, a chip) where the pressable has no gradient fill or
 * function-style needs of its own.
 */
export function PressableScale({
  children,
  pressedScale = DEFAULT_PRESSED_SCALE,
  style,
  disabled = false,
  ...pressableProps
}: PressableScaleProps) {
  const { animatedStyle, handlers } = usePressScale(pressedScale, !disabled);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable disabled={disabled} {...handlers} {...pressableProps} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
