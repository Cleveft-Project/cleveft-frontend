import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { useHaptics } from '@/components/animated/haptics';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const WINDOW = Dimensions.get('window');
const DRAWER_W = Math.min(320, WINDOW.width * 0.84);

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
  /** Renames a thread. The panel owns the sheet; the screen owns the request. */
  onRename: (conversation: ConversationSummary, title: string) => void;
  onTogglePin: (conversation: ConversationSummary) => void;
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
  onRename,
  onTogglePin,
}: ChatHistoryProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [menuFor, setMenuFor] = useState<ConversationSummary | null>(null);
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);

  /*
   * Neither overlay may outlive the drawer.
   *
   * They render inside its root, which sets pointerEvents to none while closed
   * — so a menu still mounted when the drawer went away stayed on screen, over
   * the chat, and could not be tapped at all. Visibility was tied to menuFor
   * and interactivity to open, and the two could disagree.
   */
  useEffect(() => {
    if (!open) {
      setMenuFor(null);
      setRenaming(null);
    }
  }, [open]);

  /*
   * Pinned threads come out of the date buckets entirely.
   *
   * Leaving them in place and marking them would not help — the point of
   * pinning is that a thread stops sinking as newer questions are asked, and it
   * cannot do that while it is still filed under the day it was last used.
   */
  const pinned = useMemo(
    () =>
      conversations
        .filter((conversation) => conversation.pinned)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [conversations],
  );

  const groups = useMemo(() => {
    const map = new Map<string, ConversationSummary[]>();
    // Newest first, so the buckets come out in order without a second sort.
    [...conversations]
      .filter((conversation) => !conversation.pinned)
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
            {pinned.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>PINNED</Text>
                {pinned.map((conversation) => (
                  <HistoryRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onPress={() => onSelect(conversation)}
                    onLongPress={() => setMenuFor(conversation)}
                  />
                ))}
              </View>
            ) : null}

            {groups.map(([label, items]) => (
              <View key={label} style={styles.group}>
                <Text style={styles.groupLabel}>{label}</Text>
                {items.map((conversation) => (
                  <HistoryRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onPress={() => onSelect(conversation)}
                    onLongPress={() => setMenuFor(conversation)}
                  />
                ))}
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </Animated.View>

      {/* Belt and braces with the effect above: even for the frame between the
          drawer closing and that effect running, nothing renders. */}
      <RowMenu
        conversation={open ? menuFor : null}
        onClose={() => setMenuFor(null)}
        // Closes the menu and opens rename in the same tick. Leaving the menu up
        // behind the rename sheet would stack two modals, and dismissing the
        // upper one would reveal a menu the student has finished with.
        onRename={() => {
          setRenaming(menuFor);
          setMenuFor(null);
        }}
        onTogglePin={() => {
          if (menuFor) {
            onTogglePin(menuFor);
          }
          setMenuFor(null);
        }}
        onDelete={() => {
          const target = menuFor;
          setMenuFor(null);
          if (target) {
            onDelete(target);
          }
        }}
      />

      <RenameSheet
        conversation={open ? renaming : null}
        onClose={() => setRenaming(null)}
        onSave={(title) => {
          if (renaming) {
            onRename(renaming, title);
          }
          setRenaming(null);
        }}
      />
    </View>
  );
}

function HistoryRow({
  conversation,
  active,
  onPress,
  onLongPress,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();
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
        /*
         * Long press opens a menu rather than going straight to a delete
         * confirmation.
         *
         * The old behaviour made destruction the only thing a long press could
         * mean, which is a poor bargain: the student had to risk the delete
         * dialog to discover there was nothing else there, and there was no way
         * at all to rename or keep a thread. A menu costs one extra tap on the
         * rare action and makes the other two possible.
         */
        onLongPress={() => {
          haptics.commit();
          onLongPress();
        }}
        style={[styles.row, active && styles.rowActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityHint="Long press for rename, pin and delete"
      >
        <Ionicons
          name={conversation.pinned ? 'bookmark' : 'chatbubble-ellipses-outline'}
          size={15}
          color={conversation.pinned ? colors.accent : active ? colors.accent : colors.textMuted}
        />
        <Text style={[styles.rowText, active && styles.rowTextActive]} numberOfLines={1}>
          {conversation.title?.trim() || 'Untitled conversation'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * What a long press offers: rename, pin, delete.
 *
 * <p>A sheet rather than {@code Alert} with three buttons, because Android
 * alerts lay their buttons out in a row and three of them wrap badly at any
 * reasonable font size — and because delete needs to be visibly separated from
 * the two harmless ones rather than sitting beside them.
 */
function RowMenu({
  conversation,
  onClose,
  onRename,
  onTogglePin,
  onDelete,
}: {
  conversation: ConversationSummary | null;
  onClose: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  if (!conversation) {
    return null;
  }

  const pinned = !!conversation.pinned;

  return (
    /*
     * A plain overlay, not a Modal.
     *
     * This sits inside the drawer, which is already a full-screen absolute
     * layer — and a Modal nested inside one opens a second native window on
     * Android. The window blocks the app beneath it while its own backdrop sits
     * in the layer below, so neither the menu nor anything else takes a touch
     * and the app looks frozen. Rendering in place has none of that, and the
     * drawer's own root gives it the same coverage a Modal would have.
     */
    /*
     * The backdrop wraps the sheet rather than sitting beside it.
     *
     * As siblings, dismissal depended on the backdrop actually receiving the
     * tap — and it did not, for reasons I could not pin down from the layout
     * alone. Wrapping removes the question: any touch that is not inside the
     * sheet is by definition inside the Pressable around it. The sheet claims
     * its own touches so they do not bubble out and close it.
     */
    <Pressable style={styles.menuBackdrop} onPress={onClose} accessibilityLabel="Close">
      <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
        <Text style={styles.menuTitle} numberOfLines={1}>
          {conversation.title?.trim() || 'Untitled conversation'}
        </Text>

        <Pressable style={styles.menuItem} onPress={onRename} accessibilityRole="button">
          <Ionicons name="create-outline" size={18} color={colors.text} />
          <Text style={styles.menuItemText}>Rename</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={onTogglePin} accessibilityRole="button">
          <Ionicons
            name={pinned ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={colors.text}
          />
          <Text style={styles.menuItemText}>{pinned ? 'Unpin' : 'Pin to top'}</Text>
        </Pressable>

        {/* Separated by a rule, and the only red thing in the sheet. */}
        <Pressable
          style={[styles.menuItem, styles.menuItemDestructive]}
          onPress={onDelete}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Rename, in a sheet of its own so the keyboard has somewhere to go. */
function RenameSheet({
  conversation,
  onClose,
  onSave,
}: {
  conversation: ConversationSummary | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  // Seeded each time it opens rather than held in sync, so cancelling leaves
  // the original name alone.
  useEffect(() => {
    setDraft(conversation?.title?.trim() ?? '');
  }, [conversation]);

  if (!conversation) {
    return null;
  }

  return (
    // Same wrapping backdrop as the menu, for the same reason.
    <Pressable style={styles.menuBackdrop} onPress={onClose} accessibilityLabel="Close">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.renameLift}
        pointerEvents="box-none"
      >
        <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.menuTitle}>Rename conversation</Text>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Conversation name"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={styles.renameInput}
            autoFocus
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={() => draft.trim() && onSave(draft.trim())}
          />

          <View style={styles.renameActions}>
            <Pressable onPress={onClose} style={styles.renameAction} accessibilityRole="button">
              <Text style={styles.renameCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => draft.trim() && onSave(draft.trim())}
              disabled={!draft.trim()}
              style={styles.renameAction}
              accessibilityRole="button"
            >
              <Text style={[styles.renameSave, !draft.trim() && styles.renameSaveDisabled]}>
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    /* Long-press menu and rename */

    // Lays the sheet out rather than just tinting behind it. The sheet is a
    // child now, so centring it here keeps it inside the touch area by
    // construction — absolute positioning could place it outside its own
    // backdrop, which is untappable on Android.
    /*
     * Measured, not stretched.
     *
     * top/bottom: 0 was collapsing to zero height here, which is why the sheet
     * appeared at the top of the screen instead of centred, why nothing dimmed,
     * and why neither the backdrop nor the menu items took a touch — there was
     * barely any view to touch, and the sheet was drawing outside its own
     * parent's bounds, which Android does not deliver events to.
     *
     * An explicit window size cannot collapse regardless of what the parent
     * does. Read at module scope, like DRAWER_W above it.
     */
    menuBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: WINDOW.width,
      height: WINDOW.height,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    // Centred rather than bottom-anchored: this is a menu about one row, not a
    // new place in the app, and a sheet sliding up from the edge implies the
    // latter.
    menuSheet: {
      backgroundColor: c.surfaceSolid,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      overflow: 'hidden',
    },
    menuTitle: {
      ...typography.micro,
      color: c.textMuted,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    menuItemDestructive: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderMuted,
      marginTop: spacing.xs,
    },
    menuItemText: {
      ...typography.body,
      color: c.text,
    },
    renameLift: {
      flex: 1,
      justifyContent: 'center',
    },
    renameInput: {
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...typography.body,
      color: c.text,
    },
    renameActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    renameAction: {
      paddingVertical: spacing.xs,
    },
    renameCancel: {
      ...typography.bodyStrong,
      color: c.textMuted,
    },
    renameSave: {
      ...typography.bodyStrong,
      color: c.accent,
    },
    renameSaveDisabled: {
      opacity: 0.4,
    },

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
