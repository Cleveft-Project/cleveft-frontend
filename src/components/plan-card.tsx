import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Plan, PlanUsage } from '@/api/types';
import { GlassCard } from '@/components/glass-card';
import { NeonButton } from '@/components/neon-button';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

interface PlanCardProps {
  plan: Plan;
  usage?: PlanUsage | null;
  onUpgrade: () => void;
  onManage?: () => void;
}

/**
 * The tier a student is on, plus what they have left.
 *
 * Usage is the point of this card. "You are on the free plan" is a label; "2 of
 * 5 recordings left this month" is the thing that makes the upgrade decision
 * for them, so it gets the bar and the prominence.
 */
export function PlanCard({ plan, usage, onUpgrade, onManage }: PlanCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isPro = plan === 'PRO';
  const limit = usage?.limit ?? null;
  const used = usage?.used ?? 0;
  const remaining = usage?.remaining ?? null;

  const fraction = limit && limit > 0 ? Math.min(1, used / limit) : 0;
  const exhausted = remaining != null && remaining <= 0;

  return (
    <GlassCard active={isPro}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={isPro ? 'sparkles' : 'school-outline'}
            size={18}
            color={isPro ? colors.accent : colors.textSecondary}
          />
          <Text style={styles.planName}>{isPro ? 'Cleveft Pro' : 'Free plan'}</Text>
        </View>

        <View style={[styles.badge, isPro && styles.badgePro]}>
          <Text style={[styles.badgeText, isPro && styles.badgeTextPro]}>
            {isPro ? 'PRO' : 'FREE'}
          </Text>
        </View>
      </View>

      {isPro ? (
        <Text style={styles.blurb}>
          Unlimited recordings, advanced exam prep and priority processing.
          {usage?.periodResetsAt ? '' : ''}
        </Text>
      ) : (
        <>
          <View style={styles.usageRow}>
            <Text style={styles.usageValue}>
              {limit == null ? `${used} recordings` : `${used} of ${limit}`}
            </Text>
            <Text style={styles.usageLabel}>recordings this month</Text>
          </View>

          {limit != null ? (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(3, fraction * 100)}%` },
                  exhausted && styles.fillExhausted,
                ]}
              />
            </View>
          ) : null}

          <Text style={[styles.blurb, exhausted && styles.blurbUrgent]}>
            {limit == null
              ? // The allowance could not be read. Better to say nothing about
                // it than to claim a number that might be wrong.
                'Upgrade for unlimited recordings and priority processing.'
              : exhausted
                ? 'You have used this month’s recordings. Upgrade for unlimited.'
                : `${remaining ?? 0} left. Upgrade for unlimited recordings and priority processing.`}
          </Text>
        </>
      )}

      {isPro ? (
        onManage ? (
          <NeonButton
            label="Manage plan"
            onPress={onManage}
            variant="ghost"
            style={styles.action}
          />
        ) : null
      ) : (
        <NeonButton label="Upgrade to Pro" onPress={onUpgrade} style={styles.action} />
      )}
    </GlassCard>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  planName: {
    ...typography.heading,
    color: c.text,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  badgePro: {
    backgroundColor: c.accentSoft,
    borderColor: c.borderStrong,
  },
  badgeText: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.8,
  },
  badgeTextPro: {
    color: c.accent,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  usageValue: {
    ...typography.title,
    color: c.text,
  },
  usageLabel: {
    ...typography.caption,
    color: c.textMuted,
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: c.accentVivid,
  },
  fillExhausted: {
    backgroundColor: c.danger,
  },
  blurb: {
    ...typography.caption,
    color: c.textMuted,
    marginTop: spacing.md,
  },
  blurbUrgent: {
    color: c.warning,
  },
  action: {
    marginTop: spacing.xl,
  },
});
