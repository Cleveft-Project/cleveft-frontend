import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useHaptics } from '@/components/animated/haptics';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * One line in a settings list: icon, label, explanation, control.
 *
 * The pattern every polished settings screen converges on, and for a reason —
 * the icon column gives the eye a rail to scan down, so finding "the one about
 * sound" is a glance rather than a read. A stack of bare cards, which is what
 * this replaced, makes every row cost the same effort as every other.
 *
 * Rows live inside a single card per section and are separated by hairlines
 * rather than gaps, so a section reads as one object with parts instead of
 * several unrelated slabs.
 */
export function SettingsRow({
  icon,
  tone = 'accent',
  title,
  subtitle,
  value,
  onPress,
  trailing,
  first = false,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Tints the icon chip. Sparingly — this is a rail, not a rainbow. */
  tone?: 'accent' | 'violet' | 'warning' | 'danger';
  title: string;
  subtitle?: string;
  /** Right-aligned current value, for rows that show one. */
  value?: string;
  onPress?: () => void;
  /** A switch, or anything else that owns its own interaction. */
  trailing?: React.ReactNode;
  /** Suppresses the top divider on the first row of a section. */
  first?: boolean;
  destructive?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const tint =
    tone === 'violet'
      ? colors.violet
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : colors.accent;

  const chipBackground =
    tone === 'violet'
      ? colors.violetSoft
      : tone === 'warning'
        ? colors.warningSoft
        : tone === 'danger'
          ? colors.dangerSoft
          : colors.accentSoft;

  const body = (
    <View style={[styles.row, !first && styles.divided]}>
      <View style={[styles.chip, { backgroundColor: chipBackground }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>

      <View style={styles.text}>
        <Text style={[styles.title, destructive && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {trailing}

      {/* A chevron only where tapping actually goes somewhere. Showing one next
          to a switch is the classic settings-screen lie. */}
      {onPress && !trailing ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

/** Wraps a run of {@link SettingsRow}s as one card. */
export function SettingsGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.group, style]}>{children}</View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  group: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  // Inset from the left so the divider starts under the text, not under the
  // icon — the detail that makes a list look drawn rather than stacked.
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
  },
  pressed: {
    backgroundColor: c.surfaceSunken,
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    ...typography.bodyStrong,
    color: c.text,
  },
  subtitle: {
    ...typography.micro,
    color: c.textMuted,
  },
  value: {
    ...typography.caption,
    color: c.textSecondary,
    maxWidth: 130,
  },
});
