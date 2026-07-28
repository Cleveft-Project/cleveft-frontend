import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, LinearTransition } from 'react-native-reanimated';

import { ApiError, chatApi, collabApi } from '@/api';
import type { ChatMessage, Citation, ConversationSummary } from '@/api/types';
import { usePressScale } from '@/components/animated/press-scale';
import { ChatHistory } from '@/components/chat-history';
import { FloatingPrompt } from '@/components/floating-prompt';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { ThinkingDots } from '@/components/thinking-dots';
import { radius, spacing, typography, useTheme, useThemedStyles, type GlowSet, type Palette } from '@/theme';

const SUGGESTIONS = [
  'Summarise my most recent lecture',
  'What formulas came up this week?',
  'Explain the part I keep getting wrong',
];

/**
 * The three members of a navigation object this screen needs to find the tab
 * navigator above it.
 *
 * Structurally typed rather than imported, for the same reason `TabBarProps`
 * in the tabs layout is: the real event map lives deep inside expo-router's
 * vendored navigation types, and naming only what is used avoids coupling to
 * that folder layout.
 */
interface NavigatorNode {
  getState: () => { type?: string };
  getParent: <T = NavigatorNode | undefined>() => T;
  addListener: (event: 'tabPress', callback: () => void) => () => void;
}

function formatTimestamp(seconds?: number | null): string | null {
  if (seconds == null) {
    return null;
  }
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function CitationList({ citations }: { citations: Citation[] }) {
  const styles = useThemedStyles(createStyles);
  if (citations.length === 0) {
    return null;
  }

  return (
    <View style={styles.citations}>
      <Text style={styles.citationsLabel}>From your lectures</Text>
      {citations.map((citation) => {
        const timestamp = formatTimestamp(citation.startTime);
        return (
          <View key={citation.chunkId} style={styles.citation}>
            <Text style={styles.citationIndex}>[{citation.index}]</Text>
            <View style={styles.citationBody}>
              <Text style={styles.citationTitle} numberOfLines={1}>
                {citation.lectureTitle}
                {timestamp ? ` · ${timestamp}` : ''}
              </Text>
              <Text style={styles.citationSnippet} numberOfLines={3}>
                {citation.snippet}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MessageBubble({
  message,
  onShare,
  sharing,
}: {
  message: ChatMessage;
  onShare?: () => void;
  sharing: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      // Rises from below on the right, the direction it was just sent from.
      <Animated.View entering={FadeInDown.duration(240).springify()} style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    // The answer settles in from above instead, so the two sides of the thread
    // arrive from visibly different places.
    <Animated.View entering={FadeInUp.duration(300).springify()} style={styles.assistantRow}>
      <GlassCard style={styles.assistantBubble}>
        <Text style={styles.assistantText}>{message.content}</Text>
        <CitationList citations={message.citations} />

        {onShare ? (
          <Pressable onPress={onShare} disabled={sharing} hitSlop={8} style={styles.shareButton}>
            <Text style={styles.shareText}>{sharing ? 'Sharing…' : 'Share with peers'}</Text>
          </Pressable>
        ) : null}
      </GlassCard>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // Opened from a lecture, the thread is scoped to it; opened from the tab bar
  // it spans everything the student has recorded.
  const params = useLocalSearchParams<{ lectureId?: string; lectureTitle?: string }>();
  const lectureId = typeof params.lectureId === 'string' ? params.lectureId : undefined;
  const lectureTitle = typeof params.lectureTitle === 'string' ? params.lectureTitle : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const historyPress = usePressScale(0.9);

  // Switching lecture scope starts a genuinely different conversation.
  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  }, [lectureId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setConversations(await chatApi.conversations());
    } catch {
      // The drawer's empty state covers this. Surfacing a banner on the chat
      // screen for a failed *sidebar* fetch would blame the wrong thing.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Refreshed on focus rather than only on mount: asking something on the
  // lecture-scoped chat adds a thread this list should already know about.
  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const openConversation = async (conversation: ConversationSummary) => {
    setHistoryOpen(false);
    if (conversation.id === conversationId) {
      return;
    }

    setLoadingThread(true);
    setError(null);
    try {
      const history = await chatApi.messages(conversation.id);
      setMessages(history);
      setConversationId(conversation.id);
      scrollToEnd();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not open that conversation.');
    } finally {
      setLoadingThread(false);
    }
  };

  const startNewChat = () => {
    setHistoryOpen(false);
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  };

  const removeConversation = (conversation: ConversationSummary) => {
    Alert.alert(
      'Delete this conversation?',
      'The questions and answers in it will be gone. Your lectures are not affected.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Removed from the list first: the drawer is open and watching, and
            // waiting on the round trip makes the tap feel ignored.
            setConversations((previous) =>
              previous.filter((item) => item.id !== conversation.id),
            );
            if (conversation.id === conversationId) {
              startNewChat();
            }
            try {
              await chatApi.deleteConversation(conversation.id);
            } catch {
              void loadHistory();
            }
          },
        },
      ],
    );
  };

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  /**
   * Tapping Ask while already on Ask jumps to the newest message.
   *
   * The other four tabs scroll to the *top* on a repeat tap, via
   * `useScrollToTop`. That is wrong here: a conversation reads oldest-first,
   * so its top is the question asked twenty turns ago. The useful destination
   * in a chat is the bottom — where you were before scrolling up to re-read
   * something, and where the answer you are waiting on will appear.
   */
  const navigation = useNavigation();
  useEffect(() => {
    /*
     * Walk up from this screen looking for tab navigators, starting with
     * `navigation` itself.
     *
     * Starting at `getParent()` instead is what broke the first attempt: in
     * this version the screen's own navigation object can already be the tab
     * navigator, so skipping straight to the parent landed on the root stack
     * — which never emits `tabPress`, so nothing ever fired. This mirrors the
     * walk in expo-router's own useScrollToTop, which is what makes the other
     * four tabs work.
     */
    const unsubscribers: (() => void)[] = [];
    let current = navigation as unknown as NavigatorNode | undefined;

    while (current) {
      if (current.getState().type === 'tab') {
        unsubscribers.push(
          current.addListener('tabPress', () => {
            // Only the focused screen should react — otherwise every mounted
            // tab scrolls itself on every tap of any tab.
            if (navigation.isFocused()) {
              scrollToEnd();
            }
          }),
        );
      }
      current = current.getParent<NavigatorNode | undefined>();
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [navigation, scrollToEnd]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) {
      return;
    }

    setError(null);
    setDraft('');

    // Optimistic user turn so the thread feels immediate; the id is replaced
    // when the server responds with the persisted pair.
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: question,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((previous) => [...previous, optimistic]);
    scrollToEnd();

    setThinking(true);
    try {
      const answer = await chatApi.ask({ question, conversationId, lectureId });
      setConversationId(answer.conversationId);

      setMessages((previous) => [
        ...previous,
        {
          id: answer.messageId,
          role: 'assistant',
          content: answer.answer,
          citations: answer.citations,
          createdAt: answer.createdAt,
        },
      ]);
      scrollToEnd();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not get an answer.');
      // Drop the optimistic turn — leaving it implies it was asked and answered.
      setMessages((previous) => previous.filter((message) => message.id !== optimistic.id));
    } finally {
      setThinking(false);
    }
  };

  const shareAnswer = async (message: ChatMessage) => {
    const questionIndex = messages.findIndex((item) => item.id === message.id) - 1;
    const question = questionIndex >= 0 ? messages[questionIndex].content : '';

    setSharingId(message.id);
    try {
      await collabApi.shareThread({
        question,
        answer: message.content,
        lectureId,
        lectureTitle,
        citations: message.citations as unknown as Record<string, unknown>[],
        visibility: 'PEERS',
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not share that answer.');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <Screen>
      {/* Controls on their own row, title beneath.
          Sharing one row with two buttons left the subtitle roughly 200pt wide
          and it truncated mid-word — "Answers grounded in your own recordin…".
          Giving the buttons their own line is the same fix the lecture screen
          needed, and it lets the title keep display type. */}
      <View style={styles.navRow}>
        <Animated.View style={historyPress.animatedStyle}>
          <Pressable
            onPress={() => setHistoryOpen(true)}
            hitSlop={10}
            {...historyPress.handlers}
            style={styles.roundButton}
            accessibilityRole="button"
            accessibilityLabel="Open chat history"
          >
            {/* No badge here. A dot on a button reads as "something new needs
                your attention", and this was only ever the total number of
                saved conversations — a number that never goes down and that
                opening the drawer cannot clear. */}
            <Ionicons name="time-outline" size={19} color={colors.text} />
          </Pressable>
        </Animated.View>

        <View style={styles.flexSpacer} />

        {messages.length > 0 ? (
          <Pressable
            onPress={startNewChat}
            hitSlop={10}
            style={styles.roundButton}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
          >
            <Ionicons name="create-outline" size={19} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.headerText}>
        <Text style={styles.title}>Ask your lectures</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {lectureTitle ? `Scoped to ${lectureTitle}` : 'Answers grounded in your own recordings'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        // Leaving Android's behavior unset relies entirely on the native
        // manifest's default keyboard handling, which is fragile with
        // edge-to-edge layouts — 'height' shrinks this container directly
        // regardless of that setting, so the input reliably stays above the
        // keyboard on both platforms.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              sharing={sharingId === item.id}
              onShare={item.role === 'assistant' ? () => shareAnswer(item) : undefined}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <FloatingPrompt
                icon="sparkles"
                eyebrow={lectureTitle ? `On ${lectureTitle}` : 'Grounded in your own lectures'}
                title="What shall we revise?"
              />

              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => send(suggestion)}
                    style={styles.suggestion}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            thinking ? (
              <Animated.View
                entering={FadeInUp.duration(220)}
                layout={LinearTransition.springify()}
                style={styles.thinking}
              >
                <ThinkingDots />
                <Text style={styles.thinkingText}>Searching your lectures…</Text>
              </Animated.View>
            ) : null
          }
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="What did the lecturer say about…"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(draft)}
          />

          <Pressable
            onPress={() => send(draft)}
            disabled={!draft.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel="Send question"
            style={({ pressed }) => [
              styles.sendButton,
              (!draft.trim() || thinking) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            <Text style={styles.sendGlyph}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Rendered last so it layers over the composer and the list. */}
      <ChatHistory
        open={historyOpen}
        conversations={conversations}
        loading={historyLoading || loadingThread}
        activeId={conversationId}
        onClose={() => setHistoryOpen(false)}
        onSelect={openConversation}
        onNew={startNewChat}
        onDelete={removeConversation}
      />
    </Screen>
  );
}

const createStyles = (c: Palette, g: GlowSet) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  flexSpacer: {
    flex: 1,
  },
  headerText: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  title: {
    ...typography.display,
    color: c.text,
  },
  subtitle: {
    ...typography.caption,
    color: c.textSecondary,
  },
  messages: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  suggestions: {
    gap: spacing.sm,
  },
  suggestion: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  suggestionText: {
    ...typography.caption,
    color: c.textSecondary,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '86%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    backgroundColor: c.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderStrong,
  },
  userText: {
    ...typography.body,
    color: c.text,
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  assistantBubble: {
    maxWidth: '94%',
    borderBottomLeftRadius: radius.sm,
  },
  assistantText: {
    ...typography.body,
    color: c.text,
  },
  citations: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
    gap: spacing.md,
  },
  citationsLabel: {
    ...typography.micro,
    color: c.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  citation: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  citationIndex: {
    ...typography.micro,
    color: c.accent,
    marginTop: 2,
  },
  citationBody: {
    flex: 1,
    gap: 2,
  },
  citationTitle: {
    ...typography.micro,
    color: c.textSecondary,
  },
  citationSnippet: {
    ...typography.micro,
    color: c.textMuted,
    lineHeight: 16,
  },
  shareButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  shareText: {
    ...typography.micro,
    color: c.accent,
    letterSpacing: 0.4,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  thinkingText: {
    ...typography.caption,
    color: c.textMuted,
  },
  error: {
    ...typography.caption,
    color: c.danger,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
    backgroundColor: c.bgElevated,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
    ...typography.body,
    color: c.text,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentVivid,
    ...g.accentSoft,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  sendGlyph: {
    fontSize: 22,
    fontWeight: '700',
    color: c.textOnAccent,
  },
});
