import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ApiError, authApi } from '@/api';
import type { BillingPeriod } from '@/api/types';
import { GlassCard } from '@/components/glass-card';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useCollapsingHeader } from '@/state/chrome-context';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Priced in cedis, monthly and per semester, because that is how a Ghanaian
 * university student's money actually arrives. The semester option is the
 * cheaper per-month rate, which is the point of offering it.
 */
const PRICING: Record<BillingPeriod, { label: string; price: string; note: string }> = {
  MONTHLY: { label: 'Monthly', price: '₵25', note: 'per month' },
  SEMESTER: { label: 'Per semester', price: '₵80', note: '4 months · save ₵20' },
};

const FREE_FEATURES = [
  '5 recordings a month',
  'Transcription and structured notes',
  'Ask questions about your lectures',
  'Ad-supported',
];

const PRO_FEATURES = [
  'Unlimited recordings',
  'Advanced exam prep and quiz generation',
  'Cross-lecture knowledge graph',
  'Priority AI processing',
  'No ads',
];

export default function UpgradeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();
  // Title shrinks and lifts as the page scrolls, matching every other
  // scrolling screen in the app.
  const headerStyle = useCollapsingHeader();
  const { user, updateUser } = useAuth();

  const [period, setPeriod] = useState<BillingPeriod>('SEMESTER');
  const [submitting, setSubmitting] = useState(false);

  const isPro = user?.plan === 'PRO';

  const upgrade = async () => {
    setSubmitting(true);
    try {
      const updated = await authApi.changePlan('PRO', period);
      updateUser(updated);
      Alert.alert(
        'You are on Cleveft Pro',
        'Unlimited recordings are live on your account.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Couldn't upgrade",
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const downgrade = () => {
    Alert.alert(
      'Switch to Free?',
      'You will be capped at 5 recordings a month. Your existing lectures stay where they are.',
      [
        { text: 'Keep Pro', style: 'cancel' },
        {
          text: 'Switch to Free',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updated = await authApi.changePlan('FREE');
              updateUser(updated);
              router.back();
            } catch (error) {
              Alert.alert(
                "Couldn't change your plan",
                error instanceof ApiError ? error.message : 'Please try again.',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View style={headerStyle}>
        <ScreenHeader
          title={isPro ? 'Your plan' : 'Cleveft Pro'}
          subtitle={isPro ? 'You have unlimited recordings' : 'Never lose a lecture to a limit'}
        />
      </Animated.View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isPro ? null : (
          <View style={styles.periodRow}>
            {(Object.keys(PRICING) as BillingPeriod[]).map((option) => {
              const active = option === period;
              return (
                <Pressable
                  key={option}
                  onPress={() => setPeriod(option)}
                  style={[styles.period, active && styles.periodActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>
                    {PRICING[option].label}
                  </Text>
                  <Text style={[styles.periodPrice, active && styles.periodPriceActive]}>
                    {PRICING[option].price}
                  </Text>
                  <Text style={styles.periodNote}>{PRICING[option].note}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <GlassCard active style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={styles.tierName}>Cleveft Pro</Text>
          </View>
          {PRO_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.accent} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </GlassCard>

        <GlassCard style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <Ionicons name="school-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.tierName, styles.tierNameMuted]}>Free</Text>
          </View>
          {FREE_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="ellipse-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.featureText, styles.featureTextMuted]}>{feature}</Text>
            </View>
          ))}
        </GlassCard>

        {isPro ? (
          <NeonButton
            label="Switch to Free"
            onPress={downgrade}
            variant="danger"
            loading={submitting}
            style={styles.cta}
          />
        ) : (
          <>
            <NeonButton
              label={`Upgrade — ${PRICING[period].price}`}
              onPress={upgrade}
              loading={submitting}
              size="lg"
              style={styles.cta}
            />
            {/* Said plainly rather than buried: this is a course project, and
                pretending a card was charged would be worse than admitting it
                wasn't. */}
            <Text style={styles.disclaimer}>
              No payment provider is connected yet, so this switches your plan without charging
              anything.
            </Text>
          </>
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
  periodRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  period: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
    gap: 2,
  },
  periodActive: {
    backgroundColor: c.accentSoft,
    borderColor: c.borderStrong,
  },
  periodLabel: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.5,
  },
  periodLabelActive: {
    color: c.textSecondary,
  },
  periodPrice: {
    ...typography.title,
    color: c.text,
  },
  periodPriceActive: {
    color: c.accent,
  },
  periodNote: {
    ...typography.micro,
    color: c.textMuted,
  },
  tierCard: {
    marginBottom: spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierName: {
    ...typography.heading,
    color: c.text,
  },
  tierNameMuted: {
    color: c.textSecondary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  featureText: {
    ...typography.caption,
    color: c.text,
    flex: 1,
  },
  featureTextMuted: {
    color: c.textMuted,
  },
  cta: {
    marginTop: spacing.lg,
  },
  disclaimer: {
    ...typography.micro,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
