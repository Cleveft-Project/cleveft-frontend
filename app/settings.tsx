import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError, BASE_URL, authApi, lecturesApi } from '@/api';
import { GlassCard } from '@/components/glass-card';
import { ScreenHeader, SectionHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { PlanCard } from '@/components/plan-card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/state/auth-context';
import { useVoice } from '@/state/voice-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const { user, signOut, updateUser } = useAuth();
  const voice = useVoice();

  const usage = useAsync(() => lecturesApi.usage(), []);

  // Coming back from the upgrade screen changes both the tier and what the
  // usage bar should say, so the card re-reads rather than showing the figures
  // the student saw before they paid.
  useFocusEffect(
    useCallback(() => {
      void usage.reload();
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

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Your profile" subtitle={user?.email} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.fullName?.trim()?.[0] ?? 'C').toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName} numberOfLines={1}>
              {user?.fullName}
            </Text>
            <Text style={styles.identityEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </GlassCard>

        <SectionHeader title="Appearance" />
        <GlassCard>
          <View style={styles.appearanceRow}>
            <View style={styles.appearanceText}>
              <Text style={styles.appearanceTitle}>{isDark ? 'Dark' : 'Light'}</Text>
              <Text style={styles.appearanceCopy}>
                {isDark
                  ? 'Easier on the eyes in a dim lecture hall.'
                  : 'Better in daylight and for long reading sessions.'}
              </Text>
            </View>
            <ThemeToggle />
          </View>
        </GlassCard>

        <SectionHeader title="Mascot" />
        <GlassCard>
          <Pressable
            onPress={() => voice.setEnabled(!voice.enabled)}
            style={styles.appearanceRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: voice.enabled }}
            accessibilityLabel="Read the mascot's lines aloud"
          >
            <View style={styles.appearanceText}>
              <Text style={styles.appearanceTitle}>Speak out loud</Text>
              <Text style={styles.appearanceCopy}>
                {voice.enabled
                  ? 'Kofi reads his lines aloud. Mind the lecture hall.'
                  : 'Kofi stays silent. Turn this on and he will speak.'}
              </Text>
            </View>
            <Switch
              value={voice.enabled}
              onValueChange={voice.setEnabled}
              trackColor={{ false: colors.surfaceSunken, true: colors.accentVivid }}
              thumbColor={colors.surfaceSolid}
            />
          </Pressable>
        </GlassCard>

        <SectionHeader title="Plan" />
        <PlanCard
          plan={user?.plan ?? 'FREE'}
          usage={usage.data}
          onUpgrade={() => router.push('/upgrade')}
          onManage={() => router.push('/upgrade')}
        />

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

        <SectionHeader title="Connection" />
        <GlassCard>
          <Text style={styles.metaLabel}>GATEWAY</Text>
          <Text style={styles.metaValue}>{BASE_URL}</Text>
          <Text style={styles.metaHint}>
            Set EXPO_PUBLIC_GATEWAY_URL in .env to point the app at a different machine. On a
            physical device this must be your computer&apos;s LAN address, not localhost.
          </Text>
        </GlassCard>

        <NeonButton
          label="Sign out"
          onPress={signOut}
          variant="danger"
          style={styles.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderStrong,
  },
  avatarText: {
    ...typography.title,
    color: c.accent,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  identityName: {
    ...typography.heading,
    color: c.text,
  },
  identityEmail: {
    ...typography.caption,
    color: c.textMuted,
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
  metaLabel: {
    ...typography.micro,
    color: c.textSecondary,
    letterSpacing: 0.5,
  },
  metaValue: {
    ...typography.body,
    color: c.text,
    marginTop: spacing.xs,
  },
  metaHint: {
    ...typography.micro,
    color: c.textMuted,
    marginTop: spacing.md,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  appearanceText: {
    flex: 1,
    gap: 2,
  },
  appearanceTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  appearanceCopy: {
    ...typography.micro,
    color: c.textMuted,
  },
  signOut: {
    marginTop: spacing.xxl,
  },
});
