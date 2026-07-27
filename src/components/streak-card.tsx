import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { usePressScale } from '@/components/animated/press-scale';
import { MILESTONES, nextMilestone, type StreakSummary } from '@/lib/streak';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface StreakCardProps {
  streak: StreakSummary;
  /**
   * Fire the flame's one-shot glow. Driven by arrival on the screen rather
   * than by the card itself, so it replays each visit instead of only on the
   * first mount — the tab stays mounted, so there is no remount to retrigger.
   */
  announce?: boolean;
  /** Sends the student somewhere they can actually earn today's day. */
  onAct: () => void;
}

/**
 * Study streak, with the week behind it and the next milestone ahead.
 *
 * The card only asks for attention when asking is useful: the flame pulses if a
 * live streak has no activity today, and sits still once the day is earned. A
 * badge that animates permanently is decoration; one that animates only when
 * there is something to do is information.
 *
 * Longest is always shown, including after a break, so losing a streak leaves
 * a record of the run rather than wiping it to nothing.
 */
export function StreakCard({ streak, announce = false, onAct }: StreakCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const press = usePressScale(0.985);

  const alive = streak.current > 0;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (announce && streak.atRisk) {
      // One breath, not a loop. A halo that never stops is decoration the eye
      // learns to ignore; a single glow on arrival is a reminder. The sequence
      // ends back at 0, so it settles fully dark on its own.
      // Brisk on the way up, slightly slower fading out — a glow that lingers
      // as long as this one used to (1.8s) is the last thing still moving on
      // the screen, which reads as the app being slow rather than as a nudge.
      pulse.value = withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 620, easing: Easing.in(Easing.quad) }),
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 250 });
    }
    return () => cancelAnimation(pulse);
  }, [announce, pulse, streak.atRisk]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.45]) }],
  }));

  const target = nextMilestone(streak.current);
  const earned = MILESTONES.filter((milestone) => streak.longest >= milestone.days);

  return (
    <Animated.View style={press.animatedStyle} layout={LinearTransition.springify()}>
      <Pressable
        onPress={() => setExpanded((previous) => !previous)}
        {...press.handlers}
        accessibilityRole="button"
        accessibilityLabel={`${streak.current} day study streak. Tap for details.`}
        style={[styles.card, streak.atRisk && styles.cardAtRisk]}
      >
        <View style={styles.top}>
          <View style={styles.flameWrap}>
            <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
            <Animated.View style={[styles.flame, alive && styles.flameAlive, flameStyle]}>
              <Ionicons
                name={alive ? 'flame' : 'flame-outline'}
                size={22}
                color={alive ? colors.warning : colors.textMuted}
              />
            </Animated.View>
          </View>

          <View style={styles.headline}>
            <Text style={styles.count}>
              {streak.current}
              <Text style={styles.countUnit}>{streak.current === 1 ? ' day' : ' days'}</Text>
            </Text>
            <Text style={[styles.caption, streak.atRisk && styles.captionAtRisk]}>
              {streak.atRisk
                ? 'Study today to keep it'
                : streak.activeToday
                  ? "Today's done — nice"
                  : 'Record, ask or quiz to start one'}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>

        <View style={styles.week}>
          {streak.lastSevenDays.map((day, index) => (
            <Animated.View
              key={day.key}
              entering={FadeIn.delay(index * 25).duration(160)}
              style={styles.day}
            >
              <View
                style={[
                  styles.dot,
                  day.active && styles.dotActive,
                  day.isToday && styles.dotToday,
                ]}
              >
                {day.active ? (
                  <Ionicons name="checkmark" size={11} color={colors.textOnAccent} />
                ) : null}
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {WEEKDAY[day.date.getDay()]}
              </Text>
            </Animated.View>
          ))}
        </View>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.detail}>
            <View style={styles.statRow}>
              <Stat label="Longest" value={`${streak.longest}`} />
              <Stat label="Days studied" value={`${streak.totalDays}`} />
              <Stat label="Next" value={target ? `${target.days}` : '—'} />
            </View>

            {target ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressHead}>
                  <Text style={styles.progressTitle}>{target.title}</Text>
                  <Text style={styles.progressValue}>
                    {streak.current}/{target.days}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(4, (streak.current / target.days) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            {earned.length > 0 ? (
              <View style={styles.badges}>
                {earned.map((milestone) => (
                  <View key={milestone.days} style={styles.badge}>
                    <Ionicons name={milestone.icon} size={13} color={colors.accent} />
                    <Text style={styles.badgeText}>{milestone.title}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable onPress={onAct} hitSlop={6} style={styles.actionRow}>
              <Text style={styles.actionText}>
                {streak.activeToday ? 'Record another lecture' : 'Do something today'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.accent} />
            </Pressable>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
      gap: spacing.lg,
    },
    // A tint rather than an outline now that cards have no borders to change.
    // Warming the whole surface also says "at risk" more plainly than a ring
    // most people would not notice.
    cardAtRisk: {
      backgroundColor: c.warningSoft,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    flameWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    halo: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: c.warning,
    },
    flame: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: c.borderMuted,
    },
    flameAlive: {
      backgroundColor: c.warningSoft,
      borderColor: c.warning,
    },
    headline: {
      flex: 1,
      gap: 1,
    },
    count: {
      ...typography.title,
      color: c.text,
    },
    countUnit: {
      ...typography.caption,
      color: c.textMuted,
    },
    caption: {
      ...typography.micro,
      color: c.textMuted,
    },
    captionAtRisk: {
      color: c.warning,
    },
    week: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    day: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    dot: {
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: 'transparent',
    },
    dotActive: {
      backgroundColor: c.accentVivid,
    },
    dotToday: {
      borderColor: c.borderStrong,
    },
    dayLabel: {
      ...typography.micro,
      fontSize: 10,
      color: c.textMuted,
    },
    dayLabelToday: {
      color: c.textSecondary,
    },
    detail: {
      gap: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderMuted,
    },
    statRow: {
      flexDirection: 'row',
      gap: spacing.xl,
    },
    stat: {
      gap: 1,
    },
    statValue: {
      ...typography.subheading,
      color: c.text,
    },
    statLabel: {
      ...typography.micro,
      color: c.textMuted,
    },
    progressBlock: {
      gap: spacing.sm,
    },
    progressHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    progressTitle: {
      ...typography.caption,
      color: c.textSecondary,
    },
    progressValue: {
      ...typography.micro,
      color: c.textMuted,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: c.accentVivid,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: c.accentSoft,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: c.borderStrong,
    },
    badgeText: {
      ...typography.micro,
      color: c.accent,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'flex-start',
    },
    actionText: {
      ...typography.caption,
      color: c.accent,
    },
  });
