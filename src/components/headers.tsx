import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * A white circle with an icon in it — the app's standard piece of navigation
 * chrome.
 *
 * Circles rather than bare glyphs because a floating icon has no target the eye
 * can measure; giving it a surface makes it obviously pressable and gives the
 * top of every screen the same shape vocabulary as the tab bar at the bottom.
 */
export function RoundButton({
  icon,
  onPress,
  label,
  tone = 'surface',
  disabled = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Accessibility label — these buttons have no visible text. */
  label: string;
  tone?: 'surface' | 'ink' | 'danger';
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.round,
        tone === 'ink' && styles.roundInk,
        tone === 'danger' && styles.roundDanger,
        pressed && styles.roundPressed,
        disabled && styles.roundDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          tone === 'ink'
            ? colors.textOnInk
            : tone === 'danger'
              ? colors.danger
              : colors.text
        }
      />
    </Pressable>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Shown on the right — a settings button, an action, a count. */
  trailing?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, trailing }: ScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {onBack !== undefined || router.canGoBack() ? (
        <RoundButton icon="chevron-back" onPress={handleBack} label="Go back" />
      ) : null}

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

/**
 * Section divider used down the length of the scrolling screens.
 *
 * When there is an action, the *whole row* is the target — heading included.
 * Only the "See all" text used to be tappable, so tapping the section title
 * (the obvious thing to reach for, and a much larger target) did nothing at
 * all. A chevron makes the affordance readable rather than relying on the link
 * text alone.
 */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  // The affordance renders whenever there is an `action` label, even without
  // `onAction` — a caller may have made a larger surrounding block the target
  // and just wants the header to advertise it.
  const body = (
    <>
      {/* One line, always. If the row ever does hand this less width than the
          title needs, an ellipsis says so plainly — a silently dropped last
          word looks like the copy was written wrong. */}
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      {action ? (
        <View style={styles.sectionActionRow}>
          <Text style={styles.sectionAction}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.accent} />
        </View>
      ) : null}
    </>
  );

  if (!onAction) {
    return <View style={styles.section}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onAction}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={action ? `${title}. ${action}` : title}
      style={({ pressed }) => [styles.section, pressed && styles.sectionPressed]}
    >
      {body}
    </Pressable>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  roundInk: {
    backgroundColor: c.ink,
  },
  roundDanger: {
    backgroundColor: c.dangerSoft,
  },
  roundPressed: {
    opacity: 0.7,
  },
  roundDisabled: {
    opacity: 0.5,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    color: c.text,
  },
  subtitle: {
    ...typography.caption,
    color: c.textSecondary,
  },
  trailing: {
    marginLeft: 'auto',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: c.text,
    /*
     * Given the row's width outright, rather than measuring its own.
     *
     * `flex: 1`, not `flexShrink: 1` — the difference is the whole bug. Shrink
     * only permits the Text to be *smaller* than its content, which is the
     * wrong direction: Android sized it to content, the measurement of a
     * negatively-tracked font came up a word short, and "Your library" rendered
     * as "Your". Growing it to fill the row means the intrinsic measurement
     * never decides what fits, and any sibling action still sits right because
     * this claims only the space left over.
     */
    flex: 1,
  },
  sectionPressed: {
    opacity: 0.6,
  },
  sectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    // Keeps "See all" intact now that the title grows to fill the row.
    flexShrink: 0,
  },
  sectionAction: {
    ...typography.caption,
    color: c.accent,
  },
});
