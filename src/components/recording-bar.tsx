import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { useRecording } from '@/state/recording-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const BAR_HEIGHT = 54;
/** How faint it goes once left alone. */
const IDLE_OPACITY = 0.42;
/** How long it stays solid after being touched. */
const WAKE_MS = 2600;
/** Ignore movements shorter than this, so taps still reach the buttons. */
const DRAG_SLOP = 12;
/** Detailed mode only. Four bars read as motion without fidgeting. */
const BARS = 4;
const BAR_WEIGHTS = [0.55, 1, 0.75, 0.4];

function clock(millis: number): string {
  const total = Math.max(0, Math.floor(millis / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * The recording that follows you.
 *
 * <p>A lecture does not stop being important because the student left the
 * record tab. They look a definition up, ask the chatbot something, check the
 * board — and until now the app gave no sign that anything was still running,
 * and no way to stop it without navigating back. This is the thin, permanent
 * answer: what is happening, for how long, and the two controls that matter,
 * one tap from wherever they are.
 *
 * <p>Mounted outside the router and positioned absolutely, so it is not part of
 * anything that scrolls: screens move underneath it and it holds still. That
 * also puts it above every route rather than only the five tabs.
 *
 * <p>Which creates the problem it then has to solve. Anything floating over a
 * screen is covering something, and a translucent one covers it just as
 * thoroughly — you can see the button underneath and still not press it, since
 * the touch lands here. Fading is therefore only half the answer; being movable
 * is the other half. It goes quiet when left alone, wakes on contact, and drags
 * out of the way of whatever it is sitting on.
 *
 * <p>Sized to its contents rather than the screen, because a full-width bar can
 * only ever move up and down — and whichever row it lands on, it owns. A pill
 * covers a fifth of that and can be parked in a corner. It drags anywhere and
 * settles against the nearer side, so it tidies itself instead of floating in
 * the middle of the screen at whatever angle it was let go.
 */
export function RecordingBar() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const {
    isActive,
    paused,
    durationMillis,
    level,
    uploading,
    pause,
    resume,
    stopAndUpload,
    discard,
    barDetail,
  } = useRecording();

  const detailed = barDetail === 'detailed';

  const visible = (isActive || uploading) && pathname !== '/record';

  const restingTop = insets.top + spacing.sm;
  const pillWidth = useSharedValue(0);
  // Kept clear of the tab bar at the bottom and the status bar at the top.
  const lowest = Math.max(0, height - restingTop - BAR_HEIGHT - insets.bottom - 96);

  // ---- fading ------------------------------------------------------------

  const wake = useSharedValue(1);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stayAwake = useCallback(() => {
    wake.value = withTiming(1, { duration: 120 });
    if (sleepTimer.current) {
      clearTimeout(sleepTimer.current);
    }
    sleepTimer.current = setTimeout(() => {
      wake.value = withTiming(IDLE_OPACITY, { duration: 450 });
    }, WAKE_MS);
  }, [wake]);

  useEffect(() => {
    if (visible) {
      stayAwake();
    }
    return () => {
      if (sleepTimer.current) {
        clearTimeout(sleepTimer.current);
      }
    };
  }, [visible, stayAwake]);

  // ---- entry and dragging ------------------------------------------------

  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withSpring(visible ? 1 : 0, { damping: 18, stiffness: 180 });
  }, [visible, rise]);

  const offsetX = useSharedValue(0);
  // Parked on the right by default: most people hold a phone in their right
  // hand, and the left is where headers put their titles.
  const placed = useRef(false);
  const offsetY = useSharedValue(0);
  const grabbedX = useSharedValue(0);
  const grabbedY = useSharedValue(0);

  const drag = Gesture.Pan()
    .minDistance(DRAG_SLOP)
    .onStart(() => {
      grabbedX.value = offsetX.value;
      grabbedY.value = offsetY.value;
      runOnJS(stayAwake)();
    })
    .onUpdate((event) => {
      const furthestRight = Math.max(0, width - pillWidth.value - spacing.lg * 2);
      offsetX.value = Math.min(
        furthestRight,
        Math.max(0, grabbedX.value + event.translationX),
      );
      offsetY.value = Math.min(lowest, Math.max(0, grabbedY.value + event.translationY));
    })
    .onEnd(() => {
      // Settles against whichever side it is nearer, rather than staying where
      // a finger happened to leave it.
      const furthestRight = Math.max(0, width - pillWidth.value - spacing.lg * 2);
      const nearerRight = offsetX.value > furthestRight / 2;
      offsetX.value = withSpring(nearerRight ? furthestRight : 0, {
        damping: 20,
        stiffness: 200,
      });
      runOnJS(stayAwake)();
    });

  const shell = useAnimatedStyle(() => ({
    opacity: rise.value * wake.value,
    transform: [
      { translateX: offsetX.value },
      { translateY: (1 - rise.value) * -24 + offsetY.value },
    ],
  }));

  // ---- the live dot ------------------------------------------------------

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isActive && !paused && !uploading) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 180 });
    }
    return () => cancelAnimation(pulse);
  }, [isActive, paused, uploading, pulse]);

  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (!visible) {
    return null;
  }

  const label = uploading ? 'Uploading' : paused ? 'Paused' : 'Recording';

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[styles.wrap, { paddingTop: restingTop }, shell]}
        pointerEvents="box-none"
      >
        <Pressable
          onPressIn={stayAwake}
          onPress={() => {
            haptics.tap();
            router.push('/record');
          }}
          style={styles.bar}
          onLayout={(event) => {
            const measured = event.nativeEvent.layout.width;
            pillWidth.value = measured;
            if (!placed.current) {
              placed.current = true;
              offsetX.value = Math.max(0, width - measured - spacing.lg * 2);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${clock(durationMillis)}. Open the recorder. Drag to move.`}
        >
          <Animated.View style={[styles.dot, dot]} />

          {/* Compact leaves the word out: the dot says live or held and the
              buttons say what they do, so naming it is a third telling of the
              same thing — and that room is what makes this a pill and not a
              bar. Detailed puts it back for anyone who wants it. */}
          {detailed ? (
            <View style={styles.meter}>
              {Array.from({ length: BARS }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.meterBar,
                    {
                      height:
                        paused || uploading
                          ? 4
                          : 4 + Math.min(1, level * BAR_WEIGHTS[index] * 1.6) * 14,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          {detailed ? (
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          ) : null}

          <Text style={styles.time} numberOfLines={1}>
            {clock(durationMillis)}
          </Text>

          {uploading ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
          ) : (
            <View style={styles.actions}>
              <Pressable
                onPressIn={stayAwake}
                onPress={() => {
                  haptics.tap();
                  Alert.alert(
                    'Discard this recording?',
                    'The audio will be thrown away and nothing will be transcribed.',
                    [
                      { text: 'Keep recording', style: 'cancel' },
                      { text: 'Discard', style: 'destructive', onPress: () => void discard() },
                    ],
                  );
                }}
                style={styles.ghostAction}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Discard this recording"
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </Pressable>

              <Pressable
                onPressIn={stayAwake}
                onPress={() => {
                  haptics.tap();
                  if (paused) {
                    resume();
                  } else {
                    pause();
                  }
                }}
                style={styles.ghostAction}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={paused ? 'Resume recording' : 'Pause recording'}
              >
                <Ionicons name={paused ? 'play' : 'pause'} size={16} color={colors.text} />
              </Pressable>

              <Pressable
                onPressIn={stayAwake}
                onPress={() => {
                  haptics.commit();
                  void stopAndUpload();
                }}
                style={styles.stopAction}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Finish and upload this lecture"
              >
                <Ionicons name="square" size={13} color={colors.onFillPrimary} />
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    // Absolute, and outside every ScrollView in the app — which is the whole
    // point. Screens scroll beneath it; it does not move.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    // iOS stacks by order, Android by elevation. Both are needed for this to
    // sit above native screen content rather than behind it.
    zIndex: 50,
    elevation: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    // Sized by its contents, not stretched to the screen.
    alignSelf: 'flex-start',
    gap: spacing.md,
    height: BAR_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: c.danger,
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 30,
  },
  meterBar: {
    width: 3,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
  },
  label: {
    ...typography.caption,
    color: c.text,
    fontWeight: '600',
  },
  time: {
    ...typography.caption,
    color: c.text,
    fontWeight: '600',
    // Tabular, so the bar does not twitch sideways every second.
    fontVariant: ['tabular-nums'],
  },
  spinner: {
    width: 28,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghostAction: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSunken,
  },
  stopAction: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.fillPrimary,
  },
});
