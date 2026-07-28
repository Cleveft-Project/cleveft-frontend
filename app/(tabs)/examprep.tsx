import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, examPrepApi } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { CourseReadinessCard } from '@/components/course-readiness-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SectionHeader } from '@/components/headers';
import { Screen } from '@/components/screen';
import { useAsync } from '@/hooks/use-async';
import { spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Exam prep is navigation, not a workspace.
 *
 * Courses are the outer box, lectures the inner one. Everything a student can
 * *do* — generate a quiz, see readiness, weak areas, mastered and never-tested
 * topics — belongs to a lecture and lives on that lecture's own screen. This
 * screen exists to find the lecture.
 *
 * The account-wide quiz generator and the pooled weak-areas / mastered lists
 * that used to live here were the flat structure this hierarchy replaces: they
 * mixed topics across unrelated courses, which describes no exam anyone sits.
 */
export default function ExamPrepScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Tapping the tab you are already on returns you to the top of it.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const readiness = useAsync(() => examPrepApi.readiness(), []);
  const [quizzingCourse, setQuizzingCourse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void readiness.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  /**
   * A quiz spanning a whole course, drawing questions from its lectures.
   *
   * The one action that legitimately belongs at course level: a course exam
   * covers several lectures, so no single lecture screen owns it.
   */
  const quizCourse = async (courseCode: string) => {
    setQuizzingCourse(courseCode);
    setError(null);
    try {
      const quiz = await examPrepApi.generateQuiz({ courseCode, questionCount: 8 });
      router.push(`/quiz?quizId=${quiz.id}`);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not generate a quiz right now.',
      );
    } finally {
      setQuizzingCourse(null);
    }
  };

  if (readiness.isLoading && !readiness.data) {
    return (
      <Screen>
        <LoadingState label="Working out where you stand…" />
      </Screen>
    );
  }

  if (readiness.error && !readiness.data) {
    return (
      <Screen>
        <ErrorState message={readiness.error} onRetry={readiness.reload} />
      </Screen>
    );
  }

  const courses = readiness.data?.courses ?? [];
  const hasNamedCourse = courses.some((course) => !!course.courseCode);

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={readiness.isRefreshing}
            onRefresh={readiness.reload}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Exam prep</Text>
          <Text style={styles.subtitle}>Open a lecture to be quizzed on it</Text>
        </View>

        {courses.length === 0 ? (
          <EmptyState
            glyph="◆"
            title="Nothing to revise yet"
            message="Record a lecture and it will appear here, grouped under its course."
          />
        ) : (
          <>
            {/* Plain text, deliberately not a card.
                Every card on this screen is a control, so a card-shaped block
                that does nothing when tapped reads as broken. Guidance that
                points elsewhere should not look like the thing it points to. */}
            {hasNamedCourse ? null : (
              <Animated.View entering={staggeredEntrance(0, 60)} style={styles.promptRow}>
                <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
                <Text style={styles.promptCopy}>
                  To group lectures, open one below and tap &quot;Set a course&quot; under its
                  title. Lectures sharing a course are scored together.
                </Text>
              </Animated.View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <SectionHeader title="Your courses" />
            <View style={styles.courseList}>
              {courses.map((course, index) => (
                <CourseReadinessCard
                  key={course.courseCode ?? '__ungrouped__'}
                  course={course}
                  index={index}
                  onQuizCourse={quizCourse}
                  quizzing={quizzingCourse === course.courseCode}
                  onOpenLecture={(lectureId) =>
                    router.push(`/transcript?lectureId=${lectureId}`)
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    header: {
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.xs,
    },
    title: {
      ...typography.display,
      color: c.text,
    },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    promptCopy: {
      ...typography.micro,
      color: c.textMuted,
      lineHeight: 17,
      flex: 1,
    },
    error: {
      ...typography.caption,
      color: c.danger,
      marginBottom: spacing.md,
    },
    courseList: {
      gap: spacing.md,
    },
  });
