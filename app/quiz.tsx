import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, examPrepApi, lecturesApi } from '@/api';
import type { AttemptResult, Quiz } from '@/api/types';
import { ErrorState, LoadingState, Pill } from '@/components/feedback';
import { GlassCard } from '@/components/glass-card';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { quizDisplayTitle } from '@/components/quiz-title';
import { Screen } from '@/components/screen';
import { useAsync } from '@/hooks/use-async';
import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ quizId?: string }>();
  const quizId = typeof params.quizId === 'string' ? params.quizId : null;

  const quiz = useAsync(() => examPrepApi.getQuiz(quizId as string), [quizId], {
    enabled: !!quizId,
  });

  // The quiz carries a name frozen at generation time, so the lecture is what
  // the header is actually named after. Fetched only once the quiz has landed
  // and told us which lecture that is; until then the stored title stands in.
  const lectureId = quiz.data?.lectureId ?? null;
  const lecture = useAsync(() => lecturesApi.get(lectureId as string), [lectureId], {
    enabled: !!lectureId,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const data = quiz.data as Quiz | null;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = !!data && answeredCount === data.questions.length;

  /** Graded answers by question, for rendering the review pass. */
  const gradedById = useMemo(() => {
    const map = new Map<string, AttemptResult['answers'][number]>();
    result?.answers.forEach((answer) => map.set(answer.questionId, answer));
    return map;
  }, [result]);

  const submit = async () => {
    if (!data) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Send every question, including unanswered ones — the server grades
      // against the full quiz and a missing entry counts as wrong either way.
      const payload = data.questions.map((question) => ({
        questionId: question.id,
        selectedIndex: answers[question.id] ?? null,
      }));

      setResult(await examPrepApi.submitAttempt(data.id, payload));
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Could not submit your answers.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!quizId) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Quiz" />
        <ErrorState message="No quiz was selected." onRetry={() => router.back()} />
      </Screen>
    );
  }

  if (quiz.isLoading && !data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Quiz" />
        <LoadingState label="Loading your quiz…" />
      </Screen>
    );
  }

  if ((quiz.error && !data) || !data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Quiz" />
        <ErrorState message={quiz.error ?? 'Quiz not found.'} onRetry={quiz.reload} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={result ? 'Your result' : quizDisplayTitle(lecture.data?.title, data.title)}
        subtitle={
          result
            ? `${result.score} of ${result.totalQuestions} correct`
            : `${answeredCount} of ${data.questions.length} answered`
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {result ? (
          <GlassCard active style={styles.resultCard}>
            <Text style={styles.resultPercent}>{result.percentage}%</Text>
            <Text style={styles.resultCopy}>
              {result.percentage >= 80
                ? 'Strong pass. This topic is holding up.'
                : result.percentage >= 60
                  ? 'Decent, but there are gaps worth closing.'
                  : 'Worth another pass through this lecture.'}
            </Text>

            {result.weakTopics.length > 0 ? (
              <View style={styles.weakTopics}>
                <Text style={styles.weakLabel}>Revisit these</Text>
                <View style={styles.weakTags}>
                  {result.weakTopics.map((topic) => (
                    <Pill key={topic} label={topic} tone="warning" />
                  ))}
                </View>
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        <View style={styles.questions}>
          {data.questions.map((question, questionIndex) => {
            const graded = gradedById.get(question.id);
            const selected = answers[question.id];

            return (
              <GlassCard key={question.id}>
                <Text style={styles.questionNumber}>Question {questionIndex + 1}</Text>
                <Text style={styles.questionPrompt}>{question.prompt}</Text>

                <View style={styles.options}>
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isCorrect = graded?.correctIndex === optionIndex;
                    const isWrongPick = !!graded && isSelected && !graded.correct;

                    return (
                      <Pressable
                        key={optionIndex}
                        onPress={() =>
                          !result &&
                          setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }))
                        }
                        disabled={!!result}
                        style={[
                          styles.option,
                          isSelected && !result && styles.optionSelected,
                          isCorrect && styles.optionCorrect,
                          isWrongPick && styles.optionWrong,
                        ]}
                      >
                        <View
                          style={[
                            styles.optionBadge,
                            isSelected && !result && styles.optionBadgeSelected,
                            isCorrect && styles.optionBadgeCorrect,
                            isWrongPick && styles.optionBadgeWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              (isSelected || isCorrect || isWrongPick) && styles.optionLabelActive,
                            ]}
                          >
                            {OPTION_LABELS[optionIndex] ?? optionIndex + 1}
                          </Text>
                        </View>
                        <Text style={styles.optionText}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Explanations only appear after submitting — showing them
                    while the quiz is live would make the score meaningless. */}
                {graded?.explanation ? (
                  <View
                    style={[
                      styles.explanation,
                      graded.correct ? styles.explanationCorrect : styles.explanationWrong,
                    ]}
                  >
                    <Text style={styles.explanationLabel}>
                      {graded.correct ? 'Correct' : 'Not quite'}
                    </Text>
                    <Text style={styles.explanationText}>{graded.explanation}</Text>
                  </View>
                ) : null}
              </GlassCard>
            );
          })}
        </View>

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        {result ? (
          <View style={styles.footerActions}>
            <NeonButton label="Back to exam prep" onPress={() => router.replace('/examprep')} />
            <NeonButton
              label="Ask about what I missed"
              onPress={() => router.replace('/chat')}
              variant="secondary"
            />
          </View>
        ) : (
          <NeonButton
            label={allAnswered ? 'Submit answers' : `Answer all ${data.questions.length} questions`}
            onPress={submit}
            loading={submitting}
            disabled={!allAnswered}
            size="lg"
            style={styles.submit}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  resultCard: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
  },
  resultPercent: {
    ...typography.display,
    fontSize: 52,
    color: c.accent,
  },
  resultCopy: {
    ...typography.body,
    color: c.textSecondary,
    textAlign: 'center',
  },
  weakTopics: {
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
    gap: spacing.md,
  },
  weakLabel: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weakTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  questions: {
    gap: spacing.lg,
  },
  questionNumber: {
    ...typography.micro,
    color: c.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  questionPrompt: {
    ...typography.subheading,
    color: c.text,
    marginTop: spacing.sm,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  optionSelected: {
    backgroundColor: c.accentSoft,
    borderColor: c.borderStrong,
  },
  optionCorrect: {
    backgroundColor: c.accentSoft,
    borderColor: c.accent,
  },
  optionWrong: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
  },
  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderMuted,
  },
  optionBadgeSelected: {
    backgroundColor: c.accentVivid,
    borderColor: c.accent,
  },
  optionBadgeCorrect: {
    backgroundColor: c.accentVivid,
    borderColor: c.accent,
  },
  optionBadgeWrong: {
    backgroundColor: c.danger,
    borderColor: c.danger,
  },
  optionLabel: {
    ...typography.caption,
    color: c.textMuted,
  },
  optionLabelActive: {
    color: c.textOnAccent,
    fontWeight: '700',
  },
  optionText: {
    ...typography.body,
    color: c.text,
    flex: 1,
  },
  explanation: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.xs,
  },
  explanationCorrect: {
    backgroundColor: c.accentSofter,
    borderColor: c.border,
  },
  explanationWrong: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
  },
  explanationLabel: {
    ...typography.micro,
    color: c.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  explanationText: {
    ...typography.caption,
    color: c.text,
  },
  error: {
    ...typography.caption,
    color: c.danger,
    marginTop: spacing.lg,
  },
  submit: {
    marginTop: spacing.xl,
  },
  footerActions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
