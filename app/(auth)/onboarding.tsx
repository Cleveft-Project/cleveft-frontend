import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { Kofi } from '@/components/kofi';
import { NeonButton } from '@/components/neon-button';
import { LectureDemo } from '@/components/onboarding/lecture-demo';
import { useTypewriter } from '@/components/onboarding/use-typewriter';
import { Screen } from '@/components/screen';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * What Cleveft is, before anyone is asked for anything.
 *
 * <p>Three pages, and the first one does the work: it performs the product
 * rather than claiming things about it. Nobody arrives at a study app wanting to
 * read a feature list, and a student deciding whether this is worth an account
 * is better served by eight seconds of watching it work.
 *
 * <p>This runs before sign-up on purpose. Its job is to convince someone who has
 * not committed — shown after registration it would be preaching to the
 * converted, which is where most apps put it and why most onboarding gets
 * skipped.
 */

interface Page {
  key: string;
  title: string;
  copy: string;
}

/*
 * Six screens, one capability each.
 *
 * Three was not enough to explain a product that records, transcribes,
 * organises, answers, tests and connects. A student who swiped through and
 * still could not say what Cleveft *does* had been shown a mood, not a
 * product — so each page now carries exactly one claim, and every claim is
 * demonstrated rather than asserted.
 */
const PAGES: Page[] = [
  {
    key: 'demo',
    title: 'Every lecture, remembered',
    copy: 'Record it once. Then ask it anything, for the rest of the semester.',
  },
  {
    key: 'organise',
    title: 'It writes the notes for you',
    copy: 'Cleveft turns the recording into structured notes, and pulls out the formulas and definitions worth keeping.',
  },
  {
    key: 'ask',
    title: 'Ask, and get the lecturer back',
    copy: 'Answers come from what was actually said in your lecture, with the moment it was said.',
  },
  {
    key: 'gaps',
    title: 'Find the gaps before the exam does',
    copy: 'Quizzes written from your own lectures show what has stuck and what has not.',
  },
  {
    key: 'peers',
    title: 'Nobody revises alone',
    copy: 'Share what worked with your coursemates, and pick up what worked for them.',
  },
  {
    key: 'kofi',
    title: 'Kofi does the remembering',
    copy: 'He sits in every lecture with you, and he never misses a word.',
  },
];

/** Notes writing themselves out of the transcript. */
function NotesArt() {
  const styles = useThemedStyles(createStyles);

  // Typed in sequence, each starting where the last finished, so it reads as
  // one pass of note-taking rather than three things appearing at once.
  const heading = useTypewriter('Candidate keys', { speed: 46, delay: 260 });
  const first = useTypewriter('A superkey with no redundant attribute', {
    speed: 26,
    delay: 1100,
  });
  const second = useTypewriter('Every attribute is needed for uniqueness', {
    speed: 26,
    delay: 2300,
  });

  return (
    <View style={styles.notes}>
      <View style={styles.noteBlock}>
        <View style={styles.noteHeadRow}>
          <Text style={styles.noteHeading}>
            {heading.typed}
            {heading.typing ? <Text style={styles.caret}>▍</Text> : null}
          </Text>
          {heading.done ? (
            <Animated.View entering={FadeIn.duration(280)} style={styles.conceptChip}>
              <Text style={styles.conceptText}>Definition</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.noteBullets}>
          <Bullet text={first.typed} typing={first.typing} />
          <Bullet text={second.typed} typing={second.typing} />
        </View>
      </View>

      {second.done ? (
        <Animated.View entering={FadeInUp.duration(420).springify()} style={styles.noteBlock}>
          <Text style={styles.noteHeadingMuted}>Normal forms</Text>
          <View style={styles.noteBullets}>
            <Bullet text="1NF → 2NF → 3NF" typing={false} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One note line. Reserves its height so the block does not grow as it types. */
function Bullet({ text, typing }: { text: string; typing: boolean }) {
  const styles = useThemedStyles(createStyles);
  if (!text) {
    return <View style={styles.bulletPlaceholder} />;
  }
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>
        {text}
        {typing ? <Text style={styles.caret}>▍</Text> : null}
      </Text>
    </View>
  );
}

/** A question being asked, and an answer coming back with its source. */
function AskArt() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  // The question types first, the way a student writes it. The answer follows
  // after a pause long enough to read as the app thinking, then the citation.
  const question = useTypewriter('Why does 3NF matter?', { speed: 44, delay: 300 });
  const answer = useTypewriter(
    'It removes transitive dependencies, so a fact is stored once and cannot contradict itself.',
    { speed: 20, delay: 2000 },
  );

  return (
    <View style={styles.askWrap}>
      <View style={styles.askQuestionRow}>
        <View style={styles.askQuestion}>
          <Text style={styles.askQuestionText}>
            {question.typed || ' '}
            {question.typing ? <Text style={styles.caret}>▍</Text> : null}
          </Text>
        </View>
      </View>

      {question.done ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.askAnswer}>
          <Text style={styles.askAnswerText}>
            {answer.typed || 'Looking through your lecture…'}
            {answer.typing ? <Text style={styles.caret}>▍</Text> : null}
          </Text>

          {/* The citation lands last, because it is the proof rather than the
              answer — and it is the thing that makes this Cleveft and not a
              chatbot. */}
          {answer.done ? (
            <Animated.View entering={FadeIn.duration(360)} style={styles.askCite}>
              <View style={[styles.askDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.askCiteText}>CSM 252 · Databases · 22:14</Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Kofi, introducing himself.
 *
 * <p>He was mounted with `flying` and left there, which animates his wings and
 * nothing else — the container has to move him, or a flying bird looks like one
 * held in place. Here he crosses a real arc and says hello while he does it, so
 * the page has a subject doing something rather than a mascot on display.
 */
function KofiArt() {
  const styles = useThemedStyles(createStyles);

  const drift = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    // Slower than the rise and fall, so the two never line up into one motion.
    sway.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(drift);
      cancelAnimation(sway);
    };
  }, [drift, sway]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value * 22 },
      { translateX: sway.value * 16 },
      { rotate: `${sway.value * 5}deg` },
    ],
  }));

  const line = useTypewriter("Hello — I'm Kofi. I'll be in every lecture with you.", {
    speed: 34,
    delay: 500,
  });

  return (
    <View style={styles.kofiWrap}>
      <Animated.View style={style}>
        <Kofi mood="idle" size={168} flying grounded={false} />
      </Animated.View>

      <View style={styles.kofiBubble}>
        <Text style={styles.kofiBubbleText}>
          {line.typed || ' '}
          {line.typing ? <Text style={styles.caret}>▍</Text> : null}
        </Text>
      </View>
    </View>
  );
}

/** Peers, and a path passing between them. */
function PeersArt() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const people = ['AD', 'KO', 'MB', 'YT'];

  return (
    <View style={styles.peersWrap}>
      <View style={styles.peerRow}>
        {people.map((initials, index) => (
          <Animated.View
            key={initials}
            entering={FadeInUp.delay(index * 120).duration(420).springify()}
            style={[styles.peer, index > 0 && styles.peerOverlap]}
          >
            <Text style={styles.peerText}>{initials}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeIn.delay(560).duration(420)} style={styles.pathCard}>
        <View style={styles.pathHead}>
          <Ionicons name="git-branch-outline" size={15} color={colors.accent} />
          <Text style={styles.pathTitle}>How I finally got keys</Text>
        </View>
        <Text style={styles.pathCopy}>Four questions, in the order that made it click.</Text>
      </Animated.View>
    </View>
  );
}

/** The fourth page: mastery, shown rather than asserted. */
function GapsArt() {
  const styles = useThemedStyles(createStyles);

  const topics: { label: string; state: 'strong' | 'weak' | 'untouched' }[] = [
    { label: 'Functional dependencies', state: 'strong' },
    { label: 'Normalisation', state: 'weak' },
    { label: 'Candidate keys', state: 'strong' },
    { label: 'Transactions', state: 'untouched' },
    { label: 'Indexing', state: 'weak' },
  ];

  return (
    <View style={styles.gaps}>
      {topics.map((topic, index) => (
        <Animated.View
          key={topic.label}
          entering={FadeInUp.delay(120 * index).duration(420).springify()}
          style={[
            styles.topic,
            topic.state === 'strong' && styles.topicStrong,
            topic.state === 'weak' && styles.topicWeak,
          ]}
        >
          <Text
            style={[
              styles.topicText,
              topic.state === 'untouched' && styles.topicTextMuted,
            ]}
          >
            {topic.label}
          </Text>
          <Text style={styles.topicState}>
            {topic.state === 'strong'
              ? 'Understood'
              : topic.state === 'weak'
                ? 'Go back over'
                : 'Not revised'}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();

  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== page) {
      haptics.tap();
      setPage(next);
    }
  };

  const advance = () => {
    if (last) {
      router.push('/sign-up');
      return;
    }
    scroller.current?.scrollTo({ x: (page + 1) * SCREEN_W, animated: true });
  };

  return (
    <Screen edges={['top', 'bottom']} blob="violet">
      {/* Skip stays available throughout. Someone who already knows what this is
          should not have to swipe through an advert for it. */}
      <View style={styles.skipRow}>
        <Pressable
          onPress={() => {
            haptics.tap();
            router.push('/sign-up');
          }}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((item, index) => (
          <View key={item.key} style={[styles.page, { width: SCREEN_W }]}>
            {/* Art is mounted only while its page is the current one.
                Every page exists from the moment this screen opens, so an
                `entering` animation fires immediately — off-screen, seconds
                before the student swipes to it. Mounting on arrival is what
                makes the animation happen when there is someone there to see
                it. The first page looked alive only because its demo loops on a
                timer rather than animating once. */}
            <View style={styles.art}>
              {index === page ? (
                <>
                  {item.key === 'demo' ? <LectureDemo /> : null}
                  {item.key === 'organise' ? <NotesArt /> : null}
                  {item.key === 'ask' ? <AskArt /> : null}
                  {item.key === 'gaps' ? <GapsArt /> : null}
                  {item.key === 'peers' ? <PeersArt /> : null}
                  {item.key === 'kofi' ? <KofiArt /> : null}
                </>
              ) : null}
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.copy}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.dot,
              index === page && { backgroundColor: colors.accent, width: 22 },
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <NeonButton label={last ? 'Get started' : 'Next'} onPress={advance} size="lg" />
        {last ? (
          <NeonButton
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/login')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skip: {
    ...typography.caption,
    color: c.textMuted,
    paddingVertical: spacing.xs,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  // Fixed height so the headline sits on the same line across all three pages.
  // Letting each page's art size itself makes the title jump as you swipe,
  // which reads as the pages being unrelated.
  art: {
    height: 340,
    justifyContent: 'center',
  },
  kofiWrap: {
    alignItems: 'center',
  },
  copy: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.display,
    color: c.text,
  },
  body: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: c.borderMuted,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  gaps: {
    gap: spacing.sm,
  },

  /* Notes */
  notes: {
    gap: spacing.lg,
  },
  noteBlock: {
    gap: spacing.sm,
  },
  noteHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  noteHeading: {
    ...typography.bodyStrong,
    color: c.text,
  },
  conceptChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  conceptText: {
    ...typography.micro,
    color: c.accent,
  },
  noteHeadingMuted: {
    ...typography.bodyStrong,
    color: c.textSecondary,
  },
  noteBullets: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  bulletDot: {
    ...typography.body,
    color: c.accent,
    lineHeight: 22,
  },
  bulletText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  // Holds the line's height before anything is typed, so the block does not
  // grow underneath the text as it arrives.
  bulletPlaceholder: {
    height: 22,
  },
  caret: {
    color: c.accent,
  },
  kofiBubble: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    minHeight: 58,
    justifyContent: 'center',
  },
  kofiBubbleText: {
    ...typography.body,
    color: c.text,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Ask */
  askWrap: {
    gap: spacing.md,
  },
  askQuestionRow: {
    alignItems: 'flex-end',
  },
  askQuestion: {
    backgroundColor: c.accentSoft,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '82%',
  },
  askQuestionText: {
    ...typography.bodyStrong,
    color: c.text,
  },
  askAnswer: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  askAnswerText: {
    ...typography.body,
    color: c.text,
    lineHeight: 22,
  },
  askCite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  askDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  askCiteText: {
    ...typography.micro,
    color: c.textMuted,
  },

  /* Peers */
  peersWrap: {
    gap: spacing.xl,
    alignItems: 'center',
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  peer: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: 2,
    borderColor: c.surfaceSolid,
  },
  // Overlapped, the way a group of people is drawn everywhere — it reads as
  // "these are together" rather than as a row of separate items.
  peerOverlap: {
    marginLeft: -14,
  },
  peerText: {
    ...typography.bodyStrong,
    color: c.accent,
  },
  pathCard: {
    alignSelf: 'stretch',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pathHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pathTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  pathCopy: {
    ...typography.micro,
    color: c.textMuted,
  },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  topicStrong: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  topicWeak: {
    borderColor: c.warning,
    backgroundColor: c.warningSoft,
  },
  topicText: {
    ...typography.bodyStrong,
    color: c.text,
    flex: 1,
  },
  topicTextMuted: {
    color: c.textMuted,
  },
  topicState: {
    ...typography.micro,
    color: c.textMuted,
  },
});
