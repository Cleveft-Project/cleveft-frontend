import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, examPrepApi, lecturesApi } from '@/api';
import type { AttemptResult, Quiz } from '@/api/types';
import { CountUp } from '@/components/count-up';
import { ErrorState, LoadingState, Pill } from '@/components/feedback';
import { GlassCard } from '@/components/glass-card';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { QuizOption, type QuizOptionState } from '@/components/quiz-option';
import { quizDisplayTitle } from '@/components/quiz-title';
import { KofiSays, type KofiOccasion } from '@/components/kofi-says';
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

  const scrollRef = useRef<ScrollView>(null);

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

  /**
   * How Kofi takes the result.
   *
   * The threshold for celebrating is deliberately generous. A bird that only
   * cheers at 100% teaches the student that anything less is failure, which is
   * the opposite of what a revision tool should do — and 60% on a first pass
   * through a hard lecture is genuinely worth encouraging. Three bands rather
   * than two, so a 62% and a 96% are not congratulated in identical words.
   */
  const occasion: KofiOccasion =
    !result || result.percentage < 60
      ? 'quizWeak'
      : result.percentage >= 80
        ? 'quizStrong'
        : 'quizDecent';

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

      // Take the student back to the top with the result.
      //
      // Submitting happens from the *bottom* of the quiz — that is where the
      // button is, after eight questions of scrolling — while the score, the
      // verdict and Kofi's reaction all render at the top. Without this the
      // entire reward for finishing is off-screen, and the only feedback is
      // the options quietly changing colour around you.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
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

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {result ? (
          <GlassCard active style={styles.resultCard}>
            {/* The whole moment, in order: Kofi reacts, particles fly on a
                real win, the number climbs, then he says something about it.
                Reaction first and words second — the reverse makes the line
                feel pre-recorded. */}
            <KofiSays occasion={occasion} size={132} burst={result.percentage >= 60} />

            <CountUp value={result.percentage} suffix="%" style={styles.resultPercent} delay={220} />

            {/* The point of this card, and the thing a generic quiz app
                cannot tell you.

                Every platform shows which *questions* you got right — that is
                table stakes. This says which *parts of the lecture* you
                understood: five questions came from keys, you got all five,
                so keys is not what you need to revise tonight. The server only
                claims this where at least two questions covered the topic, so
                it is never a lucky guess being reported as understanding.

                Not labelled "Mastered": the Exams screen uses that for a
                cumulative score across every quiz, and this is one sitting. */}
            {result.strongTopics?.length ? (
              <View style={styles.topicBlock}>
                <Text style={styles.topicLabel}>You understood</Text>
                <View style={styles.topicTags}>
                  {result.strongTopics.map((topic) => (
                    <Pill key={topic} label={topic} tone="accent" />
                  ))}
                </View>
              </View>
            ) : null}

            {result.weakTopics.length > 0 ? (
              <View style={styles.topicBlock}>
                <Text style={styles.topicLabel}>Go back over</Text>
                <View style={styles.topicTags}>
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

                    // One state rather than four booleans — see QuizOptionState.
                    const state: QuizOptionState = isCorrect
                      ? 'correct'
                      : isWrongPick
                        ? 'wrong'
                        : graded
                          ? 'muted'
                          : isSelected
                            ? 'selected'
                            : 'idle';

                    return (
                      <QuizOption
                        key={optionIndex}
                        label={OPTION_LABELS[optionIndex] ?? String(optionIndex + 1)}
                        text={option}
                        state={state}
                        disabled={!!result}
                        onPress={() =>
                          !result &&
                          setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }))
                        }
                      />
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
  topicBlock: {
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
    gap: spacing.md,
  },
  topicLabel: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  topicTags: {
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
