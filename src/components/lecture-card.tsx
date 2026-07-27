import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LectureSummary } from '@/api/types';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

import { Card } from './card';
import { Pill } from './feedback';

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) {
    return '—';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const diffMinutes = Math.round((Date.now() - then) / 60000);
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function statusTone(status: LectureSummary['status']) {
  switch (status) {
    case 'COMPLETED':
      return 'accent' as const;
    case 'FAILED':
      return 'danger' as const;
    default:
      return 'warning' as const;
  }
}

function statusLabel(lecture: LectureSummary): string {
  switch (lecture.status) {
    case 'COMPLETED':
      return 'Ready';
    case 'FAILED':
      return 'Failed';
    case 'PROCESSING':
      return 'Processing';
    default:
      return 'Queued';
  }
}

export function LectureCard({
  lecture,
  onPress,
  index = 0,
}: {
  lecture: LectureSummary;
  onPress: () => void;
  /** Position in the list — decides which tint this row's chip takes. */
  index?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const isReady = lecture.status === 'COMPLETED';
  const tone = statusTone(lecture.status);

  /**
   * Ready lectures alternate cyan and violet down the list.
   *
   * Purely rhythmic — it carries no meaning, and that is the point. A column of
   * identical chips reads as a table; alternating them makes each row resolve
   * as its own object at a glance. Colour that *does* mean something (amber for
   * processing, red for failed) still wins, so the decoration never speaks over
   * the status.
   */
  /**
   * The icon says where it came from; the tint is decoration.
   *
   * A student with a mix of recordings and imported handouts needs to tell them
   * apart at a glance — "did I sit through this, or is it the slides?" changes
   * how much they trust the notes. The glyph carries that, so it wins over the
   * alternating rhythm below.
   */
  const sourceIcon =
    lecture.source === 'PDF'
      ? ('document-text' as const)
      : lecture.source === 'YOUTUBE'
        ? ('logo-youtube' as const)
        : ('pulse' as const);

  const chip =
    tone === 'danger'
      ? { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const }
      : tone === 'warning'
        ? { bg: colors.warningSoft, fg: colors.warning, icon: 'sync' as const }
        : index % 2 === 1
          ? { bg: colors.violetSoft, fg: colors.violet, icon: sourceIcon }
          : { bg: colors.accentSoft, fg: colors.accent, icon: sourceIcon };

  return (
    // Not `active`. Tinting every completed card would tint the whole list,
    // and an accent that appears twelve times on one screen has stopped
    // pointing at anything. The colour moves to the icon chip, where it says
    // something specific: this one is ready, that one failed.
    <Card onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
          <Ionicons name={chip.icon} size={18} color={chip.fg} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {lecture.title}
          </Text>
          <View style={styles.metaRow}>
            {lecture.courseCode ? <Text style={styles.meta}>{lecture.courseCode}</Text> : null}
            <Text style={styles.meta}>{formatDuration(lecture.durationSeconds)}</Text>
            <Text style={styles.meta}>{formatRelativeDate(lecture.createdAt)}</Text>
          </View>
        </View>

        {/* "Ready" on every card is noise — the state worth calling out is the
            one that is not ready. */}
        {isReady ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : (
          <Pill label={statusLabel(lecture)} tone={tone} />
        )}
      </View>

      {/* While processing, the status detail is the most useful thing we can
          show — it names the stage rather than leaving a blank card. */}
      {!isReady && lecture.statusDetail ? (
        <Text style={styles.statusDetail} numberOfLines={2}>
          {lecture.statusDetail}
        </Text>
      ) : lecture.preview ? (
        <Text style={styles.preview} numberOfLines={2}>
          {lecture.preview}
        </Text>
      ) : null}

      {lecture.topics?.length ? (
        <View style={styles.topics}>
          {lecture.topics.slice(0, 3).map((topic) => (
            <Pill key={topic} label={topic} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // A squircle rather than a circle: it echoes the card's own corner and keeps
  // the row reading as a stack of rounded rectangles instead of a bulleted list.
  chip: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.subheading,
    color: c.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  meta: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.3,
  },
  preview: {
    ...typography.caption,
    color: c.textSecondary,
    marginTop: spacing.md,
  },
  statusDetail: {
    ...typography.caption,
    color: c.warning,
    marginTop: spacing.md,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
