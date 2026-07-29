import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BASE_URL } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { ScreenHeader, SectionHeader } from '@/components/headers';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { ThemeToggle } from '@/components/theme-toggle';
import { useVoice } from '@/state/voice-context';
import { spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * How the app behaves — and nothing about who the student is.
 *
 * The counterpart to the profile screen. Everything here is a preference or a
 * diagnostic: what it looks like, whether the mascot speaks, which machine it
 * is talking to. None of it belongs in front of someone who opened their
 * profile to correct their name.
 */
export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const voice = useVoice();

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={staggeredEntrance(0)}>
          <SectionHeader title="Appearance" />
          <SettingsGroup>
            <SettingsRow
              first
              icon={isDark ? 'moon' : 'sunny'}
              tone={isDark ? 'violet' : 'warning'}
              title={isDark ? 'Dark' : 'Light'}
              subtitle={
                isDark
                  ? 'Easier on the eyes in a dim lecture hall'
                  : 'Better in daylight and for long reading'
              }
              trailing={<ThemeToggle />}
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={staggeredEntrance(1)}>
          <SectionHeader title="Mascot" />
          <SettingsGroup>
            <SettingsRow
              first
              icon="volume-high"
              title="Speak out loud"
              subtitle={
                voice.enabled
                  ? 'Kofi reads his lines aloud — mind the lecture hall'
                  : 'Kofi stays silent'
              }
              trailing={
                <Switch
                  value={voice.enabled}
                  onValueChange={voice.setEnabled}
                  trackColor={{ false: colors.surfaceSunken, true: colors.accentVivid }}
                  thumbColor={colors.surfaceSolid}
                />
              }
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={staggeredEntrance(2)}>
          <SectionHeader title="Account" />
          <SettingsGroup>
            <SettingsRow
              first
              icon="person-circle"
              title="Your profile"
              subtitle="Name, university and programme"
              onPress={() => router.push('/profile')}
            />
            <SettingsRow
              icon="sparkles"
              tone="violet"
              title="Plan"
              subtitle="Recording limits and upgrades"
              onPress={() => router.push('/upgrade')}
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={staggeredEntrance(3)}>
          <SectionHeader title="Connection" />
          <SettingsGroup>
            <SettingsRow
              first
              icon="server"
              tone="accent"
              title="Gateway"
              subtitle={BASE_URL}
            />
          </SettingsGroup>
          <Text style={styles.hint}>
            Set EXPO_PUBLIC_GATEWAY_URL in .env to point the app at a different machine. On a
            physical device this must be your computer&apos;s LAN address, not localhost.
          </Text>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Cleveft</Text>
          <Text style={styles.footerHint}>Go back and get what you forgot.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  hint: {
    ...typography.micro,
    color: c.textMuted,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: 2,
  },
  footerText: {
    ...typography.caption,
    color: c.textMuted,
  },
  // The Sankofa translation, quietly, at the bottom of the least-visited
  // screen — the kind of detail people find rather than are shown.
  footerHint: {
    ...typography.micro,
    color: c.textMuted,
    opacity: 0.7,
  },
});
