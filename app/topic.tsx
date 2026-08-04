import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { examPrepApi } from '@/api';
import type { TopicAnswer } from '@/api/types';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { GlassCard } from '@/components/glass-card';
import { ScreenHeader } from '@/components/headers';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { useAsync } from '@/hooks/use-async';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Every question you were asked on one topic, with your own answer beside the
 * right one.
 *
 * <p>A mastery percentage is a verdict: it tells a student they are at 80% and
 * leaves them there. This is the way back into the material — the questions
 * themselves, which one they picked, and why the right answer is right. It is
 * the difference between being told you are weak on normalisation and being
 * shown the normalisation question you got wrong.
 */
/** "large language model generation" -> "Large Language Model Generation". */
function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export default function TopicScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ topic?: string; courseCode?: string }>();
  const topic = typeof params.topic === 'string' ? params.topic : '';
  const courseCode = typeof params.courseCode === 'string' ? params.courseCode : undefined;

  const edges = useScrollEdges();

  const answers = useAsync(
    () => examPrepApi.topicAnswers(topic, courseCode),
    [topic, courseCode],
    { enabled: !!topic },
  );

  const all = useMemo(() => answers.data ?? [], [answers.data]);
  const right = all.filter((item) => item.correct).length;

  return (
    <Screen edges={['top', 'bottom']} blob="violet">
      <ScreenHeader
        // Topic tags are stored lowercase for matching. The readiness card
        // capitalises them for display and so must this, or the same topic
        // appears to have two different names.
        title={titleCase(topic) || 'Topic'}
        subtitle={
          all.length === 0
            ? undefined
            : `${right} of ${all.length} correct${courseCode ? ` · ${courseCode}` : ''}`
        }
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/examprep'))}
      />

      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {answers.isLoading && all.length === 0 ? (
          <LoadingState label="Finding your answers…" />
        ) : answers.error ? (
          <ErrorState message={answers.error} onRetry={answers.reload} />
        ) : all.length === 0 ? (
          <EmptyState
            glyph="◎"
            title="Nothing yet"
            message={`No quiz questions on ${topic} so far. Take a quiz on this course and they will appear here.`}
          />
        ) : (
          all.map((answer, index) => (
            <Animated.View key={`${answer.questionId}-${index}`} entering={staggeredEntrance(index)}>
              <QuestionCard answer={answer} />
            </Animated.View>
          ))
        )}
      </ScrollView>

      <ScrollEdges {...edges} />
    </Screen>
  );
}

function QuestionCard({ answer }: { answer: TopicAnswer }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.verdict, answer.correct ? styles.verdictRight : styles.verdictWrong]}>
          <Ionicons
            name={answer.correct ? 'checkmark' : 'close'}
            size={13}
            color={answer.correct ? colors.accent : colors.danger}
          />
          <Text
            style={[
              styles.verdictText,
              { color: answer.correct ? colors.accent : colors.danger },
            ]}
          >
            {answer.correct ? 'Correct' : 'Missed'}
          </Text>
        </View>
        {answer.quizTitle ? (
          <Text style={styles.quizTitle} numberOfLines={1}>
            {answer.quizTitle}
          </Text>
        ) : null}
      </View>

      <Text style={styles.prompt}>{answer.prompt}</Text>

      {/* Every option, not just the two that matter. Seeing the distractors is
          part of understanding why the right answer is right. */}
      <View style={styles.options}>
        {answer.options.map((option, index) => {
          const chosen = answer.selectedIndex === index;
          const isCorrect = answer.correctIndex === index;

          return (
            <View
              key={index}
              style={[
                styles.option,
                isCorrect && styles.optionCorrect,
                chosen && !isCorrect && styles.optionWrong,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  (isCorrect || chosen) && styles.optionTextStrong,
                ]}
              >
                {option}
              </Text>

              {/* Labelled rather than only coloured — "you picked this" and
                  "this was right" are different facts, and on a missed question
                  both appear at once. */}
              {chosen ? (
                <Text style={styles.optionTag}>You</Text>
              ) : null}
              {isCorrect && !chosen ? (
                <Text style={[styles.optionTag, { color: colors.accent }]}>Answer</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {answer.explanation ? (
        <Text style={styles.explanation}>{answer.explanation}</Text>
      ) : null}
    </GlassCard>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  verdictRight: {
    backgroundColor: c.accentSoft,
  },
  verdictWrong: {
    backgroundColor: c.dangerSoft,
  },
  verdictText: {
    ...typography.micro,
  },
  quizTitle: {
    ...typography.micro,
    color: c.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  prompt: {
    ...typography.bodyStrong,
    color: c.text,
    lineHeight: 22,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  optionCorrect: {
    backgroundColor: c.accentSoft,
    borderColor: c.accent,
  },
  optionWrong: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
  },
  optionText: {
    ...typography.body,
    color: c.textSecondary,
    flex: 1,
  },
  optionTextStrong: {
    color: c.text,
  },
  optionTag: {
    ...typography.micro,
    color: c.textMuted,
  },
  explanation: {
    ...typography.caption,
    color: c.textSecondary,
    lineHeight: 19,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
  },
});
