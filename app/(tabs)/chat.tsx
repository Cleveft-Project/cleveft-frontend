import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useIsFocused,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import Animated, {
  FadeInDown,
  FadeInUp,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

import { ApiError, chatApi, collabApi } from '@/api';
import type { ChatMessage, Citation, ConversationSummary } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { usePressScale } from '@/components/animated/press-scale';
import { ChatHistory } from '@/components/chat-history';
import { FloatingPrompt } from '@/components/floating-prompt';
import { Kofi } from '@/components/kofi';
import { Markdown } from '@/components/markdown';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { useCollapsingHeader } from '@/state/chrome-context';
import { useKofiLine, useKofiSpeech } from '@/components/kofi-says';
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

/**
 * One action under a message: copy, edit, share.
 *
 * <p>Text rather than icons. Three unlabelled glyphs under a bubble is a puzzle,
 * and these are used rarely enough that being unmistakable beats being small.
 */
function BubbleAction({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      hitSlop={8}
      style={styles.bubbleAction}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.bubbleActionText}>{label}</Text>
    </Pressable>
  );
}

/**
 * The send control.
 *
 * <p>Was a flat circle with a text arrow in it, which sat at the same visual
 * weight whether or not there was anything to send. Three things fix that: the
 * arrow is drawn rather than typed, so it is centred instead of sitting on a
 * font's baseline; the button grows and gains its fill only once the question is
 * worth sending; and it dips under the finger. The composer's most-used control
 * should be the most alive thing on the screen.
 */
function SendButton({
  onPress,
  ready,
  busy,
}: {
  onPress: () => void;
  /** There is something to send. */
  ready: boolean;
  /** An answer is already in flight. */
  busy: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const progress = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(ready && !busy ? 1 : 0, { damping: 14, stiffness: 190 });
  }, [busy, progress, ready]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (0.9 + progress.value * 0.1) * (1 - press.value * 0.12) }],
    opacity: 0.55 + progress.value * 0.45,
  }));

  // Fades between the muted and the live fill rather than swapping colours, so
  // the button never flickers as a word is typed and deleted.
  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.surfaceSunken, colors.accentVivid],
    ),
  }));

  const disabled = !ready || busy;

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={() => {
          haptics.commit();
          onPress();
        }}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 18, stiffness: 260 });
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={busy ? 'Waiting for an answer' : 'Send question'}
        accessibilityState={{ disabled }}
      >
        <Animated.View style={[styles.sendButton, fillStyle]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={ready ? colors.onFillPrimary : colors.textMuted}
            />
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function MessageBubble({
  message,
  onShare,
  onEdit,
  sharing,
}: {
  message: ChatMessage;
  onShare?: () => void;
  /** Only on questions, and only where resending is possible. */
  onEdit?: () => void;
  sharing: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  /*
   * Confirms in place rather than with a toast.
   *
   * A copy that gives no feedback gets pressed twice, and a toast covers the
   * thing that was just copied. The label swapping to "Copied" for a moment is
   * the whole confirmation, and it sits exactly where the eye already is.
   */
  const copy = () => {
    Clipboard.setStringAsync(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (isUser) {
    return (
      // Rises from below on the right, the direction it was just sent from.
      <Animated.View entering={FadeInDown.duration(240).springify()} style={styles.userRow}>
        <View style={styles.userColumn}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{message.content}</Text>
          </View>

          <View style={styles.userActions}>
            <BubbleAction
              label={copied ? 'Copied' : 'Copy'}
              icon={copied ? 'checkmark' : 'copy-outline'}
              onPress={copy}
            />
            {onEdit ? (
              <BubbleAction label="Edit" icon="create-outline" onPress={onEdit} />
            ) : null}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    // The answer settles in from above instead, so the two sides of the thread
    // arrive from visibly different places.
    <Animated.View entering={FadeInUp.duration(300).springify()} style={styles.assistantRow}>
      <GlassCard style={styles.assistantBubble}>
        {/* Was a single <Text>, which drew "### 2. Layer 2 Bridging" and
            "**IEEE 802.11**" literally down the screen. The model had been
            formatting its answers properly all along. */}
        <Markdown source={message.content} />
        <CitationList citations={message.citations} />

        <View style={styles.assistantActions}>
          <BubbleAction
            label={copied ? 'Copied' : 'Copy'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            onPress={copy}
          />
          {onShare ? (
            <BubbleAction
              label={sharing ? 'Sharing…' : 'Share'}
              icon="share-social-outline"
              onPress={onShare}
              disabled={sharing}
            />
          ) : null}
        </View>
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

  // Content dissolves into the edges, and the heading shrinks as you read.
  const edges = useScrollEdges();
  const headerStyle = useCollapsingHeader();
  const [error, setError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // Fixed for the life of the screen, so the wait message does not reshuffle
  // itself on every re-render while an answer is being fetched.
  const thinkingLine = useKofiLine('chatThinking');
  const emptyLine = useKofiLine('chatEmpty');

  // Each only while it is genuinely the current moment: the invitation on an
  // empty thread, and the "let me go back for it" while an answer is being
  // fetched. Speaking both at once would talk over itself.
  //
  // Gated on focus rather than spoken once per run. The tab stays mounted, so
  // without this the invitation would fire on the first visit and never again.
  // It is not a greeting — it is a prompt for what to ask — so hearing it each
  // time the student comes here to ask something is the point. Leaving the tab
  // flips `isFocused` false, which also stops him mid-sentence.
  const isFocused = useIsFocused();
  useKofiSpeech(emptyLine, isFocused && messages.length === 0 && !thinking);
  useKofiSpeech(thinkingLine, isFocused && thinking);

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

  /**
   * Puts a question back in the composer to be reworded and asked again.
   *
   * <p>Everything from that question onward is dropped, including the answer it
   * produced. Leaving them would show an answer to a question that is no longer
   * on screen, and the student would have no way to tell which of the two
   * versions it belonged to.
   *
   * <p>Locally only. The thread on the server keeps the original exchange, and
   * the reworded question is asked as a new turn — rewriting history server-side
   * would mean the citations already shown could silently change.
   */
  const editQuestion = (message: ChatMessage) => {
    const index = messages.findIndex((entry) => entry.id === message.id);
    if (index < 0 || thinking) {
      return;
    }

    setMessages((previous) => previous.slice(0, index));
    setDraft(message.content);
    setError(null);
  };

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

      {/* Shrinks and lifts as the thread scrolls, like every other screen. The
          list drives it below; this only reacts. */}
      <Animated.View style={[styles.headerText, headerStyle]}>
        <Text style={styles.title}>What would you like to clear up?</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {lectureTitle ? `Scoped to ${lectureTitle}` : 'Answers from your own lectures'}
        </Text>
      </Animated.View>

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
          // Chat was the one screen left out of this, because it is the one
          // screen that is a FlatList rather than a ScrollView.
          onScroll={edges.onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              sharing={sharingId === item.id}
              onShare={item.role === 'assistant' ? () => shareAnswer(item) : undefined}
              // Not while an answer is in flight: the reply would arrive after
              // the question it belongs to had already been removed.
              onEdit={
                item.role === 'user' && !thinking ? () => editQuestion(item) : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {/* Kofi *is* the floating subject here, not an addition above it.
                  Stacking him over the old sparkles badge gave the screen two
                  competing focal points and left the generic AI glyph doing the
                  job the mascot exists for. He flies rather than hovers — wings
                  beating, legs tucked, over a much longer arc than an icon
                  wants — because an empty screen is the one place a mascot
                  genuinely earns its keep. */}
              <FloatingPrompt
                subject={<Kofi mood="idle" size={116} flying grounded={false} />}
                travel={26}
                stageHeight={150}
                eyebrow={lectureTitle ? `On ${lectureTitle}` : emptyLine}
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
                {/* He rocks, squints and looks away while the answer is being
                    retrieved — so the wait has a face on it rather than three
                    dots. This is the longest pause in the app, and the one
                    place his line does real work: "let me go back for it" is
                    the product's whole promise, said by the thing doing it. */}
                <Kofi mood="thinking" size={44} />
                <ThinkingDots />
                <Text style={styles.thinkingText}>{thinkingLine}</Text>
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

          <SendButton
            onPress={() => send(draft)}
            ready={!!draft.trim()}
            busy={thinking}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Above the composer, below the list. */}
      <ScrollEdges {...edges} />

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
  // No backgroundColor here: the fill is animated between the muted and live
  // states, and a static one underneath would win on the first frame.
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...g.accentSoft,
  },

  /* Message actions */

  userColumn: {
    alignItems: 'flex-end',
    maxWidth: '86%',
    gap: 2,
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.xs,
  },
  assistantActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
  },
  bubbleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  bubbleActionText: {
    ...typography.micro,
    color: c.textMuted,
  },
});
