import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { chatApi, collabApi, examPrepApi, lecturesApi } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { CountUp } from '@/components/count-up';
import { ScreenHeader } from '@/components/headers';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useCollapsingHeader } from '@/state/chrome-context';
import { useAsync } from '@/hooks/use-async';
import {
  buildAchievements,
  CATEGORY_LABELS,
  RARITY_LABELS,
  type Achievement,
  type Category,
  type Rarity,
} from '@/lib/achievements';
import { computeStreak } from '@/lib/streak';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

type Filter = 'all' | Category;

/**
 * What the student has earned, and what is nearly within reach.
 *
 * <p>Everything is computed from data Cleveft already holds, so this screen has
 * no backend of its own and can never disagree with the rest of the app. The
 * locked entries carry progress on purpose — a wall of grey padlocks tells a
 * student nothing except that they have not done enough, whereas "7 of 10" is
 * an invitation.
 */
export default function AchievementsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();

  const edges = useScrollEdges();

  // Title shrinks and lifts as the page scrolls, matching every other

  // scrolling screen in the app.

  const headerStyle = useCollapsingHeader();
  const [filter, setFilter] = useState<Filter>('all');

  const lectures = useAsync(() => lecturesApi.list(), []);
  const readiness = useAsync(() => examPrepApi.readiness(), []);
  const peers = useAsync(() => collabApi.peers(), []);
  const conversations = useAsync(() => chatApi.conversations(), []);

  // The same three activity sources home uses, so the streak here can never
  // disagree with the flame on the dashboard.
  const streakDays = useMemo(
    () =>
      computeStreak([
        ...(lectures.data ?? []).map((lecture) => lecture.createdAt),
        ...(readiness.data?.trend ?? []).map((point) => point.at),
        ...(conversations.data ?? []).map((conversation) => conversation.updatedAt),
      ]).current,
    [conversations.data, lectures.data, readiness.data],
  );

  const all = useMemo(
    () =>
      buildAchievements({
        lectures: lectures.data ?? [],
        readiness: readiness.data ?? null,
        streakDays,
        peerCount: peers.data?.length ?? 0,
      }),
    [lectures.data, peers.data, readiness.data, streakDays],
  );

  const shown = filter === 'all' ? all : all.filter((item) => item.category === filter);
  const earned = all.filter((item) => item.earned).length;

  const filters: Filter[] = ['all', 'study', 'quiz', 'streak', 'mastery', 'social'];

  return (
    <Screen edges={['top', 'bottom']} blob="violet">
      <Animated.View style={headerStyle}>
        <ScreenHeader
          title="Achievements"
          subtitle={`${earned} of ${all.length} unlocked`}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        />
      </Animated.View>

      {/* Overall progress, above the filters, because it describes all of them
          rather than whichever is selected. */}
      <View style={styles.overall}>
        <ProgressBar value={all.length ? earned / all.length : 0} tint={colors.accent} tall />
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((key) => {
            const active = key === filter;
            const count =
              key === 'all' ? all.length : all.filter((item) => item.category === key).length;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  haptics.tap();
                  setFilter(key);
                }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {key === 'all' ? 'All' : CATEGORY_LABELS[key]} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {shown.map((item, index) => (
            <Card key={item.id} achievement={item} index={index} />
          ))}
        </View>
      </ScrollView>

      <ScrollEdges {...edges} />
    </Screen>
  );
}

/**
 * One badge.
 *
 * <p>Earned cards are in colour and lit; locked ones are drained and carry a
 * padlock. The difference is deliberately large — a subtle distinction would
 * make the wall read as uniformly grey, which is the failure mode of most
 * achievement screens.
 */
function Card({ achievement, index }: { achievement: Achievement; index: number }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  /*
   * Three hues, one per rarity, and none of them grey.
   *
   * Common was drawn in textSecondary, which meant a third of the wall was
   * rendered in the muted text colour — the reason the screen read as dead
   * rather than as a collection. Rarity should be legible from across the room,
   * and colour is the cheapest way to say it.
   */
  const tint =
    achievement.rarity === 'landmark'
      ? colors.warning
      : achievement.rarity === 'notable'
        ? colors.violet
        : colors.accent;

  const wash =
    achievement.rarity === 'landmark'
      ? colors.warningSoft
      : achievement.rarity === 'notable'
        ? colors.violetSoft
        : colors.accentSoft;

  // Earned badges breathe. Only the earned ones: a locked card that pulses is
  // advertising something the student cannot have.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!achievement.earned) {
      return;
    }
    glow.value = withDelay(
      index * 90,
      withSpring(1, { damping: 9, stiffness: 130, mass: 0.8 }),
    );
  }, [achievement.earned, glow, index]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.82 + glow.value * 0.18 }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).duration(320).springify()}
      style={[
        styles.card,
        // Earned cards take the rarity colour across the whole card, not just a
        // border. A one-pixel outline is not enough difference to make a
        // collection feel collected.
        achievement.earned && { borderColor: tint, backgroundColor: wash },
      ]}
    >
      <View style={styles.cardHead}>
        <Animated.View
          style={[
            styles.medal,
            achievement.earned
              ? { backgroundColor: tint, borderColor: tint }
              : styles.medalLocked,
            medalStyle,
          ]}
        >
          <Ionicons
            name={achievement.earned ? 'trophy' : 'lock-closed'}
            size={18}
            color={achievement.earned ? colors.onFillPrimary : colors.textMuted}
          />
        </Animated.View>

        {/* Filled when earned, outlined when not — so rarity still reads on a
            locked card without competing with the ones already won. */}
        <View
          style={[
            styles.rarity,
            { borderColor: tint },
            achievement.earned && { backgroundColor: tint },
          ]}
        >
          <Text
            style={[
              styles.rarityText,
              { color: achievement.earned ? colors.onFillPrimary : tint },
            ]}
          >
            {RARITY_LABELS[achievement.rarity as Rarity].toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, !achievement.earned && styles.dim]} numberOfLines={2}>
        {achievement.title}
      </Text>
      <Text style={styles.cardDetail} numberOfLines={2}>
        {achievement.detail}
      </Text>

      <ProgressBar value={achievement.progress} tint={tint} />

      <View style={styles.cardFoot}>
        {achievement.earned ? (
          <View style={styles.unlockedRow}>
            <Ionicons name="checkmark-circle" size={14} color={tint} />
            <Text style={[styles.tally, { color: tint, fontWeight: '700' }]}>Unlocked</Text>
          </View>
        ) : (
          <>
            <CountUp
              value={Math.round(achievement.progress * 100)}
              suffix="%"
              style={styles.tally}
            />
            {achievement.tally ? (
              <Text style={styles.tallyMuted}>{achievement.tally}</Text>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

/** A bar that fills on mount rather than appearing already full. */
function ProgressBar({
  value,
  tint,
  tall = false,
}: {
  value: number;
  tint: string;
  tall?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, value)), {
      duration: 720,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={[styles.track, tall && styles.trackTall]}>
      <Animated.View style={[styles.fill, { backgroundColor: tint }, style]} />
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  overall: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  filterRow: {
    paddingBottom: spacing.md,
  },
  filters: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  chipActive: {
    backgroundColor: c.fillPrimary,
    borderColor: c.fillPrimary,
  },
  chipText: {
    ...typography.caption,
    color: c.textSecondary,
  },
  chipTextActive: {
    color: c.onFillPrimary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Two columns, computed by flex rather than a fixed width so it survives a
  // rotation and a tablet.
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  medal: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  medalLocked: {
    backgroundColor: c.surfaceSunken,
    borderColor: c.borderMuted,
  },
  rarity: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rarityText: {
    ...typography.micro,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  dim: {
    color: c.textSecondary,
  },
  cardDetail: {
    ...typography.micro,
    color: c.textMuted,
    lineHeight: 15,
    minHeight: 30,
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  trackTall: {
    height: 7,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tally: {
    ...typography.micro,
    color: c.textSecondary,
  },
  tallyMuted: {
    ...typography.micro,
    color: c.textMuted,
  },
});
