import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT } from '@/components/animated/motion';
import { useChrome } from '@/state/chrome-context';
import { useTheme } from '@/theme';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** How tall the dissolve is. Enough to read as a fade, not a curtain. */
const FADE_HEIGHT = 56;
/** Pixels of scroll before an edge is considered "away from the end". */
const THRESHOLD = 8;
/** Fades in and out rather than popping — the whole point is softness. */
const DURATION = 200;
/** Movement below this is finger jitter, not a decision to scroll. */
const DIRECTION_THRESHOLD = 4;
/** Near the top the bar is always present, whichever way the last flick went. */
const COLLAPSE_AFTER = 24;

/**
 * Content dissolving into the top and bottom edges of a scroll view.
 *
 * ## What this is approximating
 *
 * Apple's Liquid Glass scroll edge effect, where content blurs and fades as it
 * passes under floating chrome. `scrollEdgeEffectStyle` is a native SwiftUI
 * modifier with no React Native equivalent, and a true running blur of moving
 * content costs a GPU pass per frame — on mid-range Android that is the
 * difference between a smooth list and a stuttering one.
 *
 * A gradient of the page colour over the content achieves most of the same
 * read for nothing: text softens away at the boundary instead of being sliced
 * by it. Fade, not blur, is the honest description.
 *
 * ## Why the fades come and go
 *
 * A permanent vignette top and bottom looks like a frame someone drew round the
 * screen. These appear only when there is content in that direction — the top
 * fade after you have scrolled, the bottom one while more remains below. That
 * is what makes it read as a property of the scrolling rather than decoration.
 */
export function useScrollEdges() {
  const topOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);

  const chrome = useChrome();
  /** Last offset seen, for working out which way the finger went. */
  const lastY = useSharedValue(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;

      const scrolledFromTop = y > THRESHOLD;
      const remainingBelow = contentSize.height - layoutMeasurement.height - y;

      topOpacity.value = withTiming(scrolledFromTop ? 1 : 0, {
        duration: DURATION,
        easing: EASE_OUT,
      });
      bottomOpacity.value = withTiming(remainingBelow > THRESHOLD ? 1 : 0, {
        duration: DURATION,
        easing: EASE_OUT,
      });

      /*
       * Tab bar shrinks going down, returns coming up.
       *
       * Reading direction rather than absolute position, because position
       * alone would leave the bar hidden while a student reads halfway down a
       * long lecture — and they cannot get it back without scrolling to the
       * top. Direction means one flick upward always returns it.
       *
       * DIRECTION_THRESHOLD ignores the pixel-level jitter a finger produces
       * while holding still, which would otherwise make the bar twitch.
       */
      if (chrome) {
        const delta = y - lastY.value;

        if (y <= COLLAPSE_AFTER) {
          chrome.collapse.value = withTiming(0, { duration: DURATION, easing: EASE_OUT });
        } else if (delta > DIRECTION_THRESHOLD) {
          chrome.collapse.value = withTiming(1, { duration: DURATION, easing: EASE_OUT });
        } else if (delta < -DIRECTION_THRESHOLD) {
          chrome.collapse.value = withTiming(0, { duration: DURATION, easing: EASE_OUT });
        }

        lastY.value = y;
      }
    },
    [bottomOpacity, chrome, lastY, topOpacity],
  );

  return { onScroll, topOpacity, bottomOpacity };
}

type ScrollEdgesProps = ReturnType<typeof useScrollEdges> & {
  /** Clearance above the bottom fade — the tab bar's height, where there is one. */
  bottomOffset?: number;
};

/**
 * Renders the two fades. Place as a sibling *after* the scroll view, inside the
 * same relatively-positioned parent, so it paints on top.
 */
export function ScrollEdges({ topOpacity, bottomOpacity, bottomOffset = 0 }: ScrollEdgesProps) {
  const { gradients } = useTheme();

  const topStyle = useAnimatedStyle(() => ({ opacity: topOpacity.value }));
  const bottomStyle = useAnimatedStyle(() => ({ opacity: bottomOpacity.value }));

  return (
    <>
      <AnimatedGradient
        colors={gradients.edgeFade}
        style={[styles.top, topStyle]}
        pointerEvents="none"
      />
      <AnimatedGradient
        colors={gradients.edgeFade}
        // Reversed, so the solid end sits against the bottom edge.
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[styles.bottom, { bottom: bottomOffset }, bottomStyle]}
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: FADE_HEIGHT,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
});
