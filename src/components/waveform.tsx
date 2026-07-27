import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const BAR_COUNT = 48;
/** One bar per frame, so this also sets how much time the trace spans. */
const FRAME_MS = 110;
const WINDOW_SECONDS = Math.round((BAR_COUNT * FRAME_MS) / 1000);
const MIN_SCALE = 0.06;

interface WaveformProps {
  /** Normalised 0-1 input level. */
  level: number;
  active: boolean;
  /** Recording is up but held. The trace freezes rather than resetting. */
  paused?: boolean;
  height?: number;
}

/**
 * Live recording visualiser.
 *
 * Bars scroll right-to-left as a rolling history of input level, so the shape
 * on screen is the last few seconds of the room rather than a decorative
 * animation. Bars grow from the centre in both directions — the mirrored form
 * reads as a waveform rather than a bar chart, and it stays legible when the
 * room is quiet and every bar collapses to a dot.
 *
 * Colour tracks amplitude: quiet passages sit dim, loud ones brighten to full
 * accent. That gives the trace a second channel of information, so a glance
 * tells you whether the mic is actually picking the lecturer up.
 */
export function Waveform({ level, active, paused = false, height = 88 }: WaveformProps) {
  const styles = useThemedStyles(createStyles);
  // One shared value holding the whole trace, rather than React state: the
  // interval writes 9 times a second, and re-rendering 48 views at that rate
  // is what makes a visualiser stutter on a mid-range phone. Nothing here
  // crosses back onto the JS thread once it is running.
  const bars = useSharedValue<number[]>(new Array(BAR_COUNT).fill(MIN_SCALE));

  // Lets the interval read the newest level without restarting on every
  // metering update — which arrives dozens of times a second.
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    if (!active || paused) {
      return;
    }

    const timer = setInterval(() => {
      const next = bars.value.slice(1);
      // A little jitter: real speech is never a flat line, and metering
      // averages hard enough that a steady voice reads as a solid block.
      const jitter = 0.86 + Math.random() * 0.28;
      next.push(Math.max(MIN_SCALE, Math.min(1, levelRef.current * jitter)));
      bars.value = next;
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, [active, bars, paused]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.container, { height }]}>
        {/* A hairline through the middle keeps the two halves reading as one
            waveform when the room goes quiet and the bars shrink to dots. */}
        <View style={styles.centreLine} pointerEvents="none" />

        {new Array(BAR_COUNT).fill(0).map((_, index) => (
          <WaveBar
            key={index}
            bars={bars}
            index={index}
            maxHeight={height}
            active={active}
            paused={paused}
          />
        ))}
      </View>

      {/* Only once there is a recording to measure. A time ruler under a flat
          idle line labels an axis that has nothing on it, which is most of
          what made this screen feel like scattered parts. */}
      {active ? (
        <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={styles.ruler}>
          <Text style={styles.rulerLabel}>-{WINDOW_SECONDS}s</Text>
          <View style={styles.rulerTicks} pointerEvents="none">
            {new Array(11).fill(0).map((_, index) => (
              <View key={index} style={[styles.tick, index % 5 === 0 && styles.tickMajor]} />
            ))}
          </View>
          <Text style={[styles.rulerLabel, !paused && styles.rulerLabelLive]}>now</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * A single bar, animated on the UI thread.
 *
 * Split into its own component because a hook cannot be called in a loop — and
 * keeping the animated style per-bar means one bar changing does not re-run the
 * other 47.
 */
function WaveBar({
  bars,
  index,
  maxHeight,
  active,
  paused,
}: {
  bars: { value: number[] };
  index: number;
  maxHeight: number;
  active: boolean;
  paused: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // Fade the ends so the trace slides in and out rather than clipping at the
  // card edge.
  const edgeDistance = Math.min(index, BAR_COUNT - 1 - index);
  const edgeFade = Math.min(1, 0.4 + edgeDistance / 7);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = bars.value[index] ?? MIN_SCALE;

    return {
      // Timed to the frame interval: each bar eases into the value its
      // right-hand neighbour just held, which is what turns a row of jumping
      // rectangles into a trace that appears to travel.
      height: withTiming(Math.max(3, scale * maxHeight), { duration: FRAME_MS }),
      backgroundColor: interpolateColor(
        scale,
        [MIN_SCALE, 0.45, 1],
        [colors.waveDim, colors.accentDim, colors.wave],
      ),
      opacity: withTiming(active && !paused ? edgeFade : 0.22, { duration: 220 }),
      transform: [{ scaleX: withTiming(interpolate(scale, [0, 1], [0.7, 1]), { duration: 220 }) }],
    };
  }, [active, paused, maxHeight]);

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

/**
 * Converts expo-audio's dBFS metering into a 0-1 level.
 *
 * Metering is logarithmic and mostly lives between -60dB (near silence) and
 * 0dB (clipping); mapping the full -160dB range would leave normal speech
 * sitting flat against the floor.
 */
export function normaliseMetering(metering: number | undefined | null): number {
  if (metering == null || !Number.isFinite(metering)) {
    return MIN_SCALE;
  }
  const floor = -60;
  const clamped = Math.max(floor, Math.min(0, metering));
  return Math.max(MIN_SCALE, (clamped - floor) / -floor);
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    // The recorder card centres its children, which leaves an auto-width row
    // sized to its content — and every bar here is `flex: 1`, so that content
    // is zero wide and the whole visualiser disappears. Stretching pins it to
    // the card's full width so the bars have something to divide up.
    alignSelf: 'stretch',
    width: '100%',
  },
  /*
   * White-alpha, not a palette border.
   *
   * These three hairlines sit on the recorder's ink slab, which is dark in
   * *both* schemes — so a border token picked for the page background is wrong
   * in one of them every time. In dark mode `borderMuted` is white at 6% and
   * the ruler all but vanished against the slab. A fixed alpha over ink is
   * correct in both, because the surface underneath is the same colour in both.
   */
  centreLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bar: {
    flex: 1,
    borderRadius: radius.pill,
    minHeight: 3,
  },
  ruler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rulerTicks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tick: {
    width: StyleSheet.hairlineWidth * 2,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radius.pill,
  },
  tickMajor: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  rulerLabel: {
    ...typography.micro,
    color: c.textOnInkMuted,
    fontVariant: ['tabular-nums'],
  },
  rulerLabelLive: {
    color: c.accentVivid,
  },
});
