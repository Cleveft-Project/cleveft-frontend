import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import * as Speech from 'expo-speech';

import { BOUNCY, EASE_OUT } from '@/components/animated/motion';
import { Kofi, type KofiMood } from '@/components/kofi';
import { useFeedback } from '@/state/feedback-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The moments Kofi has something to say about.
 *
 * Keyed by situation rather than by mood, because the same mood can want very
 * different words — a 62% and a 98% are both `celebrate`, and congratulating
 * them identically is exactly how a mascot stops sounding like anyone.
 */
export type KofiOccasion =
  | 'quizStrong'
  | 'quizDecent'
  | 'quizWeak'
  | 'chatEmpty'
  | 'chatThinking'
  | 'homeStreakAlive'
  | 'homeStreakAtRisk'
  | 'homeFirstTime';

/**
 * What he says, and why these words.
 *
 * Three rules held throughout:
 *
 * 1. **Several lines per occasion, chosen at random.** A character who says the
 *    identical sentence every single time is a label. Variation is most of what
 *    makes something feel like it has a mind.
 * 2. **Ghanaian, lightly.** "Chale" and "Ei" are how students here actually
 *    talk, and a mascot that speaks like the people using it is worth far more
 *    than a neutral one. Used sparingly — laid on thick it stops being warmth
 *    and becomes costume.
 * 3. **Never scolding.** A bad score gets sympathy and a next step, never
 *    disappointment. Students revising are already anxious, and a mascot that
 *    tuts is the thing people uninstall in exam week.
 */
const LINES: Record<KofiOccasion, string[]> = {
  quizStrong: [
    'Chale, you know this one.',
    'Sharp. That topic is holding up.',
    'Ei! Barely a scratch on you.',
  ],
  quizDecent: [
    'Solid. A few gaps left to close.',
    'Good pass — the rest is detail.',
    'Nearly there. One more run should do it.',
  ],
  quizWeak: [
    'This one is tough. Let us go again.',
    'No wahala — back to the lecture and retry.',
    'Early days on this topic. Nothing lost.',
  ],
  chatEmpty: [
    'Ask me anything from your lectures.',
    'What did the lecturer say? I kept it.',
    'I was listening. Go on, test me.',
  ],
  // One line, not three. The others were rotating in and one of them was the
  // thing he asked to be rid of.
  chatThinking: ["I'm getting your answer for you…"],
  homeStreakAlive: [
    'You are on a run. Keep it.',
    'Back again — I like that.',
    'Good to see you.',
  ],
  homeStreakAtRisk: [
    'Nothing today yet. Shall we?',
    'One quiz keeps the streak alive.',
    'Do not let it drop today.',
  ],
  homeFirstTime: [
    'Record a lecture and I will keep it for you.',
    'Let us start with one lecture.',
    'I go back and get what you missed.',
  ],
};

/** The mood that belongs with each occasion. */
const MOODS: Record<KofiOccasion, KofiMood> = {
  quizStrong: 'celebrate',
  quizDecent: 'celebrate',
  quizWeak: 'encourage',
  chatEmpty: 'idle',
  chatThinking: 'thinking',
  homeStreakAlive: 'celebrate',
  homeStreakAtRisk: 'encourage',
  homeFirstTime: 'idle',
};

/**
 * Picks a line, and keeps it for as long as the occasion lasts.
 *
 * `useMemo` on the occasion rather than a value read at render: without it a
 * re-render mid-celebration would swap the sentence out from under the reader.
 */
export function useKofiLine(occasion: KofiOccasion): string {
  return useMemo(() => {
    const options = LINES[occasion];
    return options[Math.floor(Math.random() * options.length)];
  }, [occasion]);
}

/**
 * How he sounds.
 *
 * Pitch well above natural and a slightly unhurried rate: a small bird, not a
 * screen reader. Raising pitch is the cheapest single thing that turns
 * text-to-speech into a character, because pitch is how we judge the size of
 * whatever is talking.
 */
const SPEECH = { rate: 0.95, pitch: 1.42 } as const;

/**
 * Preferred locales, best first.
 *
 * British leads on a straight product call. Ghanaian English was the obvious
 * first choice on paper, but almost no Android device ships an `en-GH` voice,
 * so in practice the list fell through to whichever African locale happened to
 * be installed — and an accent nobody chose is worse than a familiar one.
 * `en-GB` is widely installed, close to how English is taught and spoken in
 * Ghanaian universities, and predictable.
 *
 * The African locales stay below it: if a device genuinely has `en-GB` missing
 * but `en-NG` present, that is still a better match than falling through to
 * American.
 */
const VOICE_PREFERENCE = ['en-GB', 'en-GH', 'en-NG', 'en-ZA', 'en-KE'];

/**
 * Resolved once per app run and cached — enumerating voices is slow enough
 * that doing it per line would delay the speech noticeably.
 */
let resolvedVoice: string | undefined;
let voiceLookupDone = false;

async function preferredVoice(): Promise<string | undefined> {
  if (voiceLookupDone) {
    return resolvedVoice;
  }
  voiceLookupDone = true;

  try {
    const available = await Speech.getAvailableVoicesAsync();
    for (const locale of VOICE_PREFERENCE) {
      const match = available.find((voice) => voice.language?.startsWith(locale));
      if (match) {
        resolvedVoice = match.identifier;
        return resolvedVoice;
      }
    }
  } catch {
    // No voice list available — the system default still speaks, just without
    // the accent preference.
  }

  return resolvedVoice;
}

/**
 * Every English voice on the device, best locale first.
 *
 * <p>Android ships several voices per locale and they differ enormously — some
 * are the modern neural ones, some are a decade old. Automatic selection takes
 * the first match, which is a coin toss, so this exists to let the student hear
 * them and choose. Non-English voices are filtered out: they can pronounce the
 * words, but not in a way anyone would want to listen to.
 */
export async function availableVoices(): Promise<Speech.Voice[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    const english = all.filter((voice) => voice.language?.toLowerCase().startsWith('en'));

    return english.sort((a, b) => {
      const rank = (voice: Speech.Voice) => {
        const index = VOICE_PREFERENCE.findIndex((locale) =>
          voice.language?.startsWith(locale),
        );
        // Unlisted locales sort after the preferred ones rather than being hidden
        // — en-US is not the house accent, but it is better than silence on a
        // device that has nothing else.
        return index === -1 ? VOICE_PREFERENCE.length : index;
      };
      const byLocale = rank(a) - rank(b);
      return byLocale !== 0 ? byLocale : (a.name ?? '').localeCompare(b.name ?? '');
    });
  } catch {
    return [];
  }
}

/**
 * Speaks one line immediately, for previewing a choice.
 *
 * <p>A sentence long enough to judge a voice on. Two words is not enough to
 * hear pace or where a voice puts its stress, which is what a student is
 * actually choosing between.
 */
export function previewVoice(
  voiceId: string | undefined,
  rate: number,
  line = "Hello, I'm Kofi. I'll help you remember your lectures.",
) {
  Speech.stop();
  Speech.speak(line, { ...SPEECH, rate, voice: voiceId });
}

/**
 * Lines already spoken this run.
 *
 * Module-level rather than component state on purpose: it has to survive a
 * screen unmounting and remounting, which is exactly what happens when a
 * student leaves a tab and comes back.
 */
const spokenThisSession = new Set<string>();

/**
 * Says a line out loud, if the student has switched that on.
 *
 * A hook rather than something buried in {@link KofiSays}, which was the
 * original mistake: `KofiSays` renders on exactly one screen, so wiring speech
 * into it meant the mascot was mute everywhere a line was shown as plain text —
 * the home greeting, the empty chat, the wait for an answer. Anywhere a line
 * appears, this makes it audible.
 *
 * @param line    what to say; re-speaks whenever it changes
 * @param active  false where the line is on screen but not the current moment
 * @param onceKey speak at most once per app run. Pass this for anything tied
 *                to arriving somewhere — a greeting should happen when the app
 *                opens, not every time the student returns to that tab.
 */
export function useKofiSpeech(line: string, active = true, onceKey?: string) {
  const { voice } = useFeedback();
  const enabled = voice.enabled;
  const chosenId = voice.id ?? undefined;
  const rate = voice.rate;

  useEffect(() => {
    if (!enabled || !active || !line) {
      return;
    }
    if (onceKey && spokenThisSession.has(onceKey)) {
      return;
    }

    // Delayed to the same beat the bubble animates in on, so the words arrive
    // with the text rather than ahead of it.
    const timer = setTimeout(() => {
      if (onceKey) {
        spokenThisSession.add(onceKey);
      }
      void (async () => {
        // Stop first: a student moving quickly between screens would otherwise
        // queue several lines and hear them played back to back.
        Speech.stop();
        // A chosen voice wins outright. Falling back to the locale guess only
        // when the student has not picked one.
        Speech.speak(line, {
          ...SPEECH,
          rate,
          voice: chosenId ?? (await preferredVoice()),
        });
      })();
    }, 420);

    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, [active, chosenId, enabled, line, onceKey, rate]);
}

interface KofiSaysProps {
  occasion: KofiOccasion;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Suppresses the bubble; the bird alone still reacts. */
  silent?: boolean;
  /** Fires the particle burst. Only worth it for genuine wins. */
  burst?: boolean;
}

/**
 * Kofi with something to say.
 *
 * The bubble is what turns a moving drawing into a character. It arrives a beat
 * *after* he reacts — reaction first, then comment — because that is the order
 * a person does it in, and getting it the other way round makes the words feel
 * pre-recorded.
 */
export function KofiSays({
  occasion,
  size = 128,
  style,
  silent = false,
  burst = false,
}: KofiSaysProps) {
  const styles = useThemedStyles(createStyles);
  const line = useKofiLine(occasion);
  useKofiSpeech(line, !silent);

  const bubbleScale = useSharedValue(0.6);
  const bubbleOpacity = useSharedValue(0);

  useEffect(() => {
    bubbleScale.value = 0.6;
    bubbleOpacity.value = 0;

    // 420ms: long enough for the hop to have peaked, short enough that it still
    // reads as one moment rather than two.
    bubbleScale.value = withDelay(420, withSpring(1, BOUNCY));
    bubbleOpacity.value = withDelay(420, withTiming(1, { duration: 220, easing: EASE_OUT }));
  }, [bubbleOpacity, bubbleScale, occasion]);


  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.stage}>
        {burst ? <Burst /> : null}
        <Kofi mood={MOODS[occasion]} size={size} />
      </View>

      {silent ? null : (
        <Animated.View style={[styles.bubble, bubbleStyle]}>
          <View style={styles.tail} />
          <Text style={styles.line}>{line}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/** Where each particle flies, in points. Hand-placed rather than random, so the
 *  spray is even and nothing clumps. */
const PARTICLES = [
  { x: -62, y: -34, delay: 0 },
  { x: -38, y: -66, delay: 60 },
  { x: 0, y: -78, delay: 30 },
  { x: 38, y: -66, delay: 90 },
  { x: 62, y: -34, delay: 45 },
  { x: -70, y: 8, delay: 110 },
  { x: 70, y: 8, delay: 75 },
  { x: -28, y: 34, delay: 130 },
  { x: 28, y: 34, delay: 100 },
];

/**
 * A one-shot spray of accent dots.
 *
 * The cheapest possible confetti, and enough: what sells a celebration is
 * something leaving the character outward, not the fidelity of the pieces.
 */
function Burst() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.burst} pointerEvents="none">
      {PARTICLES.map((particle, index) => (
        <Particle key={index} {...particle} index={index} styles={styles} />
      ))}
    </View>
  );
}

function Particle({
  x,
  y,
  delay,
  index,
  styles,
}: {
  x: number;
  y: number;
  delay: number;
  index: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.15 ? progress.value / 0.15 : 1 - (progress.value - 0.15) / 0.85,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { scale: 0.4 + progress.value * 0.9 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        // Alternating so the spray is not one flat colour.
        { backgroundColor: index % 2 === 0 ? colors.accentVivid : colors.warning },
        style,
      ]}
    />
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: radius.pill,
  },
  bubble: {
    marginTop: spacing.sm,
    maxWidth: 260,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
  },
  // A small square rotated 45° and tucked under the bubble's top edge — the
  // standard way to draw a speech tail without a second SVG.
  tail: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    backgroundColor: c.surface,
    borderLeftWidth: StyleSheet.hairlineWidth * 2,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
    transform: [{ rotate: '45deg' }],
  },
  line: {
    ...typography.bodyStrong,
    color: c.text,
    textAlign: 'center',
  },
});
