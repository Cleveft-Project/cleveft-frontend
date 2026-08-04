import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { authApi, type NotificationPrefs, type NotificationSettings } from '@/api';
import { Animated as Entrance, staggeredEntrance } from '@/components/animated/entrance';
import { useHaptics } from '@/components/animated/haptics';
import { ErrorState, LoadingState } from '@/components/feedback';
import { ScreenHeader, SectionHeader } from '@/components/headers';
import { Screen } from '@/components/screen';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { SettingsGroup, SettingsRow } from '@/components/settings-row';
import { TimeField, TimePickerSheet } from '@/components/time-picker';
import { useCollapsingHeader } from '@/state/chrome-context';
import { useNotifications } from '@/state/notifications-context';
import { spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The zone's UTC offset, e.g. "GMT+0".
 *
 * <p>Shown instead of the city half of the IANA name. "Africa/Accra" is the
 * timezone a phone anywhere in Ghana reports — the country has one — so
 * rendering "Accra" to someone in Kumasi looks like a wrong guess at their
 * location rather than the right name for their clock.
 */
function offsetLabel(timezone: string): string {
  try {
    const label = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value;

    return label ?? timezone;
  } catch {
    // An unrecognised zone falls back to its own name, which is still more
    // truthful than inventing an offset.
    return timezone;
  }
}

/** Keys that are a plain on/off switch. */
type ToggleKey = Exclude<
  keyof NotificationPrefs,
  'dailyReminderAt' | 'quietHoursFrom' | 'quietHoursTo'
>;

/**
 * What each switch is called, and what it honestly does.
 *
 * <p>Subtitles describe the notification rather than the setting. "Someone
 * adopts your learning path" tells a student what will arrive; "Path adoption
 * notifications" tells them nothing they could not read off the title.
 */
const TOGGLES: {
  key: ToggleKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'accent' | 'violet' | 'warning';
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'lectureReady',
    icon: 'checkmark-circle',
    tone: 'accent',
    title: 'Lecture finished',
    subtitle: 'When a recording is transcribed — or when one fails',
  },
  {
    key: 'dailyReminder',
    icon: 'alarm',
    tone: 'warning',
    title: 'Daily nudge',
    subtitle: 'One reminder, only on days you have not studied',
  },
  {
    key: 'pathAdopted',
    icon: 'git-branch',
    tone: 'violet',
    title: 'Someone follows your path',
    subtitle: 'When a course-mate adopts a path you shared',
  },
  {
    key: 'peerRequest',
    icon: 'person-add',
    title: 'Circle requests',
    subtitle: 'When someone asks to connect, or accepts you',
  },
  {
    key: 'weeklySummary',
    icon: 'stats-chart',
    title: 'Weekly summary',
    subtitle: 'Where you stand across your courses, once a week',
  },
  {
    key: 'circleActivity',
    icon: 'people',
    title: 'Circle activity',
    subtitle: 'What your course-mates are recording and revising',
  },
];

/**
 * Which notifications Cleveft may send, and when.
 *
 * <p>Saves on change rather than behind a button. A settings screen with a Save
 * button is a screen you can leave in a state you did not mean to keep, and the
 * write here is one small request.
 */
export default function NotificationsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();
  const edges = useScrollEdges();
  // Title shrinks and lifts as the page scrolls, matching every other scrolling
  // screen in the app.
  const headerStyle = useCollapsingHeader();
  const { granted, supported, askPermission, refresh } = useNotifications();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /*
   * Which time is being edited, if any. One sheet serves all three fields —
   * three sheets would be three copies of the same thing differing only in
   * which preference they write.
   */
  const [editing, setEditing] = useState<{
    key: 'dailyReminderAt' | 'quietHoursFrom' | 'quietHoursTo';
    label: string;
  } | null>(null);

  /*
   * The last save wins. Toggling three switches quickly would otherwise race —
   * whichever response landed last would decide the state, which is not
   * necessarily the last thing the student touched.
   */
  const saveToken = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await authApi.notificationSettings());
    } catch {
      setError('Could not load your notification settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Re-checks the OS permission when the app comes back to the foreground.
   * Without this, a student who taps through to system settings, allows
   * notifications and returns would come back to a screen still insisting they
   * are switched off.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const save = useCallback(async (next: NotificationSettings) => {
    // Optimistic: the switch moves under the finger, not after a round trip.
    setSettings(next);

    const token = ++saveToken.current;
    try {
      const saved = await authApi.updateNotificationSettings(next);
      if (token === saveToken.current) {
        setSettings(saved);
      }
    } catch {
      if (token === saveToken.current) {
        // Reload rather than guess. Showing a switch in a position the server
        // did not accept is the one outcome worse than a slow one.
        void load();
      }
    }
  }, [load]);

  const setPref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      if (!settings) {
        return;
      }
      haptics.tap();
      void save({ ...settings, prefs: { ...settings.prefs, [key]: value } });
    },
    [haptics, save, settings],
  );

  const open = useCallback(
    (key: 'dailyReminderAt' | 'quietHoursFrom' | 'quietHoursTo', label: string) => {
      haptics.tap();
      setEditing({ key, label });
    },
    [haptics],
  );

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Notifications" />
        <LoadingState label="Loading your settings…" />
      </Screen>
    );
  }

  if (error || !settings) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Notifications" />
        <ErrorState message={error ?? 'Something went wrong.'} onRetry={load} />
      </Screen>
    );
  }

  const prefs = settings.prefs;

  // Two different problems, and telling them apart matters. `blocked` is the
  // phone refusing; `!supported` is this build being unable to receive push at
  // all, which is every Expo Go session. Saying "your phone is blocking these"
  // when the truth is "this build cannot do push" sends someone into system
  // settings to fix something that is not broken.
  const blocked = supported && granted === false;
  const unavailable = !supported;

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View style={headerStyle}>
        <ScreenHeader title="Notifications" />
      </Animated.View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* The honest state. Switches that cannot do anything are worse than no
            switches: the student sets them, hears nothing, and concludes the
            feature is broken rather than that the OS is blocking it. */}
        {unavailable ? (
          <Entrance.View entering={staggeredEntrance(0)}>
            <View style={styles.blocked}>
              <View style={styles.blockedIcon}>
                <Ionicons name="phone-portrait" size={20} color={colors.warning} />
              </View>
              <View style={styles.blockedText}>
                <Text style={styles.blockedTitle}>Not available in Expo Go</Text>
                <Text style={styles.blockedBody}>
                  Push was removed from Expo Go, so nothing here can reach you until you
                  install the built app. Your choices still save.
                </Text>
              </View>
            </View>
          </Entrance.View>
        ) : null}

        {blocked ? (
          <Entrance.View entering={staggeredEntrance(0)}>
            <View style={styles.blocked}>
              <View style={styles.blockedIcon}>
                <Ionicons name="notifications-off" size={20} color={colors.warning} />
              </View>
              <View style={styles.blockedText}>
                <Text style={styles.blockedTitle}>Notifications are off for Cleveft</Text>
                <Text style={styles.blockedBody}>
                  Your phone is blocking them, so nothing below can reach you until that
                  changes.
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.blockedAction}
              onPress={async () => {
                haptics.tap();
                // Ask directly if the OS will still show a dialog; otherwise the
                // only route left is system settings.
                const allowed = await askPermission();
                if (!allowed) {
                  void Linking.openSettings().catch(() => {});
                }
              }}
              accessibilityRole="button"
            >
              <Text style={styles.blockedActionText}>Turn them on</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.textOnAccent} />
            </Pressable>
          </Entrance.View>
        ) : null}

        <Entrance.View entering={staggeredEntrance(blocked ? 1 : 0)}>
          <SectionHeader title="What Cleveft sends" />
          <SettingsGroup>
            {TOGGLES.map((toggle, index) => (
              <SettingsRow
                key={toggle.key}
                first={index === 0}
                icon={toggle.icon}
                tone={toggle.tone}
                title={toggle.title}
                subtitle={toggle.subtitle}
                trailing={
                  <Switch
                    value={prefs[toggle.key]}
                    disabled={blocked}
                    onValueChange={(next) => setPref(toggle.key, next)}
                    trackColor={{ false: colors.surfaceSunken, true: colors.accentVivid }}
                    thumbColor={colors.surfaceSolid}
                  />
                }
              />
            ))}
          </SettingsGroup>
        </Entrance.View>

        {/* Appears only when the reminder is on — a time for something that
            never happens is a setting for nothing. */}
        {prefs.dailyReminder ? (
          <Entrance.View entering={staggeredEntrance(blocked ? 2 : 1)}>
            <SectionHeader title="Daily nudge" />
            {/* Says what it does. A heading with a time in it tells you when
                something happens without ever saying what. */}
            <Text style={styles.explain}>
              One reminder to study. Nothing arrives on a day you have already recorded,
              revised or asked a question.
            </Text>
            <Animated.View layout={LinearTransition.springify()}>
              <TimeField
                label="Remind me at"
                value={prefs.dailyReminderAt}
                disabled={blocked}
                onPress={() => open('dailyReminderAt', 'Remind me at')}
              />
            </Animated.View>
          </Entrance.View>
        ) : null}

        <Entrance.View entering={staggeredEntrance(blocked ? 3 : 2)}>
          <SectionHeader title="Quiet hours" />
          <Text style={styles.explain}>
            Nothing arrives between these times.
          </Text>

          <TimeField
            label="From"
            value={prefs.quietHoursFrom}
            disabled={blocked}
            onPress={() => open('quietHoursFrom', 'Quiet hours start')}
          />
          <TimeField
            label="Until"
            value={prefs.quietHoursTo}
            disabled={blocked}
            onPress={() => open('quietHoursTo', 'Quiet hours end')}
          />

          <Text style={styles.hint}>
            A finished lecture still comes through — you started it yourself and are waiting
            on it. Everything else holds until morning.
          </Text>
        </Entrance.View>

        {/* The offset, not the city out of the IANA zone name — "Accra" shown to
            someone in Kumasi reads as a wrong guess at their location rather
            than the right name for their clock. */}
        <Animated.View entering={FadeIn.delay(300)}>
          <Text style={styles.hint}>
            Times follow your phone&apos;s timezone ({offsetLabel(settings.timezone)}), not your
            location.
          </Text>
        </Animated.View>

        {granted ? (
          <Animated.View entering={FadeIn.delay(400)} style={styles.footer}>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            <Text style={styles.footerText}>This device is set up to receive them.</Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <ScrollEdges {...edges} />

      {/* On its own surface, above everything. That is what removes the gesture
          conflict: a wheel inside the page is a second vertical scroll view
          competing with the first, and the page wins. */}
      <TimePickerSheet
        visible={editing !== null}
        label={editing?.label ?? ''}
        value={editing ? prefs[editing.key] : '19:00'}
        onCancel={() => setEditing(null)}
        onConfirm={(next) => {
          if (editing) {
            setPref(editing.key, next);
          }
          setEditing(null);
        }}
      />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  blocked: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: c.warningSoft,
    marginTop: spacing.lg,
  },
  blockedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSolid,
  },
  blockedText: {
    flex: 1,
    gap: 2,
  },
  blockedTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  blockedBody: {
    ...typography.caption,
    color: c.textSecondary,
    lineHeight: 19,
  },
  blockedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: c.accentVivid,
  },
  blockedActionText: {
    ...typography.bodyStrong,
    color: c.textOnAccent,
  },
  hint: {
    ...typography.micro,
    color: c.textMuted,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    lineHeight: 16,
  },
  explain: {
    ...typography.caption,
    color: c.textSecondary,
    paddingHorizontal: spacing.xs,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxxl,
  },
  footerText: {
    ...typography.micro,
    color: c.textMuted,
  },
});
