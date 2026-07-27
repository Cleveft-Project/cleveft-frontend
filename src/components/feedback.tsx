import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

import { GlassCard } from './glass-card';
import { NeonButton } from './neon-button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  /** Shows a spinner and disables the button — without this, tapping "Try
   * again" on a slow request looks like nothing happened. */
  retrying?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.centered}>
      <View style={styles.errorBadge}>
        <Text style={styles.errorGlyph}>!</Text>
      </View>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <NeonButton
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          fullWidth={false}
          loading={retrying}
        />
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  glyph?: string;
}

export function EmptyState({ title, message, actionLabel, onAction, glyph = '◎' }: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <GlassCard style={styles.empty}>
      <Text style={styles.emptyGlyph}>{glyph}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <NeonButton label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </GlassCard>
  );
}

/** Small status chip: a topic tag, a lecture status, a difficulty. */
export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'warning' | 'danger';
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.pill, styles[`pill_${tone}`]]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}`]]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  mutedText: {
    ...typography.body,
    color: c.textMuted,
  },
  errorBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.dangerSoft,
  },
  errorGlyph: {
    ...typography.title,
    color: c.danger,
  },
  errorText: {
    ...typography.body,
    color: c.textSecondary,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyGlyph: {
    fontSize: 34,
    color: c.accent,
    opacity: 0.7,
  },
  emptyTitle: {
    ...typography.heading,
    color: c.text,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  // Tint only, no outline. A chip is already a shape; ringing it as well is
  // two borders' worth of ink for one border's worth of meaning.
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    maxWidth: 200,
  },
  pill_neutral: {
    backgroundColor: c.surfaceSunken,
  },
  pill_accent: {
    backgroundColor: c.accentSoft,
  },
  pill_warning: {
    backgroundColor: c.warningSoft,
  },
  pill_danger: {
    backgroundColor: c.dangerSoft,
  },
  pillText: {
    ...typography.micro,
    letterSpacing: 0.4,
  },
  pillText_neutral: {
    color: c.textMuted,
  },
  pillText_accent: {
    color: c.accent,
  },
  pillText_warning: {
    color: c.warning,
  },
  pillText_danger: {
    color: c.danger,
  },
});
