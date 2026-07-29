import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError, collabApi } from '@/api';
import type { LearningPath, Peer, PeerSearchResult, SharedThread } from '@/api/types';
import {
  Animated,
  fadeEntrance,
  smoothLayout,
  staggeredEntrance,
} from '@/components/animated/entrance';
import { EmptyState, ErrorState, LoadingState, Pill } from '@/components/feedback';
import { GlassCard } from '@/components/glass-card';
import { SectionHeader } from '@/components/headers';
import { formatRelativeDate } from '@/components/lecture-card';
import { NeonButton } from '@/components/neon-button';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useAsync } from '@/hooks/use-async';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

type Tab = 'feed' | 'paths' | 'peers';

const TABS: { key: Tab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'paths', label: 'Paths' },
  { key: 'peers', label: 'Peers' },
];

function PeerRow({
  peer,
  onAccept,
  onDecline,
  busy,
}: {
  peer: Peer;
  onAccept?: () => void;
  onDecline?: () => void;
  busy: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <GlassCard>
      <View style={styles.peerRow}>
        <View style={styles.peerAvatar}>
          <Text style={styles.peerInitial}>{peer.fullName.trim()[0]?.toUpperCase() ?? '?'}</Text>
        </View>

        <View style={styles.peerInfo}>
          <Text style={styles.peerName} numberOfLines={1}>
            {peer.fullName}
          </Text>
          <Text style={styles.peerMeta} numberOfLines={1}>
            {[peer.programme, peer.university].filter(Boolean).join(' · ') || peer.email}
          </Text>
        </View>
      </View>

      {onAccept && onDecline ? (
        <View style={styles.peerActions}>
          <NeonButton label="Accept" onPress={onAccept} loading={busy} style={styles.peerAction} />
          <NeonButton
            label="Decline"
            onPress={onDecline}
            variant="ghost"
            style={styles.peerAction}
          />
        </View>
      ) : null}
    </GlassCard>
  );
}

function PathCard({ path, onPress }: { path: LearningPath; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <GlassCard onPress={onPress} active={path.adoptedByMe}>
      <Text style={styles.pathTitle} numberOfLines={2}>
        {path.title}
      </Text>

      {path.description ? (
        <Text style={styles.pathDescription} numberOfLines={2}>
          {path.description}
        </Text>
      ) : null}

      <View style={styles.pathMeta}>
        <Pill label={`${path.stepCount} steps`} />
        {path.courseCode ? <Pill label={path.courseCode} /> : null}
        {path.adoptCount > 0 ? <Pill label={`${path.adoptCount} adopted`} tone="accent" /> : null}
        {path.adoptedByMe ? <Pill label="Adopted" tone="accent" /> : null}
      </View>

      <Text style={styles.pathOwner}>
        {path.ownedByMe ? 'Your path' : `Shared by ${path.ownerName ?? 'a peer'}`} ·{' '}
        {formatRelativeDate(path.updatedAt)}
      </Text>
    </GlassCard>
  );
}

function ThreadCard({ thread }: { thread: SharedThread }) {
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard onPress={() => setExpanded((previous) => !previous)}>
      <Text style={styles.threadQuestion} numberOfLines={expanded ? undefined : 2}>
        {thread.question}
      </Text>

      <Text style={styles.threadAnswer} numberOfLines={expanded ? undefined : 3}>
        {thread.answer}
      </Text>

      <View style={styles.threadFooter}>
        <Text style={styles.threadOwner} numberOfLines={1}>
          {thread.ownedByMe ? 'You' : (thread.ownerName ?? 'A peer')}
          {thread.lectureTitle ? ` · ${thread.lectureTitle}` : ''}
        </Text>
        <Text style={styles.threadDate}>{formatRelativeDate(thread.createdAt)}</Text>
      </View>

      {!expanded ? <Text style={styles.expandHint}>Tap to read in full</Text> : null}
    </GlassCard>
  );
}

export default function CollabScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('feed');

  // Tapping the tab you are already on returns you to the top of it.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();

  const feed = useAsync(() => collabApi.feed(), []);
  const myPaths = useAsync(() => collabApi.myPaths(), []);
  const discoverable = useAsync(() => collabApi.discoverPaths(), []);
  const peers = useAsync(() => collabApi.peers(), []);
  const incoming = useAsync(() => collabApi.incomingRequests(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PeerSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void feed.reload();
      void incoming.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const reloadAll = useCallback(() => {
    void feed.reload();
    void myPaths.reload();
    void discoverable.reload();
    void peers.reload();
    void incoming.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async () => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setActionError('Type at least 2 characters to search.');
      return;
    }

    setSearching(true);
    setActionError(null);
    try {
      setSearchResults(await collabApi.searchPeers(term));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const connect = async (userId: string) => {
    setBusyId(userId);
    setActionError(null);
    try {
      await collabApi.requestPeer(userId);
      // Reflect the new state in the result list without a second round trip.
      setSearchResults((previous) =>
        previous?.map((result) =>
          result.userId === userId ? { ...result, relationship: 'PENDING' } : result,
        ) ?? null,
      );
      void peers.reload();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not send that request.');
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (linkId: string, accept: boolean) => {
    setBusyId(linkId);
    setActionError(null);
    try {
      if (accept) {
        await collabApi.acceptRequest(linkId);
      } else {
        await collabApi.declineRequest(linkId);
      }
      void incoming.reload();
      void peers.reload();
      void feed.reload();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not answer that request.');
    } finally {
      setBusyId(null);
    }
  };

  const refreshing = feed.isRefreshing || peers.isRefreshing || myPaths.isRefreshing;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Peers</Text>
        <Text style={styles.subtitle}>Learn from how your course-mates figured it out</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tab, tab === item.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
              {item.label}
              {item.key === 'peers' && (incoming.data?.length ?? 0) > 0
                ? ` (${incoming.data?.length})`
                : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reloadAll}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {tab === 'feed' ? (
          <Animated.View key="feed" entering={fadeEntrance()}>
            {feed.isLoading && !feed.data ? (
              <LoadingState label="Loading your feed…" />
            ) : feed.error && !feed.data ? (
              <ErrorState message={feed.error} onRetry={feed.reload} />
            ) : (feed.data ?? []).length === 0 ? (
              <EmptyState
                glyph="◉"
                title="Your feed is quiet"
                message="Connect with course-mates, then anything they share appears here — question, answer and the lecture it came from."
                actionLabel="Find peers"
                onAction={() => setTab('peers')}
              />
            ) : (
              <View style={styles.list}>
                {(feed.data ?? []).map((thread, index) => (
                  <Animated.View
                    key={thread.id}
                    entering={staggeredEntrance(index, 60)}
                    layout={smoothLayout}
                  >
                    <ThreadCard thread={thread} />
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        {tab === 'paths' ? (
          <Animated.View key="paths" entering={fadeEntrance()}>
            <SectionHeader title="Shared with you" />
            {(discoverable.data ?? []).length === 0 ? (
              <EmptyState
                glyph="◈"
                title="No shared paths yet"
                message="When a peer shares the sequence of questions that got them to mastery, it shows up here."
              />
            ) : (
              <View style={styles.list}>
                {(discoverable.data ?? []).map((path, index) => (
                  <Animated.View
                    key={path.id}
                    entering={staggeredEntrance(index, 60)}
                    layout={smoothLayout}
                  >
                    <PathCard
                      path={path}
                      onPress={() => router.push(`/chat?lectureId=${path.steps[0]?.lectureId ?? ''}`)}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            <SectionHeader title="Your paths" />
            {(myPaths.data ?? []).length === 0 ? (
              <EmptyState
                glyph="◆"
                title="You haven't shared a path"
                message="A learning path is the run of questions that took you from lost to confident. Share one and a peer can walk it against their own lectures."
              />
            ) : (
              <View style={styles.list}>
                {(myPaths.data ?? []).map((path, index) => (
                  <Animated.View
                    key={path.id}
                    entering={staggeredEntrance(index, 60)}
                    layout={smoothLayout}
                  >
                    <PathCard
                      path={path}
                      onPress={() => router.push(`/chat?lectureId=${path.steps[0]?.lectureId ?? ''}`)}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        {tab === 'peers' ? (
          <Animated.View key="peers" entering={fadeEntrance()}>
            <GlassCard>
              <Text style={styles.fieldLabel}>FIND A COURSE-MATE</Text>
              <View style={styles.searchRow}>
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Name or email"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  onSubmitEditing={runSearch}
                  returnKeyType="search"
                />
                <NeonButton
                  label="Search"
                  onPress={runSearch}
                  loading={searching}
                  fullWidth={false}
                  style={styles.searchButton}
                />
              </View>
            </GlassCard>

            {searchResults !== null ? (
              <>
                <SectionHeader title={`Results (${searchResults.length})`} />
                {searchResults.length === 0 ? (
                  <EmptyState
                    glyph="◎"
                    title="Nobody matched"
                    message="Check the spelling, or ask them for the email they signed up with."
                  />
                ) : (
                  <View style={styles.list}>
                    {searchResults.map((result) => (
                      <GlassCard key={result.userId}>
                        <View style={styles.peerRow}>
                          <View style={styles.peerAvatar}>
                            <Text style={styles.peerInitial}>
                              {result.fullName.trim()[0]?.toUpperCase() ?? '?'}
                            </Text>
                          </View>
                          <View style={styles.peerInfo}>
                            <Text style={styles.peerName} numberOfLines={1}>
                              {result.fullName}
                            </Text>
                            <Text style={styles.peerMeta} numberOfLines={1}>
                              {[result.programme, result.university].filter(Boolean).join(' · ') ||
                                result.email}
                            </Text>
                          </View>
                        </View>

                        {result.relationship === 'ACCEPTED' ? (
                          <Pill label="Connected" tone="accent" />
                        ) : result.relationship === 'PENDING' ? (
                          <Pill label="Request pending" />
                        ) : (
                          <NeonButton
                            label="Connect"
                            onPress={() => connect(result.userId)}
                            loading={busyId === result.userId}
                            variant="secondary"
                            style={styles.connectButton}
                          />
                        )}
                      </GlassCard>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {(incoming.data ?? []).length > 0 ? (
              <Animated.View layout={smoothLayout}>
                <SectionHeader title="Requests" />
                <View style={styles.list}>
                  {(incoming.data ?? []).map((peer, index) => (
                    <Animated.View
                      key={peer.linkId}
                      entering={staggeredEntrance(index, 40)}
                      layout={smoothLayout}
                    >
                      <PeerRow
                        peer={peer}
                        busy={busyId === peer.linkId}
                        onAccept={() => respond(peer.linkId, true)}
                        onDecline={() => respond(peer.linkId, false)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <SectionHeader title={`Your network (${peers.data?.length ?? 0})`} />
            {(peers.data ?? []).length === 0 ? (
              <EmptyState
                glyph="◉"
                title="No connections yet"
                message="Search for a course-mate above to start building your study network."
              />
            ) : (
              <View style={styles.list}>
                {(peers.data ?? []).map((peer, index) => (
                  <Animated.View
                    key={peer.linkId}
                    entering={staggeredEntrance(index, 40)}
                    layout={smoothLayout}
                  >
                    <PeerRow peer={peer} busy={false} />
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: c.text,
  },
  subtitle: {
    ...typography.caption,
    color: c.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  tabActive: {
    backgroundColor: c.accentSoft,
    borderColor: c.borderStrong,
  },
  tabLabel: {
    ...typography.caption,
    color: c.textMuted,
  },
  tabLabelActive: {
    color: c.accent,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  list: {
    gap: spacing.md,
  },
  error: {
    ...typography.caption,
    color: c.danger,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.micro,
    color: c.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
    ...typography.body,
    color: c.text,
  },
  searchButton: {
    paddingHorizontal: spacing.lg,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  peerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
  },
  peerInitial: {
    ...typography.heading,
    color: c.accent,
  },
  peerInfo: {
    flex: 1,
    gap: 2,
  },
  peerName: {
    ...typography.bodyStrong,
    color: c.text,
  },
  peerMeta: {
    ...typography.micro,
    color: c.textMuted,
  },
  peerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  peerAction: {
    flex: 1,
  },
  connectButton: {
    marginTop: spacing.lg,
  },
  pathTitle: {
    ...typography.subheading,
    color: c.text,
  },
  pathDescription: {
    ...typography.caption,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  pathMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pathOwner: {
    ...typography.micro,
    color: c.textMuted,
    marginTop: spacing.md,
  },
  threadQuestion: {
    ...typography.bodyStrong,
    color: c.accent,
  },
  threadAnswer: {
    ...typography.body,
    color: c.text,
    marginTop: spacing.md,
  },
  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  threadOwner: {
    ...typography.micro,
    color: c.textSecondary,
    flex: 1,
  },
  threadDate: {
    ...typography.micro,
    color: c.textMuted,
  },
  expandHint: {
    ...typography.micro,
    color: c.textMuted,
    marginTop: spacing.sm,
  },
});
