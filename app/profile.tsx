import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, authApi, examPrepApi, lecturesApi } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { Card } from '@/components/card';
import { CountUp } from '@/components/count-up';
import { GlassCard } from '@/components/glass-card';
import { RoundButton, ScreenHeader, SectionHeader } from '@/components/headers';
import { Kofi } from '@/components/kofi';
import { NeonButton } from '@/components/neon-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Who the student is — and nothing about how the app behaves.
 *
 * Profile and settings were one screen, which meant a student wanting to fix a
 * typo in their name scrolled past the theme switch and the gateway URL to get
 * there. They are different questions: *who am I* and *how does this thing
 * work*. The gear in the header keeps the machinery one tap away rather than
 * in the way.
 *
 * The hero exists because the old version opened with a form. A profile should
 * lead with something worth looking at — what the student has actually built
 * up — and only then ask them to type.
 */
export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signOut, updateUser } = useAuth();

  const usage = useAsync(() => lecturesApi.usage(), []);
  const stats = useAsync(() => lecturesApi.stats(), []);
  const readiness = useAsync(() => examPrepApi.readiness(), []);

  // Coming back from the upgrade screen changes both the tier and what the
  // usage line should say, so these re-read rather than showing the figures the
  // student saw before they paid.
  useFocusEffect(
    useCallback(() => {
      void usage.reload();
      void stats.reload();
      void readiness.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [programme, setProgramme] = useState(user?.programme ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await authApi.updateProfile({
        fullName: fullName.trim(),
        university: university.trim(),
        programme: programme.trim(),
      });
      updateUser(updated);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const plan = user?.plan ?? 'FREE';
  const isPro = plan !== 'FREE';
  const used = usage.data?.used ?? 0;
  const limit = usage.data?.limit;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Your profile"
        trailing={
          <RoundButton
            icon="settings-outline"
            onPress={() => router.push('/settings')}
            label="Settings"
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* An ink slab, like the home hero. The heaviest object on the screen
            should be the student, not the form asking about them. */}
        <Animated.View entering={staggeredEntrance(0)}>
          <Card tone="ink" style={styles.hero}>
            <Kofi mood="idle" size={78} grounded={false} />

            <Text style={styles.heroName} numberOfLines={1}>
              {user?.fullName ?? 'Student'}
            </Text>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {user?.email}
            </Text>

            <View style={[styles.planPill, isPro && styles.planPillPro]}>
              <Text style={[styles.planText, isPro && styles.planTextPro]}>
                {isPro ? plan : 'Free plan'}
              </Text>
            </View>

            {(user?.university || user?.programme) ? (
              <Text style={styles.heroMeta} numberOfLines={1}>
                {[user?.programme, user?.university].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </Card>
        </Animated.View>

        {/* What they have built up. A profile with numbers on it is worth
            visiting; one with only a form is somewhere you go to fix a typo. */}
        <Animated.View entering={staggeredEntrance(1)} style={styles.statRow}>
          <Card style={styles.statCard}>
            <CountUp value={stats.data?.totalLectures ?? 0} style={styles.statValue} />
            <Text style={styles.statLabel}>Lectures</Text>
          </Card>
          <Card style={styles.statCard}>
            <CountUp value={readiness.data?.quizzesTaken ?? 0} style={styles.statValue} />
            <Text style={styles.statLabel}>Quizzes</Text>
          </Card>
          <Card style={styles.statCard}>
            <CountUp value={used} style={styles.statValue} />
            <Text style={styles.statLabel}>
              {limit == null ? 'This month' : `Of ${limit} this month`}
            </Text>
          </Card>
        </Animated.View>

        {!isPro ? (
          <Animated.View entering={staggeredEntrance(2)}>
            <Card onPress={() => router.push('/upgrade')} style={styles.upgrade}>
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Go unlimited</Text>
                <Text style={styles.upgradeCopy}>
                  Unlimited recordings, deeper exam prep and priority processing.
                </Text>
              </View>
              <View style={styles.upgradeChevron}>
                <Text style={styles.upgradeArrow}>→</Text>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={staggeredEntrance(3)}>
          <SectionHeader title="Details" />
          <GlassCard>
            <View style={styles.form}>
              <TextField
                label="FULL NAME"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <TextField
                label="UNIVERSITY"
                value={university}
                onChangeText={setUniversity}
                placeholder="Add your university"
                autoCapitalize="words"
              />
              <TextField
                label="PROGRAMME"
                value={programme}
                onChangeText={setProgramme}
                placeholder="Add your programme"
                autoCapitalize="words"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {saved ? <Text style={styles.saved}>Profile updated.</Text> : null}

            <NeonButton
              label="Save changes"
              onPress={save}
              loading={saving}
              style={styles.saveButton}
            />
          </GlassCard>
        </Animated.View>

        <Animated.View entering={staggeredEntrance(4)}>
          <NeonButton label="Sign out" onPress={signOut} variant="danger" style={styles.signOut} />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  heroName: {
    ...typography.title,
    color: c.textOnInk,
    marginTop: spacing.sm,
  },
  heroEmail: {
    ...typography.caption,
    color: c.textOnInkMuted,
  },
  planPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: c.inkElevated,
  },
  planPillPro: {
    backgroundColor: c.accentVivid,
  },
  planText: {
    ...typography.micro,
    fontWeight: '600',
    color: c.onInkElevated,
    letterSpacing: 0.4,
  },
  planTextPro: {
    color: c.textOnAccent,
  },
  heroMeta: {
    ...typography.micro,
    color: c.textOnInkMuted,
    marginTop: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.title,
    color: c.accent,
  },
  statLabel: {
    ...typography.micro,
    color: c.textMuted,
    textAlign: 'center',
  },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  upgradeText: {
    flex: 1,
    gap: 2,
  },
  upgradeTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  upgradeCopy: {
    ...typography.micro,
    color: c.textMuted,
  },
  upgradeChevron: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  upgradeArrow: {
    ...typography.body,
    color: c.accent,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: c.danger,
    marginTop: spacing.md,
  },
  saved: {
    ...typography.caption,
    color: c.accent,
    marginTop: spacing.md,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  signOut: {
    marginTop: spacing.xxl,
  },
});
