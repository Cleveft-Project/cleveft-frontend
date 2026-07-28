import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT } from '@/components/animated/motion';
import { CountUp } from '@/components/count-up';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * How long a bar takes to travel to its value, and how long it waits first.
 *
 * The pause matters as much as the fill: a bar that starts moving the instant
 * it mounts is usually still animating while the screen is settling, so nobody
 * sees it. A beat of stillness first means the eye has arrived before the
 * movement starts.
 */
const FILL_DURATION = 850;
const FILL_DELAY = 180;

/**
 * A progress bar that grows to its value.
 *
 * Shared by every meter here so a readiness bar, a topic bar and any future
 * gauge all fill with the same weight. Width is animated rather than
 * transformed because these bars have rounded caps — scaling an already-rounded
 * capsule distorts the cap, while animating width keeps it circular throughout.
 */
export function GrowingFill({
  percent,
  style,
  delay = FILL_DELAY,
}: {
  percent: number;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(percent, { duration: FILL_DURATION, easing: EASE_OUT }));
  }, [delay, percent, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, progress.value)}%`,
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}

/**
 * The exam-readiness meter.
 *
 * A horizontal bar rather than a circular gauge: readiness is a progress value
 * people compare against a target, and a bar makes "how far along am I" legible
 * at a glance without reading the number.
 */
export function ReadinessMeter({
  percent,
  verdict,
  // Overridable because this no longer always measures "exam readiness" in
  // the abstract — on the dashboard it reports one specific course.
  label = 'Exam readiness',
}: {
  percent: number;
  verdict?: string;
  label?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.meterWrapper}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>{label}</Text>
        {/* The number climbs alongside the bar, so the two agree at every
            frame rather than the figure sitting finished above a moving bar. */}
        <CountUp value={clamped} suffix="%" style={styles.meterValue} delay={FILL_DELAY} />
      </View>

      <View style={styles.track}>
        <GrowingFill percent={clamped} style={styles.fill} />
      </View>

      {verdict ? <Text style={styles.verdict}>{verdict}</Text> : null}
    </View>
  );
}

/** Compact dashboard counter. */
export function StatTile({
  value,
  label,
  tone = 'accent',
}: {
  value: string | number;
  label: string;
  tone?: 'accent' | 'neutral';
}) {
  const styles = useThemedStyles(createStyles);
  return (
    // Label above the number, not below. The number is the thing being read;
    // putting its caption first means the eye lands on the label, learns what
    // it is about to see, then reads the figure — rather than reading a bare
    // "12" and hunting underneath for what it counts.
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      {/* Counts climb; anything already formatted as text is left alone, since
          a lecture count and a duration string are not the same kind of thing. */}
      {typeof value === 'number' ? (
        <CountUp
          value={value}
          style={[styles.tileValue, tone === 'neutral' && styles.tileValueNeutral]}
          duration={700}
          delay={FILL_DELAY}
        />
      ) : (
        <Text style={[styles.tileValue, tone === 'neutral' && styles.tileValueNeutral]}>
          {value}
        </Text>
      )}
    </View>
  );
}

/** Per-topic mastery row, used in the weak/strong area lists. */
export function TopicBar({
  topic,
  percent,
  detail,
}: {
  topic: string;
  percent: number;
  detail?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const clamped = Math.max(0, Math.min(100, percent));

  // Two cyans, one meaning. The readable `accent` is dark enough to pass as
  // 13pt text; `accentVivid` is bright enough to read as a filled bar. Using
  // either for both jobs fails one of them.
  const textTone = clamped >= 80 ? colors.accent : clamped >= 60 ? colors.warning : colors.danger;
  const fillTone =
    clamped >= 80 ? colors.accentVivid : clamped >= 60 ? colors.warning : colors.danger;

  return (
    <View style={styles.topicRow}>
      <View style={styles.topicHeader}>
        <Text style={styles.topicName} numberOfLines={1}>
          {topic}
        </Text>
        <Text style={[styles.topicPercent, { color: textTone }]}>{clamped}%</Text>
      </View>

      <View style={styles.topicTrack}>
        <GrowingFill percent={clamped} style={[styles.topicFill, { backgroundColor: fillTone }]} />
      </View>

      {detail ? <Text style={styles.topicDetail}>{detail}</Text> : null}
    </View>
  );
}

/**
 * Sparkline of recent quiz scores.
 *
 * Deliberately axis-free: it exists to answer "am I improving", and gridlines
 * would add ink without adding that answer.
 */
export function TrendSparkline({ points }: { points: { percentage: number }[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (points.length < 2) {
    return null;
  }

  return (
    <View style={styles.sparkline}>
      {points.map((point, index) => (
        <SparkBar
          key={index}
          percent={Math.max(4, Math.min(100, point.percentage))}
          // Staggered left to right, so the chart draws itself in the order the
          // attempts happened rather than snapping into existence at once.
          delay={FILL_DELAY + index * 55}
          color={index === points.length - 1 ? colors.accentVivid : colors.waveDim}
          style={styles.sparkBar}
        />
      ))}
    </View>
  );
}

/** One bar of {@link TrendSparkline}, growing up from the baseline. */
function SparkBar({
  percent,
  delay,
  color,
  style,
}: {
  percent: number;
  delay: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withDelay(delay, withTiming(percent, { duration: 620, easing: EASE_OUT }));
  }, [delay, height, percent]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${Math.max(4, height.value)}%`,
  }));

  return <Animated.View style={[style, { backgroundColor: color }, animatedStyle]} />;
}

const createStyles = (c: Palette) => StyleSheet.create({
  meterWrapper: {
    gap: spacing.md,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  meterLabel: {
    ...typography.caption,
    color: c.textSecondary,
    letterSpacing: 0.4,
  },
  meterValue: {
    ...typography.display,
    color: c.accent,
  },
  // Thicker than before, with fully rounded caps on both the track and the
  // fill. A capsule inside a capsule is the detail that makes a progress bar
  // look drawn rather than defaulted.
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: c.accentVivid,
  },
  verdict: {
    ...typography.caption,
    color: c.textMuted,
  },
  tile: {
    flex: 1,
    gap: spacing.xs,
  },
  tileValue: {
    ...typography.title,
    color: c.accent,
  },
  tileValueNeutral: {
    color: c.text,
  },
  // Sentence case, not uppercase. Shouting a three-word caption is the kind of
  // borrowed-dashboard styling the reskin is meant to remove.
  tileLabel: {
    ...typography.micro,
    fontWeight: '500',
    color: c.textMuted,
  },
  topicRow: {
    gap: spacing.sm,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  topicName: {
    ...typography.bodyStrong,
    color: c.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  topicPercent: {
    ...typography.caption,
  },
  topicTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  topicFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  topicDetail: {
    ...typography.micro,
    color: c.textMuted,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 64,
  },
  sparkBar: {
    flex: 1,
    borderRadius: radius.pill,
    minHeight: 4,
  },
});
