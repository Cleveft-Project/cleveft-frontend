import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { examPrepApi, lecturesApi } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { useHaptics } from '@/components/animated/haptics';
import { Card } from '@/components/card';
import { CountUp } from '@/components/count-up';
import { RoundButton, ScreenHeader, SectionHeader } from '@/components/headers';
import { Kofi } from '@/components/kofi';
import { NeonButton } from '@/components/neon-button';
import { ProfileEditSheet } from '@/components/profile-edit-sheet';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useCollapsingHeader } from '@/state/chrome-context';
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

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();
  // Title shrinks and lifts as the page scrolls, matching every other
  // scrolling screen in the app.
  const headerStyle = useCollapsingHeader();
  const feel = useHaptics();
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

  /*
   * The form's state lives in the sheet now, not here.
   *
   * That is not only tidiness: it used to seed from `user` at mount, and this
   * screen can render before auth has hydrated — so the course list started
   * empty and saving sent an empty array, which the server reads as "I take no
   * courses". Seeding on open instead means the values are always the current
   * ones.
   */
  const [editing, setEditing] = useState(false);

  const plan = user?.plan ?? 'FREE';
  const isPro = plan !== 'FREE';
  const used = usage.data?.used ?? 0;
  const limit = usage.data?.limit;

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View style={headerStyle}>
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
      </Animated.View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
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

            {/* The way in to changing any of this. One button on the hero,
                rather than a form filling the lower half of the screen — the
                fields describe you, they are not what you came to look at. */}
            <Pressable
              onPress={() => {
                feel.tap();
                setEditing(true);
              }}
              hitSlop={8}
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Edit your profile"
            >
              {/* onInkElevated, not textOnInk. The pill's fill is `inkElevated`,
                  which is white in the light theme — textOnInk is white too, so
                  the label and icon vanished into the button. */}
              <Ionicons name="create-outline" size={14} color={colors.onInkElevated} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
          </Card>
        </Animated.View>

        {/* Courses as identity, not as a field.
            What a student takes is most of who they are academically, and it is
            the thing their coursemates find them by. Shown plainly here; changed
            in the sheet. */}
        {(user?.courses?.length ?? 0) > 0 ? (
          <Animated.View entering={staggeredEntrance(1)}>
            <SectionHeader title="Courses" />
            <View style={styles.courseRow}>
              {(user?.courses ?? []).map((code) => (
                <View key={code} style={styles.courseChip}>
                  <Text style={styles.courseChipText}>{code}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={staggeredEntrance(1)}>
            <Pressable
              onPress={() => {
                feel.tap();
                setEditing(true);
              }}
              style={styles.courseEmpty}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.courseEmptyText}>
                Add your courses so coursemates can find you
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* What they have built up. A profile with numbers on it is worth
            visiting; one with only a form is somewhere you go to fix a typo. */}
        <Animated.View entering={staggeredEntrance(2)} style={styles.statRow}>
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

        {/* Above the upgrade prompt on purpose: what the student has earned
            should come before what they could buy. */}
        <Animated.View entering={staggeredEntrance(3)}>
          <Card onPress={() => router.push('/achievements')} style={styles.upgrade}>
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>Achievements</Text>
              <Text style={styles.upgradeCopy}>
                What you have earned, and what is nearly within reach.
              </Text>
            </View>
            <View style={styles.upgradeChevron}>
              <Text style={styles.upgradeArrow}>→</Text>
            </View>
          </Card>
        </Animated.View>

        {!isPro ? (
          <Animated.View entering={staggeredEntrance(4)}>
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

        <Animated.View entering={staggeredEntrance(5)}>
          <NeonButton label="Sign out" onPress={signOut} variant="danger" style={styles.signOut} />
        </Animated.View>
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />

      <ProfileEditSheet
        visible={editing}
        onClose={() => setEditing(false)}
        user={user}
        onSaved={updateUser}
      />
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: c.inkElevated,
  },
  editText: {
    ...typography.micro,
    color: c.onInkElevated,
    fontWeight: '600',
  },
  courseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  courseChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  courseChipText: {
    ...typography.caption,
    color: c.accent,
    fontWeight: '600',
  },
  courseEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderMuted,
  },
  courseEmptyText: {
    ...typography.caption,
    color: c.textSecondary,
    flex: 1,
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
  signOut: {
    marginTop: spacing.xxl,
  },
});
