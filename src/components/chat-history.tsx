import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConversationSummary } from '@/api/types';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const DRAWER_W = Math.min(320, Dimensions.get('window').width * 0.84);

/**
 * Deliberately not a spring.
 *
 * A spring on a panel this wide overshoots past its resting edge and settles
 * back, which reads as the drawer being thrown at the screen rather than
 * pulled open. Surfaces that enter from off-screen want a decelerating curve
 * with no overshoot at all: fast off the mark, easing to a dead stop exactly
 * at the edge. Springs are for small things responding to a finger.
 */
const ENTER = { duration: 280, easing: Easing.bezier(0.05, 0.7, 0.1, 1) };
/** Leaving is quicker, and accelerates away — nobody watches a panel exit. */
const EXIT = { duration: 200, easing: Easing.bezier(0.3, 0, 0.8, 0.15) };

const PRESS_SPRING = { damping: 20, stiffness: 190, mass: 0.8 } as const;

interface ChatHistoryProps {
  open: boolean;
  conversations: ConversationSummary[];
  loading: boolean;
  /** Highlighted as the thread currently on screen. */
  activeId?: string;
  onClose: () => void;
  onSelect: (conversation: ConversationSummary) => void;
  onNew: () => void;
  onDelete: (conversation: ConversationSummary) => void;
}

/**
 * Groups threads the way someone actually looks for them.
 *
 * Nobody remembers the date they asked something; they remember roughly how
 * long ago. Absolute dates only start being useful once "days ago" stops
 * meaning anything, which is why the buckets get coarser as they get older.
 */
function bucketFor(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return 'Earlier';
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return then.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function ChatHistory({
  open,
  conversations,
  loading,
  activeId,
  onClose,
  onSelect,
  onNew,
  onDelete,
}: ChatHistoryProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const groups = useMemo(() => {
    const map = new Map<string, ConversationSummary[]>();
    // Newest first, so the buckets come out in order without a second sort.
    [...conversations]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .forEach((conversation) => {
        const key = bucketFor(conversation.updatedAt);
        const existing = map.get(key);
        if (existing) {
          existing.push(conversation);
        } else {
          map.set(key, [conversation]);
        }
      });
    return [...map.entries()];
  }, [conversations]);

  // Driven by one shared value rather than mount/unmount animations: the panel
  // and its scrim have to move as a single gesture, and entering/exiting props
  // give each element its own independent timeline.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, open ? ENTER : EXIT);
  }, [open, progress]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_W, 0]) }],
  }));

  // Content trails the panel edge very slightly, so the drawer reads as a
  // surface arriving with things on it rather than a flat sheet of pixels.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0.4, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-16, 0]) }],
  }));

  return (
    // Stays mounted so it can animate out; ignores touches while closed.
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      {/* Scrim first so the drawer sits above it, and tappable so the drawer
          dismisses the way every sheet on the platform does. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close history"
        />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, drawerStyle, { paddingTop: insets.top + spacing.lg }]}
      >
        <Animated.View style={[styles.head, contentStyle]}>
          <Text style={styles.headTitle}>History</Text>
          <Pressable
            onPress={onNew}
            hitSlop={8}
            style={styles.newButton}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
          >
            <Ionicons name="add" size={16} color={colors.textOnAccent} />
            <Text style={styles.newText}>New</Text>
          </Pressable>
        </Animated.View>

        {loading && conversations.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.emptyText}>
              Nothing here yet. Ask a question and it will be saved for you.
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={contentStyle}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
            showsVerticalScrollIndicator={false}
          >
            {groups.map(([label, items]) => (
              <View key={label} style={styles.group}>
                <Text style={styles.groupLabel}>{label}</Text>
                {items.map((conversation) => (
                  <HistoryRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onPress={() => onSelect(conversation)}
                    onDelete={() => onDelete(conversation)}
                  />
                ))}
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function HistoryRow({
  conversation,
  active,
  onPress,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    // No per-row entrance any more: the drawer stays mounted so it can animate
    // out, which means a mount animation would only ever have played once,
    // off-screen, before the student first opened it.
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        // Delete is on a long press rather than a visible button: a row this
        // narrow cannot carry a trash icon without crowding the title it
        // exists to show.
        onLongPress={onDelete}
        style={[styles.row, active && styles.rowActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={15}
          color={active ? colors.accent : colors.textMuted}
        />
        <Text style={[styles.rowText, active && styles.rowTextActive]} numberOfLines={1}>
          {conversation.title?.trim() || 'Untitled conversation'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    scrim: {
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    drawer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_W,
      backgroundColor: c.bgElevated,
      borderRightWidth: StyleSheet.hairlineWidth * 2,
      borderRightColor: c.border,
      borderTopRightRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    headTitle: {
      ...typography.heading,
      color: c.text,
    },
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: c.accentVivid,
    },
    newText: {
      ...typography.micro,
      color: c.textOnAccent,
    },
    state: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
    },
    list: {
      gap: spacing.lg,
    },
    group: {
      gap: spacing.sm,
    },
    groupLabel: {
      ...typography.micro,
      color: c.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: 'transparent',
    },
    rowActive: {
      backgroundColor: c.accentSoft,
      borderColor: c.borderStrong,
    },
    rowText: {
      ...typography.caption,
      color: c.textSecondary,
      flex: 1,
    },
    rowTextActive: {
      color: c.text,
    },
  });
