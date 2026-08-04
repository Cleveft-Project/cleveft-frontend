import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BASE_URL } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { ChangePasswordSheet } from '@/components/change-password-sheet';
import { DeleteAccountSheet } from '@/components/delete-account-sheet';
import { ScreenHeader, SectionHeader } from '@/components/headers';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useCollapsingHeader } from '@/state/chrome-context';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { ThemeToggle } from '@/components/theme-toggle';
import { VoicePicker } from '@/components/voice-picker';
import { useHaptics } from '@/components/animated/haptics';
import { useAuth } from '@/state/auth-context';
import { useFeedback } from '@/state/feedback-context';
import { spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Cleveft's version, read from the manifest rather than hard-coded.
 *
 * <p>A version string that has to be remembered when releasing is a version
 * string that goes stale, and a stale one in a support email is worse than none
 * — it sends whoever reads it looking at the wrong build.
 */
const VERSION = `${Constants.expoConfig?.version ?? '1.0.0'}`;

const SUPPORT_EMAIL = 'support@cleveft.app';
const TERMS_URL = 'https://cleveft.app/terms';
const PRIVACY_URL = 'https://cleveft.app/privacy';
const LICENCES_URL = 'https://cleveft.app/licences';

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

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();
  // Title shrinks and lifts as the page scrolls, matching every other
  // scrolling screen in the app.
  const headerStyle = useCollapsingHeader();
  const { voice, haptics } = useFeedback();
  const feel = useHaptics();
  const [pickingVoice, setPickingVoice] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { user, signOut } = useAuth();

  const openLink = (url: string) => {
    feel.tap();
    // Failures are swallowed: a device with no mail client is not something the
    // student can act on, and an error dialog about it helps nobody.
    void Linking.openURL(url).catch(() => {});
  };

  /*
   * Confirmed, because signing out is not free here.
   *
   * Anything not yet uploaded is lost with the session, and the student has to
   * find their password again to get back in. A single tap away from that, next
   * to two harmless rows, is a trap.
   */
  const confirmSignOut = () => {
    feel.tap();
    Alert.alert('Sign out of Cleveft?', 'Your lectures stay safe. You will need to sign in again.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View style={headerStyle}>
        <ScreenHeader title="Settings" />
      </Animated.View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
          <SectionHeader title="Feedback" />
          <SettingsGroup>
            <SettingsRow
              first
              icon="phone-portrait"
              title="Vibration"
              subtitle={
                haptics.enabled
                  ? 'Answers and results answer back with a tap'
                  : 'No vibration'
              }
              trailing={
                <Switch
                  value={haptics.enabled}
                  onValueChange={(next) => {
                    // Fires before the flag flips, so switching *off* still
                    // gives one last confirming tap.
                    feel.tap();
                    haptics.setEnabled(next);
                  }}
                  trackColor={{ false: colors.surfaceSunken, true: colors.accentVivid }}
                  thumbColor={colors.surfaceSolid}
                />
              }
            />
            <SettingsRow
              icon="volume-high"
              title="Kofi speaks out loud"
              subtitle={
                voice.enabled
                  ? 'Reads his lines aloud — mind the lecture hall'
                  : 'Kofi stays silent'
              }
              trailing={
                <Switch
                  value={voice.enabled}
                  onValueChange={(next) => {
                    feel.tap();
                    voice.setEnabled(next);
                  }}
                  trackColor={{ false: colors.surfaceSunken, true: colors.accentVivid }}
                  thumbColor={colors.surfaceSolid}
                />
              }
            />
            <SettingsRow
              icon="notifications"
              tone="accent"
              title="Notifications"
              subtitle="What Cleveft sends, and when"
              onPress={() => router.push('/notifications')}
            />
            {/* Only once he can be heard. A voice picker above a switch that is
                off is a setting for something that does not happen. */}
            {voice.enabled ? (
              <SettingsRow
                icon="mic"
                tone="violet"
                title="His voice"
                subtitle="Choose the accent, and hear it first"
                value={voice.id ? 'Chosen' : 'Automatic'}
                onPress={() => setPickingVoice(true)}
              />
            ) : null}
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
              icon="key"
              title="Change password"
              subtitle="Signs out every other device"
              onPress={() => {
                feel.tap();
                setChangingPassword(true);
              }}
            />
            <SettingsRow
              icon="sparkles"
              tone="violet"
              title="Plan"
              subtitle="Recording limits and upgrades"
              onPress={() => router.push('/upgrade')}
            />
            {/* Sign out belongs here, not only on the profile screen. Settings
                is the first place anyone looks for it, and not finding it reads
                as the app trying to keep you. */}
            <SettingsRow
              icon="log-out"
              tone="danger"
              title="Sign out"
              subtitle={user?.email ?? undefined}
              destructive
              onPress={confirmSignOut}
            />
            {/* Last row of the last account section — the conventional place,
                and far enough from anything routine that it is never a mistap. */}
            <SettingsRow
              icon="trash"
              tone="danger"
              title="Delete account"
              subtitle="Removes everything, permanently"
              destructive
              onPress={() => {
                feel.tap();
                setDeletingAccount(true);
              }}
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

        {/* Last, and deliberately so. Nobody opens Settings to read the version
            number, but everybody expects to find it at the bottom. */}
        <Animated.View entering={staggeredEntrance(4)}>
          <SectionHeader title="About" />
          <SettingsGroup>
            <SettingsRow
              first
              icon="information-circle"
              title="Version"
              value={VERSION}
            />
            <SettingsRow
              icon="document-text"
              title="Terms of service"
              onPress={() => openLink(TERMS_URL)}
            />
            <SettingsRow
              icon="lock-closed"
              title="Privacy policy"
              onPress={() => openLink(PRIVACY_URL)}
            />
            <SettingsRow
              icon="code-slash"
              title="Open-source licences"
              subtitle="The libraries Cleveft is built on"
              onPress={() => openLink(LICENCES_URL)}
            />
            <SettingsRow
              icon="mail"
              tone="violet"
              title="Contact support"
              subtitle="Tell us what broke, or what is missing"
              onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=Cleveft%20${VERSION}`)}
            />
          </SettingsGroup>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Cleveft</Text>
          <Text style={styles.footerHint}>Go back and get what you forgot.</Text>
        </View>
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />

      <VoicePicker visible={pickingVoice} onClose={() => setPickingVoice(false)} />

      <ChangePasswordSheet
        visible={changingPassword}
        onClose={() => setChangingPassword(false)}
      />

      <DeleteAccountSheet
        visible={deletingAccount}
        onClose={() => setDeletingAccount(false)}
      />
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
