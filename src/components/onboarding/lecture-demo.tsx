import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Cleveft, performed rather than described.
 *
 * <p>Headspace's onboarding makes you breathe before it tells you anything about
 * meditation — you have used the product before you have been sold it. This is
 * the same move: a waveform listens, the lecturer's words appear under it, a
 * question is asked of them, and an answer comes back citing the moment it came
 * from. Record, transcribe, ask, cite — the entire product in about eight
 * seconds, with nothing to read first.
 *
 * <p>Scripted, not live. A real microphone would be more striking, but it needs
 * permission before the student has an account, and a denial would leave the
 * first screen of the app broken. This runs identically every time, which also
 * makes it safe to put on a projector.
 */

/** Deliberately a real sentence from a real subject, not lorem ipsum. */
const TRANSCRIPT = 'A candidate key is a superkey with no redundant attributes…';
const QUESTION = 'What makes a key minimal?';
const ANSWER = 'No attribute can be removed without losing uniqueness.';

const BAR_COUNT = 28;
const TYPE_MS = 34;

/** One bar of the waveform. */
function Bar({ index }: { index: number }) {
  const styles = useThemedStyles(createStyles);
  const height = useSharedValue(0.2);

  useEffect(() => {
    /*
     * Each bar gets its own duration, derived from its index.
     *
     * A shared timing makes twenty-eight bars pulse as one block, which reads as
     * a loading indicator. Speech does not do that — it is uneven across the
     * spectrum at any instant, and the unevenness is what makes this read as a
     * voice rather than as a progress bar.
     */
    const speed = 380 + ((index * 97) % 260);
    const peak = 0.35 + ((index * 53) % 65) / 100;

    height.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: speed, easing: Easing.out(Easing.quad) }),
        withTiming(0.18, { duration: speed * 0.9, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [height, index]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: height.value }] }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function LectureDemo() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const [typed, setTyped] = useState('');
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    /*
     * One timeline, restarted from the top when it finishes.
     *
     * Held in a ref and cleared on unmount because a student who taps through
     * quickly would otherwise leave a typewriter running against a screen that
     * has gone, which sets state on an unmounted component.
     */
    const run = () => {
      setTyped('');
      setStage(0);

      for (let i = 1; i <= TRANSCRIPT.length; i++) {
        timers.current.push(
          setTimeout(() => setTyped(TRANSCRIPT.slice(0, i)), 700 + i * TYPE_MS),
        );
      }

      const typingDone = 700 + TRANSCRIPT.length * TYPE_MS;
      timers.current.push(setTimeout(() => setStage(1), typingDone + 500));
      timers.current.push(setTimeout(() => setStage(2), typingDone + 1400));
      timers.current.push(setTimeout(run, typingDone + 6200));
    };

    run();
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  return (
    <View style={styles.root}>
      {/* Listening */}
      <View style={styles.waveRow}>
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <Bar key={index} index={index} />
        ))}
      </View>

      {/* Becoming text. The caret sits at the end while it types, and the line
          holds its height from the start so nothing below it jumps. */}
      <View style={styles.transcriptWrap}>
        <Text style={styles.transcript}>
          {typed}
          {typed.length < TRANSCRIPT.length ? (
            <Text style={styles.caret}>▍</Text>
          ) : null}
        </Text>
      </View>

      {/* Being asked */}
      <View style={styles.thread}>
        {stage >= 1 ? (
          <Animated.View entering={FadeInDown.duration(320).springify()} style={styles.questionRow}>
            <View style={styles.question}>
              <Text style={styles.questionText}>{QUESTION}</Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.questionPlaceholder} />
        )}

        {stage >= 2 ? (
          <Animated.View entering={FadeIn.duration(360)} style={styles.answer}>
            <Text style={styles.answerText}>{ANSWER}</Text>
            {/* The citation is the point. Every other tool can answer; this one
                can tell you where the answer came from. */}
            <View style={styles.citation}>
              <View style={[styles.citationDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.citationText}>CSM 252 · Databases · 14:20</Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.answerPlaceholder} />
        )}
      </View>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 76,
    gap: 3,
  },
  bar: {
    flex: 1,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: c.accentVivid,
  },
  // Reserves two lines from the outset. Growing the box as the text arrives
  // would shove the thread below it down mid-animation.
  transcriptWrap: {
    minHeight: 52,
    justifyContent: 'center',
  },
  transcript: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 24,
  },
  caret: {
    color: c.accent,
  },
  thread: {
    gap: spacing.md,
  },
  questionRow: {
    alignItems: 'flex-end',
  },
  question: {
    backgroundColor: c.accentSoft,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '86%',
  },
  questionText: {
    ...typography.bodyStrong,
    color: c.text,
  },
  questionPlaceholder: {
    height: 46,
  },
  answer: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    maxWidth: '92%',
  },
  answerText: {
    ...typography.body,
    color: c.text,
    lineHeight: 22,
  },
  citation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  citationDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  citationText: {
    ...typography.micro,
    color: c.textMuted,
  },
  answerPlaceholder: {
    height: 84,
  },
});
