import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { chatApi, examPrepApi, lecturesApi } from '@/api';
/*
 * No `layout={smoothLayout}` on this screen, deliberately.
 *
 * Home fires five independent requests on focus, and each one landing makes a
 * block appear or resize. With a spring layout transition on every card, every
 * arrival re-animated the whole column — so the screen kept springing around
 * for a second or so after it opened. That is what read as lag; the entrance
 * durations were only part of it. Nothing here reorders, so the transitions
 * were paying for motion nobody asked for.
 */
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { Card } from '@/components/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Kofi, type KofiMood } from '@/components/kofi';
import { useKofiLine, useKofiSpeech, type KofiOccasion } from '@/components/kofi-says';
import { SectionHeader } from '@/components/headers';
import { LectureCard } from '@/components/lecture-card';
import { StatTile } from '@/components/meters';
import { RecordHero } from '@/components/record-hero';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { StreakCard } from '@/components/streak-card';
import { useAsync } from '@/hooks/use-async';
import { computeStreak } from '@/lib/streak';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/** Same day-part split as {@link greeting} — sun by day, moon once it's dark. */
function greetingIcon(): React.ComponentProps<typeof Ionicons>['name'] {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'sunny-outline';
  }
  if (hour < 18) {
    return 'partly-sunny-outline';
  }
  return 'moon-outline';
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user } = useAuth();

  // Tapping the tab you are already on returns you to the top of it — the
  // standard behaviour of every native tab bar, and the only way back up from
  // the bottom of a long list without a lot of swiping. The tab bar already
  // emits `tabPress`; this is what listens for it.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();

  /*
   * The greeting flourish: a ring pulsing out from behind the avatar, the
   * greeting line settling up into place, and the day-part icon giving a
   * small wiggle as it lands.
   *
   * All three are driven by shared values rather than Reanimated `entering`
   * props. `entering` only ever runs on mount, and expo-router keeps a tab
   * screen mounted once visited — so an entering-based settle plays at most
   * once per app launch and looks static forever after. Shared values
   * re-driven on focus replay every visit.
   *
   * The start is pushed behind a frame *and* a short timeout. On a cold
   * reload this screen fires five network reads in the same focus pass; a
   * value assigned in that same tick is set before the header has painted,
   * so the animation ran against nothing and the first thing you ever saw
   * was its resting state.
   */
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const sunRotate = useSharedValue(0);
  const textY = useSharedValue(8);
  const textOpacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      let frame: number | undefined;

      const timer = setTimeout(() => {
        frame = requestAnimationFrame(() => {
          ringScale.value = 0.6;
          ringOpacity.value = 0;
          sunRotate.value = 0;
          textY.value = 8;
          textOpacity.value = 0;

          ringOpacity.value = withSequence(
            withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 640, easing: Easing.out(Easing.cubic) }),
          );
          ringScale.value = withTiming(1.32, { duration: 760, easing: Easing.out(Easing.cubic) });

          textOpacity.value = withDelay(90, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
          textY.value = withDelay(90, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

          sunRotate.value = withDelay(
            300,
            withSequence(
              withTiming(-16, { duration: 170, easing: Easing.inOut(Easing.quad) }),
              withTiming(12, { duration: 170, easing: Easing.inOut(Easing.quad) }),
              withTiming(-8, { duration: 150, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: 150, easing: Easing.inOut(Easing.quad) }),
            ),
          );
        });
      }, 180);

      return () => {
        clearTimeout(timer);
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sunRotate.value}deg` }],
  }));
  const greetingTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const lectures = useAsync(() => lecturesApi.list(), []);
  const stats = useAsync(() => lecturesApi.stats(), []);
  const readiness = useAsync(() => examPrepApi.readiness(), []);
  // Two extra reads purely so the streak counts every kind of studying, not
  // just recording. A streak that only rewarded recordings would break every
  // weekend, when revising is exactly what a student should be doing.
  const attempts = useAsync(() => examPrepApi.attempts(), []);
  const conversations = useAsync(() => chatApi.conversations(), []);

  /**
   * True while the student has just landed on this screen.
   *
   * Drives every one-shot flourish here — the Record button's halo and the
   * streak flame's glow. Reset to false on blur and set true on focus, which
   * is what replays them each visit: the tab stays mounted, so a mount-only
   * animation would fire once ever and never again.
   */
  const [justArrived, setJustArrived] = useState(false);

  // Recording on another tab changes what belongs here, so the dashboard
  // re-reads whenever it comes back into focus rather than only on mount.
  useFocusEffect(
    useCallback(() => {
      void lectures.reload();
      void stats.reload();
      void readiness.reload();
      void attempts.reload();
      void conversations.reload();

      setJustArrived(true);
      return () => setJustArrived(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  /**
   * Every timestamp that proves the student did something, from all three
   * activity sources. Recomputed rather than stored — see src/lib/streak.ts.
   */
  const streak = useMemo(
    () =>
      computeStreak([
        ...(lectures.data ?? []).map((lecture) => lecture.createdAt),
        ...(attempts.data ?? []).map((attempt) => attempt.completedAt),
        ...(conversations.data ?? []).map((conversation) => conversation.updatedAt),
      ]),
    [attempts.data, conversations.data, lectures.data],
  );

  /**
   * What Kofi makes of the state of things, and what he says about it.
   *
   * Driven by the streak rather than the time of day: a mascot that is
   * uniformly delighted has no opinions, and the one thing worth having an
   * opinion about on this screen is whether today has been earned yet.
   */
  const welcomeOccasion: KofiOccasion = streak.atRisk
    ? 'homeStreakAtRisk'
    : streak.current > 0
      ? 'homeStreakAlive'
      : 'homeFirstTime';

  const welcomeLine = useKofiLine(welcomeOccasion);
  // Once per app run. A greeting belongs to arriving, not to every return to
  // this tab — being welcomed again on each switch is the fastest way to make
  // a student turn speech straight back off.
  useKofiSpeech(welcomeLine, true, 'welcome');
  const welcomeMood: KofiMood = welcomeOccasion === 'homeStreakAtRisk' ? 'encourage' : 'idle';

  const refreshing = lectures.isRefreshing || stats.isRefreshing || readiness.isRefreshing;

  const reloadAll = useCallback(() => {
    void lectures.reload();
    void stats.reload();
    void readiness.reload();
    void attempts.reload();
    void conversations.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (lectures.isLoading && !lectures.data) {
    return (
      <Screen>
        <LoadingState label="Loading your dashboard…" />
      </Screen>
    );
  }

  if (lectures.error && !lectures.data) {
    return (
      <Screen>
        <ErrorState message={lectures.error} onRetry={reloadAll} />
      </Screen>
    );
  }

  const allLectures = lectures.data ?? [];
  const recent = allLectures.slice(0, 4);
  const processing = allLectures.filter(
    (lecture) => lecture.status === 'PROCESSING' || lecture.status === 'PENDING',
  );
  /**
   * The weakest *named* course, for a one-line nudge — never a number.
   *
   * Unassessed courses are skipped (they would sort to the top at 0% and hide
   * the course actually in trouble), and so is the ungrouped bucket, which is
   * not a course and whose aggregate score means nothing.
   */
  const needsAttention = (readiness.data?.courses ?? []).find(
    (course) => course.assessed && !!course.courseCode,
  );

  /** Real courses only — "Ungrouped" is a bucket, not a course the student takes. */
  const namedCourses = (readiness.data?.courses ?? []).filter(
    (course) => !!course.courseCode,
  ).length;


  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reloadAll}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* A compact identity strip, not a hero.
            The old two-line greeting took the largest type on the screen to
            tell the student their own name. The display size now goes to the
            hero below, which is the thing they came here to do. */}
        <View style={styles.header}>
          {/* Kofi in place of the initial. He is the first thing on the screen
              and the first thing that moves, which is the whole point of a
              mascot: something is pleased you came back. Still the route into
              settings, so he costs no tap target. */}
          <View style={styles.avatarWrap}>
            <Animated.View pointerEvents="none" style={[styles.avatarRing, ringStyle]} />
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={10}
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
            >
              <Kofi mood={welcomeMood} size={54} grounded={false} />
            </Pressable>
          </View>

          <Animated.View style={[styles.headerText, greetingTextStyle]}>
            <View style={styles.greetingRow}>
              <Animated.View style={sunStyle}>
                <Ionicons name={greetingIcon()} size={15} color={colors.warning} />
              </Animated.View>
              <Text style={styles.name} numberOfLines={1}>
                {greeting()}, {user?.fullName?.split(' ')[0] ?? 'Student'}
              </Text>
            </View>
            <Text style={styles.greeting} numberOfLines={1}>
              {welcomeLine}
            </Text>
            <Text style={styles.greetingDate}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </Animated.View>

          {/* Achievements, not chat.

              This slot used to open /chat — which is the third tab, permanently
              on screen at the bottom, wearing the identical icon. A shortcut to
              somewhere already one tap away costs the most valuable corner of
              the home screen and returns nothing.

              Achievements were the opposite problem: fifteen of them, and the
              only way in was Profile, two screens deep. Top-right is where an
              app that wants you to come back tomorrow puts them. */}
          <Pressable
            onPress={() => router.push('/achievements')}
            hitSlop={10}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Your achievements"
          >
            <Ionicons name="trophy-outline" size={18} color={colors.warning} />
          </Pressable>
        </View>

        <Animated.View entering={staggeredEntrance(0)}>
          <RecordHero
            onPress={() => router.push('/record')}
            eyebrow={
              processing.length > 0
                ? `${processing.length} still processing`
                : 'Ready when you are'
            }
            title={'Record\ntoday’s lecture'}
          />
        </Animated.View>

        {/* Three facts, three cards.
            Separate tiles rather than one panel divided by rules: the gaps do
            the separating, which is one less line of ink for the same job.

            No readiness percentage here, deliberately. Readiness belongs to a
            lecture and rolls up to a course; any figure above that is a score
            for an exam nobody sits. Counts are facts, and facts are what a
            dashboard is for. */}
        <Animated.View entering={staggeredEntrance(1)} style={styles.statRow}>
          <Card style={styles.statCard} padded={false}>
            <StatTile value={stats.data?.totalLectures ?? 0} label="Lectures" />
          </Card>
          <Card style={styles.statCard} padded={false}>
            <StatTile value={readiness.data?.quizzesTaken ?? 0} label="Quizzes" />
          </Card>
          <Card style={styles.statCard} padded={false}>
            <StatTile value={namedCourses} label="Courses" />
          </Card>
        </Animated.View>

        <Animated.View entering={staggeredEntrance(2)} style={styles.block}>
          <StreakCard
            streak={streak}
            announce={justArrived}
            onAct={() => router.push('/record')}
          />
        </Animated.View>

        <Animated.View entering={staggeredEntrance(3)} style={styles.block}>
          <Card onPress={() => router.push('/examprep')}>
            <View style={styles.linkRow}>
              <View style={styles.linkChip}>
                <Ionicons name="school" size={18} color={colors.accent} />
              </View>
              <Text style={styles.linkText}>
                {needsAttention
                  ? `${needsAttention.courseLabel} needs the most work`
                  : 'See how ready you are, course by course'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Card>
        </Animated.View>

        {/* No pooled "Weak areas" or "Blind spots" here, deliberately.
            Both were account-wide: one list mixing topics from every lecture in
            every course. That is the flat structure the course/lecture
            hierarchy replaced, and it describes no exam anyone sits — a weak
            topic only means something next to the lecture it came from.

            Both now live where they are actionable: on a lecture's own Exam
            prep tab, and rolled up on its course card under Exams. The link
            above is how you get there. */}

        <Animated.View entering={staggeredEntrance(4)}>
          <SectionHeader
            title="Recent lectures"
            // The library, not the recorder. "See all" used to open the Record
            // tab because that is where the list happened to live, so asking to
            // see your lectures put a microphone in front of you.
            action={allLectures.length > 4 ? 'See all' : undefined}
            onAction={allLectures.length > 4 ? () => router.push('/library') : undefined}
          />
        </Animated.View>

        {recent.length === 0 ? (
          <Animated.View entering={staggeredEntrance(5)}>
            <EmptyState
              glyph="◉"
              title="No lectures yet"
              message="Record your first lecture and Cleveft will transcribe, organise and index it for you."
              actionLabel="Record a lecture"
              onAction={() => router.push('/record')}
            />
          </Animated.View>
        ) : (
          <View style={styles.lectureList}>
            {recent.map((lecture, index) => (
              <Animated.View
                key={lecture.id}
                entering={staggeredEntrance(5 + index)}
               
              >
                <LectureCard
                  lecture={lecture}
                  index={index}
                  onPress={() => router.push(`/transcript?lectureId=${lecture.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greeting: {
    ...typography.micro,
    fontWeight: '500',
    color: c.accent,
  },
  greetingDate: {
    ...typography.micro,
    color: c.textMuted,
  },
  name: {
    ...typography.subheading,
    color: c.text,
  },
  /*
   * 72pt of box for a 40pt avatar, pulled back to 40 with negative margins.
   *
   * The ring grows to 1.32x and has to have somewhere to grow *into*. Android
   * clips a child drawn outside its parent's bounds, so the earlier version —
   * a 40pt box with the ring inset -4 — drew the whole pulse outside the box
   * and clipped every pixel of it, which is why the ring never appeared while
   * the icon wiggle (entirely inside its own bounds) worked fine. The margins
   * mean the extra 32pt costs nothing in layout.
   */
  avatarWrap: {
    width: 72,
    height: 72,
    margin: -16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarRing: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: c.accentVivid,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.ink,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  block: {
    marginTop: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkChip: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  linkText: {
    ...typography.caption,
    color: c.text,
    flex: 1,
  },
  lectureList: {
    gap: spacing.md,
  },
});
