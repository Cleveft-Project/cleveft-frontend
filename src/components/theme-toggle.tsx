import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radius, useTheme } from '@/theme';

const TRACK_W = 68;
const TRACK_H = 36;
const KNOB = 28;
const PAD = (TRACK_H - KNOB) / 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

const BODY = 16;
const RAY_COUNT = 8;
const RAY_LEN = 4;
const RAY_W = 2;

/** Slightly under-damped so the knob arrives with a little weight behind it. */
const SLIDE_SPRING = { damping: 15, stiffness: 170, mass: 0.7 } as const;

const SUN_FACE = '#F5B841';
const MOON_FACE = '#E8EDF5';
const TRACK_LIGHT = '#C9A227';
const TRACK_DARK = '#2B4048';

interface ThemeToggleProps {
  /** Skips the animation on mount, so restoring a saved theme does not animate. */
  animateOnMount?: boolean;
}

/**
 * Day/night switch.
 *
 * The glyph is not two icons crossfading — that always reads as a swap. The sun
 * *becomes* the moon: its rays retract into the body while a disc the colour of
 * the track slides across and bites a crescent out of it. One object changing
 * shape, which is what makes the transition feel like a single idea rather than
 * two states glued together.
 */
export function ThemeToggle({ animateOnMount = false }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  // 0 = light (sun, knob left), 1 = dark (moon, knob right).
  const progress = useSharedValue(animateOnMount ? 0 : isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isDark ? 1 : 0, SLIDE_SPRING);
  }, [isDark, progress]);

  // The spring overshoots past 1, which would drag the crescent cutout too far
  // and re-open the moon into a full disc. Clamping the colour/shape driver
  // while leaving the knob free is what lets the slide bounce without the glyph
  // wobbling with it.
  const shaped = useDerivedValue(() => Math.min(1, Math.max(0, progress.value)));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(shaped.value, [0, 1], [TRACK_LIGHT, TRACK_DARK]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(shaped.value, [0, 1], [SUN_FACE, MOON_FACE]),
  }));

  // Slides in from off-glyph to overlapping, carving the crescent. Coloured to
  // match the knob, not the track, since it sits on the knob.
  const cutoutStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shaped.value, [0, 0.35, 1], [0, 0, 1]),
    transform: [
      { translateX: interpolate(shaped.value, [0, 1], [BODY * 0.95, BODY * 0.42]) },
      { translateY: interpolate(shaped.value, [0, 1], [-BODY * 0.5, -BODY * 0.34]) },
    ],
  }));

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]}>
          {/* Rays sit outside the clipped body: the crescent is made by
              clipping the cutout disc to the sun's circle, and anything inside
              that clip would be cut away with it. */}
          <View style={styles.glyph}>
            {new Array(RAY_COUNT).fill(0).map((_, index) => (
              <SunRay key={index} index={index} progress={shaped} />
            ))}

            <View style={styles.body}>
              <Animated.View style={[styles.face, faceStyle]} />
              <Animated.View style={[styles.cutout, cutoutStyle]} />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * One spoke of the sun.
 *
 * Retracts toward the body and fades as the moon takes over, rather than simply
 * disappearing — rays that vanish on the spot look like a rendering glitch,
 * rays that pull inward look like the sun closing.
 */
function SunRay({ index, progress }: { index: number; progress: { value: number } }) {
  const angle = (index * 360) / RAY_COUNT;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], 'clamp'),
    transform: [
      { rotate: `${angle}deg` },
      { translateY: interpolate(progress.value, [0, 1], [-(BODY / 2 + RAY_LEN + 1.5), -BODY / 2]) },
      { scaleY: interpolate(progress.value, [0, 0.45], [1, 0.2], 'clamp') },
    ],
  }));

  return <Animated.View style={[styles.ray, style]} />;
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: radius.pill,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  glyph: {
    width: KNOB,
    height: KNOB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: BODY,
    height: BODY,
    borderRadius: radius.pill,
    // Clips the cutout to the sun's circle. Without this the disc that carves
    // the crescent would just sit on top as a white blob.
    overflow: 'hidden',
  },
  face: {
    width: BODY,
    height: BODY,
    borderRadius: radius.pill,
  },
  cutout: {
    position: 'absolute',
    width: BODY,
    height: BODY,
    borderRadius: radius.pill,
    // Matches the knob, since the crescent is cut out against the knob's fill.
    backgroundColor: '#FFFFFF',
  },
  ray: {
    position: 'absolute',
    width: RAY_W,
    height: RAY_LEN,
    borderRadius: radius.pill,
    backgroundColor: SUN_FACE,
  },
});
