import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ApiError, examPrepApi } from '@/api';
import type { Quiz } from '@/api/types';
import { Card } from '@/components/card';
import { SectionHeader } from '@/components/headers';
import { TopicBar } from '@/components/meters';
import { NeonButton } from '@/components/neon-button';
import { Pill } from '@/components/feedback';
import { quizDateLabel } from '@/components/quiz-title';
import { useAsync } from '@/hooks/use-async';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

interface LectureExamPrepProps {
  lectureId: string;
  lectureTitle: string;
  /** Quizzes can only be written once a transcript exists. */
  ready: boolean;
}

/**
 * Everything exam-prep for one lecture, on the lecture's own screen.
 *
 * A quiz is taken against a lecture, so a lecture is where its score, its weak
 * areas and its quizzes belong. Keeping them here rather than on a shared Exams
 * screen means the student reaches them the same way they reach the notes and
 * the transcript: by opening the lecture.
 */
export function LectureExamPrepTab({ lectureId, lectureTitle, ready }: LectureExamPrepProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();

  const prep = useAsync(() => examPrepApi.lectureReadiness(lectureId), [lectureId]);
  const quizzes = useAsync(() => examPrepApi.listQuizzes(lectureId), [lectureId]);

  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [focusWeak, setFocusWeak] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const quiz = await examPrepApi.generateQuiz({
        lectureId,
        difficulty,
        questionCount: 8,
        focusOnWeakAreas: focusWeak,
      });
      void quizzes.reload();
      router.push(`/quiz?quizId=${quiz.id}`);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not generate a quiz right now.',
      );
    } finally {
      setGenerating(false);
    }
  }, [difficulty, focusWeak, lectureId, quizzes, router]);

  if (!ready) {
    return (
      <Card>
        <Text style={styles.muted}>
          Quizzes are written from the transcript, so this lecture has to finish processing first.
        </Text>
      </Card>
    );
  }

  const data = prep.data;
  const lectureQuizzes: Quiz[] = quizzes.data ?? [];

  return (
    <View style={styles.wrap}>
      {/* Plain white, not tinted. In the reference the readiness card carries
          its meaning in the size of the number, and a cyan wash behind a cyan
          figure flattens exactly the contrast that makes it readable. */}
      <Card>
        {prep.isLoading && !data ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Readiness</Text>
              {/* Never quizzed means no score — not zero. 0% would read as
                  failure rather than "you have not started". */}
              {data?.assessed ? (
                <Text style={styles.score}>{data.readinessPercent}%</Text>
              ) : (
                <Text style={styles.notAssessed}>Not assessed</Text>
              )}
            </View>

            {data?.assessed ? (
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.max(3, data.readinessPercent)}%` }]}
                />
              </View>
            ) : null}

            <Text style={styles.verdict}>
              {data?.assessed
                ? data.verdict
                : 'Take a quiz on this lecture and Cleveft will score it and show what you missed.'}
            </Text>
          </>
        )}
      </Card>

      <SectionHeader title="Quiz yourself" />
      <Card>
        <Text style={styles.fieldLabel}>Difficulty</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setDifficulty(option)}
              style={[styles.chip, difficulty === option && styles.chipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: difficulty === option }}
            >
              <Text style={[styles.chipText, difficulty === option && styles.chipTextActive]}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setFocusWeak((previous) => !previous)}
          style={styles.toggleRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: focusWeak }}
        >
          <View style={[styles.checkbox, focusWeak && styles.checkboxOn]}>
            {focusWeak ? (
              <Ionicons name="checkmark" size={13} color={colors.textOnAccent} />
            ) : null}
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Target my weak areas</Text>
            <Text style={styles.toggleCopy}>
              Weights questions toward the topics you score lowest on.
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <NeonButton
          label="Generate quiz"
          onPress={generate}
          loading={generating}
          style={styles.generate}
        />
      </Card>

      {(data?.weakAreas.length ?? 0) > 0 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <SectionHeader title="Weak areas" />
          <Card>
            <View style={styles.topicList}>
              {data?.weakAreas.map((topic) => (
                <TopicBar
                  key={topic.topic}
                  topic={topic.topic}
                  percent={topic.masteryPercent}
                  detail={`${topic.attempts} quiz answers`}
                />
              ))}
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {(data?.strongAreas.length ?? 0) > 0 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <SectionHeader title="Mastered" />
          <Card>
            <View style={styles.topicList}>
              {data?.strongAreas.map((topic) => (
                <TopicBar
                  key={topic.topic}
                  topic={topic.topic}
                  percent={topic.masteryPercent}
                  detail={`${topic.attempts} quiz answers`}
                />
              ))}
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {(data?.blindSpots.length ?? 0) > 0 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <SectionHeader title="Never tested" />
          <Card>
            <Text style={styles.muted}>
              This lecture covers these, but no quiz has touched them yet.
            </Text>
            <View style={styles.tagRow}>
              {data?.blindSpots.map((topic) => (
                <Pill key={topic} label={topic} tone="warning" />
              ))}
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {lectureQuizzes.length > 0 ? (
        <>
          <SectionHeader title="Past quizzes" />
          <View style={styles.quizList}>
            {lectureQuizzes.map((quiz) => (
              <Card key={quiz.id} onPress={() => router.push(`/quiz?quizId=${quiz.id}`)}>
                <Text style={styles.quizTitle} numberOfLines={2}>
                  {lectureTitle} — practice quiz
                </Text>
                <View style={styles.quizMeta}>
                  <Pill label={`${quiz.questionCount} questions`} />
                  <Pill label={quiz.difficulty} tone="accent" />
                  {quizDateLabel(quiz.createdAt) ? (
                    <Pill label={quizDateLabel(quiz.createdAt)} />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    scoreLabel: {
      ...typography.caption,
      color: c.textMuted,
    },
    // Larger than display type. This figure is the answer to the only question
    // the student opened this tab to ask, so it gets to be the biggest thing
    // in the card by a clear margin rather than by a couple of points.
    score: {
      fontSize: 38,
      lineHeight: 44,
      fontWeight: '700',
      letterSpacing: -1,
      color: c.accent,
      fontVariant: ['tabular-nums'],
    },
    notAssessed: {
      ...typography.caption,
      color: c.textMuted,
    },
    track: {
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: c.accentVivid,
    },
    verdict: {
      ...typography.micro,
      fontWeight: '500',
      lineHeight: 17,
      color: c.textMuted,
      marginTop: spacing.md,
    },
    fieldLabel: {
      ...typography.micro,
      fontWeight: '500',
      color: c.textMuted,
      marginBottom: spacing.md,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    // Filled, not outlined, and equal-width. Three pills of different widths
    // read as three unrelated buttons; three equal ones read as one control
    // with three positions, which is what this is.
    chip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
    },
    chipActive: {
      backgroundColor: c.accentVivid,
    },
    chipText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.textOnAccent,
      fontWeight: '600',
    },
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSunken,
    },
    checkboxOn: {
      backgroundColor: c.accentVivid,
    },
    toggleText: {
      flex: 1,
      gap: 2,
    },
    toggleTitle: {
      ...typography.bodyStrong,
      color: c.text,
    },
    toggleCopy: {
      ...typography.micro,
      color: c.textMuted,
    },
    error: {
      ...typography.caption,
      color: c.danger,
      marginTop: spacing.md,
    },
    generate: {
      marginTop: spacing.xl,
    },
    topicList: {
      gap: spacing.lg,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    muted: {
      ...typography.caption,
      color: c.textMuted,
    },
    quizList: {
      gap: spacing.md,
    },
    quizTitle: {
      ...typography.subheading,
      color: c.text,
    },
    quizMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
