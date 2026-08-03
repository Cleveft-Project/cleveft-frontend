import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { lecturesApi } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ScreenHeader } from '@/components/headers';
import { LectureCard } from '@/components/lecture-card';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useAsync } from '@/hooks/use-async';
import { groupLecturesByCourse } from '@/lib/courses';
import { useCollapsingHeader } from '@/state/chrome-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Everything the student has, in one place.
 *
 * <p>"See all" on the home screen used to open the Record tab, because that is
 * where the library happened to live — under the recorder. So asking to see
 * your lectures put a microphone in front of you and buried the list below it.
 * They are different intentions: one is "capture something new", the other is
 * "find something I already have".
 *
 * <p>Grouped by course rather than listed by date, for the same reason the
 * Record tab groups: a student takes eight courses a semester and revises one
 * at a time, and date order is the one ordering nobody studies in.
 */
export default function LibraryScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();

  const edges = useScrollEdges();
  const headerStyle = useCollapsingHeader();

  const lectures = useAsync(() => lecturesApi.list(), []);
  const [query, setQuery] = useState('');

  const all = useMemo(() => lectures.data ?? [], [lectures.data]);

  /*
   * Matches title and course code together.
   *
   * A student looking for "the BJT one" and a student looking for "everything
   * in EE 355" are both searching, and making them use different controls for
   * that would be a distinction the app cares about rather than they do.
   */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return all;
    }
    return all.filter((lecture) =>
      `${lecture.title} ${lecture.courseCode ?? ''}`.toLowerCase().includes(needle),
    );
  }, [all, query]);

  const groups = useMemo(() => groupLecturesByCourse(filtered), [filtered]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Your library"
        subtitle={all.length === 1 ? '1 lecture' : `${all.length} lectures`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
      />

      <Animated.View style={headerStyle}>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search lectures and courses"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={styles.search}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </Animated.View>

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {lectures.isLoading && all.length === 0 ? (
          <LoadingState label="Loading your library…" />
        ) : lectures.error && all.length === 0 ? (
          <ErrorState message={lectures.error} onRetry={lectures.reload} />
        ) : all.length === 0 ? (
          <EmptyState
            glyph="◉"
            title="Nothing here yet"
            message="Record a lecture, import a PDF or add a video, and it will appear here."
          />
        ) : filtered.length === 0 ? (
          // Distinct from an empty library: the fix is to change the search, not
          // to go and record something.
          <EmptyState
            glyph="◎"
            title="No matches"
            message={`Nothing in your library matches "${query.trim()}".`}
          />
        ) : (
          <View style={styles.courseGroups}>
            {groups.map((group, groupIndex) => (
              <View key={group.code ?? '__ungrouped__'} style={styles.courseGroup}>
                <View style={styles.courseGroupHead}>
                  <Text style={[styles.courseGroupTitle, !group.code && styles.courseGroupMuted]}>
                    {group.label}
                  </Text>
                  <Text style={styles.courseGroupCount}>
                    {group.lectures.length}
                    {group.lectures.length === 1 ? ' lecture' : ' lectures'}
                  </Text>
                </View>

                <View style={styles.lectureList}>
                  {group.lectures.map((lecture, index) => (
                    <Animated.View
                      key={lecture.id}
                      entering={staggeredEntrance(groupIndex + index, 80)}
                    >
                      <LectureCard
                        lecture={lecture}
                        index={index}
                        onPress={() => router.push(`/transcript?lectureId=${lecture.id}`)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  search: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
    ...typography.body,
    color: c.text,
  },
  courseGroups: {
    gap: spacing.xl,
  },
  courseGroup: {
    gap: spacing.md,
  },
  courseGroupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  courseGroupTitle: {
    ...typography.subheading,
    color: c.text,
    flex: 1,
  },
  courseGroupMuted: {
    color: c.textSecondary,
  },
  courseGroupCount: {
    ...typography.micro,
    color: c.textMuted,
  },
  lectureList: {
    gap: spacing.md,
  },
});
