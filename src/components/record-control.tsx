import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The one thing this screen exists for, so it gets the size to say so. At 88 it
 * read as timid against a full-width card; 108 makes it the obvious target
 * without crowding the flanking controls, which stay at 48 to keep the
 * hierarchy between "the action" and "adjustments to it" unambiguous.
 */
const BUTTON = 108;
const MORPH_SPRING = { damping: 16, stiffness: 160, mass: 0.6 } as const;

export type RecorderPhase = 'idle' | 'recording' | 'paused' | 'uploading';

interface RecordControlProps {
  phase: RecorderPhase;
  /** Live 0-1 input level, used to breathe the halo with the room. */
  level?: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * The transport row: hold, the record button itself, discard.
 *
 * The centre control morphs rather than swapping icons — the circle squares off
 * into a stop glyph on the same surface, so it reads as one control changing
 * state instead of two buttons trading places. A ring expands out of it while
 * live, which is the screen's only continuously moving element and therefore
 * unambiguously means "audio is being captured right now".
 *
 * Pause and discard only appear once there is a recording to act on. Showing
 * them greyed out from the start would put two dead controls either side of the
 * one thing the student came here to press.
 */
export function RecordControl({
  phase,
  level = 0,
  onStart,
  onStop,
  onPause,
  onResume,
  onDiscard,
}: RecordControlProps) {
  const { colors, glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const live = phase === 'recording';
  const armed = phase === 'recording' || phase === 'paused';
  const uploading = phase === 'uploading';

  const press = usePressScale(0.94, !uploading);
  const morph = useSharedValue(0);
  const ring = useSharedValue(0);
  const amplitude = useSharedValue(0);

  useEffect(() => {
    morph.value = withSpring(armed ? 1 : 0, MORPH_SPRING);
  }, [armed, morph]);

  // Eased rather than assigned straight: metering is jittery, and a halo that
  // tracks it frame-for-frame vibrates instead of breathing.
  useEffect(() => {
    amplitude.value = withTiming(live ? level : 0, { duration: 160 });
  }, [amplitude, level, live]);

  useEffect(() => {
    if (live) {
      ring.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(ring);
      ring.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(ring);
  }, [live, ring]);

  // The two glyphs cross-fade and counter-rotate slightly, so mic and stop
  // read as one control turning over rather than two icons swapping.
  const micStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.5], [1, 0], 'clamp'),
    transform: [
      { scale: interpolate(morph.value, [0, 1], [1, 0.6]) },
      { rotate: `${interpolate(morph.value, [0, 1], [0, -35])}deg` },
    ],
  }));

  const stopStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.5, 1], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(morph.value, [0, 1], [0.6, 1]) },
      { rotate: `${interpolate(morph.value, [0, 1], [35, 0])}deg` },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.55]) }],
  }));

  // Swells with the room. This is the piece that ties the button to the
  // waveform above it — the same signal driving both.
  const levelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(amplitude.value, [0, 1], [0, 0.28]),
    transform: [{ scale: interpolate(amplitude.value, [0, 1], [1, 1.32]) }],
  }));

  return (
    <View style={styles.row}>
      <SideButton
        icon={phase === 'paused' ? 'play' : 'pause'}
        label={phase === 'paused' ? 'Resume' : 'Hold'}
        onPress={phase === 'paused' ? onResume : onPause}
        visible={armed && !uploading}
      />

      <View style={styles.centre}>
        <Animated.View pointerEvents="none" style={[styles.levelHalo, levelStyle]} />
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />

        <Animated.View style={[press.animatedStyle, !armed && glow.accent]}>
          <Pressable
            onPress={armed ? onStop : onStart}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={armed ? 'Stop and save recording' : 'Start recording'}
            {...press.handlers}
            style={[styles.button, armed && styles.buttonArmed, uploading && styles.buttonDisabled]}
          >
            <Animated.View style={[styles.glyphLayer, micStyle]}>
              <Ionicons name="mic" size={42} color={colors.textOnAccent} />
            </Animated.View>
            <Animated.View style={[styles.glyphLayer, stopStyle]}>
              <Ionicons name="stop" size={36} color={colors.danger} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      <SideButton
        icon="trash-outline"
        label="Discard"
        onPress={onDiscard}
        visible={armed && !uploading}
        tone="danger"
      />
    </View>
  );
}

/**
 * A flanking control. Kept mounted and faded rather than unmounted, so the
 * centre button never shifts sideways when the sides appear mid-press.
 */
function SideButton({
  icon,
  label,
  onPress,
  visible,
  tone = 'neutral',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  visible: boolean;
  tone?: 'neutral' | 'danger';
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const press = usePressScale(0.92, visible);
  const isDanger = tone === 'danger';

  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 220 }),
    transform: [{ scale: withTiming(visible ? 1 : 0.85, { duration: 220 }) }],
  }));

  return (
    <Animated.View style={[styles.side, style, press.animatedStyle]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        disabled={!visible}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...press.handlers}
        style={[styles.sideButton, isDanger && styles.sideButtonDanger]}
      >
        {/* Light mode's `accent` is a deep cyan picked to be readable *on
            white*; on the ink slab it is nearly the same value as the wash
            behind it. The icon takes the on-ink colour instead. */}
        <Ionicons name={icon} size={18} color={isDanger ? colors.danger : colors.textOnInk} />
      </Pressable>
      <Text style={[styles.sideLabel, isDanger && styles.sideLabelDanger]}>{label}</Text>
    </Animated.View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  side: {
    width: 72,
    alignItems: 'center',
    gap: spacing.sm,
  },
  // These flank the mic on the recorder's ink slab, so they take a white wash
  // rather than `surfaceSunken` — which is a near-black fill chosen to sit
  // *inside a light card* and would disappear against ink entirely.
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  sideButtonDanger: {
    backgroundColor: c.dangerSoft,
  },
  sideLabel: {
    ...typography.micro,
    color: c.textOnInkMuted,
  },
  sideLabelDanger: {
    color: c.danger,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: c.danger,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentVivid,
  },
  buttonArmed: {
    backgroundColor: c.dangerSoft,
    borderWidth: 2,
    borderColor: c.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  levelHalo: {
    position: 'absolute',
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.pill,
    backgroundColor: c.danger,
  },
  // Both glyphs occupy the same cell so the cross-fade happens in place
  // instead of one nudging the other.
  glyphLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
