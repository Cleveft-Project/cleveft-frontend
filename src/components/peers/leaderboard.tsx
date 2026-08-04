import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { collabApi } from '@/api';
import type { Leaderboard as Board, LeaderboardEntry } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { CountUp } from '@/components/count-up';
import { EmptyState } from '@/components/feedback';
import { Kofi } from '@/components/kofi';
import { PeerAvatar } from '@/components/peers/coursemates';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * This week's effort, ranked, among everyone taking a course.
 *
 * <p>The one mechanic here most likely to make a student open Cleveft daily.
 * It works on three things: a cohort small enough that every place is winnable,
 * a deadline you can see counting down, and a score that rewards showing up
 * rather than being clever.
 *
 * <p>Effort, never results — see the service. Nobody's rank says how well they
 * understand anything, only how much they did, which is why it is safe to show
 * to people who sit the same exam.
 */

/** Live countdown to the Monday reset. */
function useCountdown(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // A minute is enough: the number this drives is measured in days and hours,
    // and a per-second timer would wake the JS thread 60× more often for a
    // digit that does not change.
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!iso) {
    return '';
  }
  const remaining = new Date(iso).getTime() - now;
  if (remaining <= 0) {
    return 'Resetting…';
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

export function Leaderboard({ courses }: { courses: string[] }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [course, setCourse] = useState<string | null>(courses[0] ?? null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!course) {
      return;
    }
    let active = true;
    setLoading(true);
    setBoard(null);

    void collabApi
      .leaderboard(course)
      .then((data) => {
        if (active) {
          setBoard(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [course]);

  const countdown = useCountdown(board?.resetsAt);

  const me = useMemo(
    () => board?.entries.find((entry) => entry.isMe) ?? null,
    [board],
  );
  const leaderPoints = board?.entries[0]?.points ?? 0;

  if (courses.length === 0) {
    return (
      <EmptyState
        glyph="◎"
        title="No courses yet"
        message="Add the courses you are taking to your profile, and you will see how this week is going against everyone else in them."
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* Course switcher, only when there is a choice to make. */}
      {courses.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.courseTabs}
        >
          {courses.map((code) => {
            const active = code === course;
            return (
              <Pressable
                key={code}
                onPress={() => {
                  haptics.tap();
                  setCourse(code);
                }}
                style={[styles.courseTab, active && styles.courseTabActive]}
              >
                <Text style={[styles.courseTabText, active && styles.courseTabTextActive]}>
                  {code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <YouCard me={me} median={board?.median ?? 0} countdown={countdown} loading={loading} />

      {board && board.entries.length > 0 ? (
        <View style={styles.list}>
          {board.entries.map((entry, index) => (
            <Row
              key={entry.userId}
              entry={entry}
              index={index}
              leaderPoints={leaderPoints}
              open={openId === entry.userId}
              onToggle={() => {
                haptics.tap();
                setOpenId((previous) => (previous === entry.userId ? null : entry.userId));
              }}
            />
          ))}
        </View>
      ) : !loading ? (
        <EmptyState
          glyph="◉"
          title="Nobody here yet"
          message={`Nobody else has added ${course} to their profile. Invite a coursemate and the board comes alive.`}
        />
      ) : null}
    </View>
  );
}

/**
 * Your own standing, above the table.
 *
 * <p>Pinned so it is answerable at a glance without scrolling to find yourself
 * — the question a student opens this to ask is "where am I", and a board that
 * makes them hunt for it answers it slowly.
 */
function YouCard({
  me,
  median,
  countdown,
  loading,
}: {
  me: LeaderboardEntry | null;
  median: number;
  countdown: string;
  loading: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const top3 = !!me && me.rank <= 3 && me.points > 0;
  const aboveMedian = !!me && me.points >= median && me.points > 0;

  // Kofi celebrates a podium, encourages otherwise. He is the only thing on
  // this screen that reacts to the number rather than reporting it.
  const mood = top3 ? 'celebrate' : aboveMedian ? 'idle' : 'encourage';

  const glow = useSharedValue(0);
  useEffect(() => {
    if (!top3) {
      return undefined;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [glow, top3]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.65,
  }));

  return (
    <View style={[styles.you, top3 && { borderColor: colors.warning }]}>
      <Animated.View style={top3 ? glowStyle : undefined}>
        <Kofi mood={mood} size={64} grounded={false} />
      </Animated.View>

      <View style={styles.youBody}>
        {loading && !me ? (
          <Text style={styles.youMeta}>Working out where you stand…</Text>
        ) : me ? (
          <>
            <View style={styles.youRankRow}>
              <Text style={styles.youRankLabel}>You are</Text>
              <CountUp value={me.rank} style={styles.youRank} />
              <Text style={styles.youRankLabel}>
                {me.rank === 1 ? 'st' : me.rank === 2 ? 'nd' : me.rank === 3 ? 'rd' : 'th'}
              </Text>
            </View>

            {/* The median line. Sixth of nine feels like failing until you know
                you are above the middle — which is usually the truth. */}
            <Text style={styles.youMeta}>
              {me.points === 0
                ? 'Record a lecture or take a quiz to get on the board'
                : aboveMedian
                  ? `${me.points} points · above the class median`
                  : `${me.points} points · ${median - me.points} to reach the median`}
            </Text>
          </>
        ) : (
          <Text style={styles.youMeta}>You are not on this board yet</Text>
        )}

        {countdown ? (
          <View style={styles.countdown}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** One place on the board, expandable into what the score is made of. */
function Row({
  entry,
  index,
  leaderPoints,
  open,
  onToggle,
}: {
  entry: LeaderboardEntry;
  index: number;
  leaderPoints: number;
  open: boolean;
  onToggle: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const medal =
    entry.rank === 1 ? '#E8B923' : entry.rank === 2 ? '#A8B5BF' : entry.rank === 3 ? '#C98B5E' : null;

  // Rows fly in on a stagger rather than appearing as a table — the sequence is
  // what makes a ranking feel like a result being announced.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(index * 65, withSpring(1, { damping: 14, stiffness: 150 }));
  }, [enter, index]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateX: (1 - enter.value) * 28 }],
  }));

  // Bar relative to the leader, so the gap is visible rather than arithmetic.
  const share = leaderPoints > 0 ? entry.points / leaderPoints : 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      260 + index * 65,
      withTiming(share, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [fill, index, share]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <Animated.View style={style} layout={LinearTransition.duration(240)}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.row,
          entry.isMe && { borderColor: colors.accent, backgroundColor: colors.accentSoft },
        ]}
        accessibilityRole="button"
      >
        <View style={styles.rowHead}>
          <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
            <Text style={[styles.rankText, medal ? { color: '#1A1A1A' } : null]}>
              {entry.rank}
            </Text>
          </View>

          <PeerAvatar name={entry.fullName} size={38} />

          <View style={styles.rowName}>
            <Text style={styles.name} numberOfLines={1}>
              {entry.isMe ? 'You' : entry.fullName}
            </Text>
            <View style={styles.track}>
              <Animated.View
                style={[styles.trackFill, { backgroundColor: medal ?? colors.accent }, fillStyle]}
              />
            </View>
          </View>

          <CountUp value={entry.points} style={styles.points} delay={index * 65} />
        </View>

        {open ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.breakdown}>
            <Stat icon="mic" label="lectures" value={entry.lectures} />
            <Stat icon="school" label="quizzes" value={entry.quizzes} />
            <Stat icon="chatbubble-ellipses" label="questions" value={entry.questions} />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  courseTabs: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  courseTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  courseTabActive: {
    backgroundColor: c.fillPrimary,
    borderColor: c.fillPrimary,
  },
  courseTabText: {
    ...typography.caption,
    color: c.textSecondary,
    letterSpacing: 0.4,
  },
  courseTabTextActive: {
    color: c.onFillPrimary,
    fontWeight: '600',
  },
  you: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.borderMuted,
  },
  youBody: {
    flex: 1,
    gap: 2,
  },
  youRankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  youRank: {
    ...typography.display,
    fontSize: 34,
    color: c.accent,
  },
  youRankLabel: {
    ...typography.caption,
    color: c.textSecondary,
  },
  youMeta: {
    ...typography.micro,
    color: c.textMuted,
    lineHeight: 16,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  countdownText: {
    ...typography.micro,
    color: c.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
    gap: spacing.md,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSunken,
  },
  rankText: {
    ...typography.micro,
    color: c.textSecondary,
    fontWeight: '700',
  },
  rowName: {
    flex: 1,
    gap: 6,
  },
  name: {
    ...typography.caption,
    color: c.text,
    fontWeight: '600',
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  points: {
    ...typography.bodyStrong,
    color: c.text,
    minWidth: 34,
    textAlign: 'right',
  },
  breakdown: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...typography.caption,
    color: c.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.micro,
    color: c.textMuted,
  },
});
