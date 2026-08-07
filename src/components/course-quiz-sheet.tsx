import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NeonButton } from '@/components/neon-button';
import { Sheet } from '@/components/sheet';
import { StepSlider } from '@/components/step-slider';
import { spacing, typography, useThemedStyles, type Palette } from '@/theme';

/** The range the exam-prep service accepts. Mirrors `@Max` on the request. */
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 40;

/**
 * A course quiz is longer than a lecture quiz by default, because it is
 * covering a semester rather than an hour. Still well short of the ceiling —
 * the default should be a sitting, not an ordeal.
 */
const DEFAULT_QUESTIONS = 12;

/**
 * Asks how long the course quiz should be, before generating it.
 *
 * <p>The lecture screen already lets a student choose, and the course button
 * silently used eight — so the same tap produced a different kind of quiz
 * depending on where it was made, for no reason a student could see. This asks
 * the same question in the one place a course-wide quiz can be started from.
 */
export function CourseQuizSheet({
  visible,
  courseCode,
  lectureCount,
  busy,
  onGenerate,
  onClose,
}: {
  visible: boolean;
  /** Null for the ungrouped pile, which has no code to show. */
  courseCode: string | null;
  lectureCount: number;
  busy: boolean;
  onGenerate(questionCount: number): void;
  onClose(): void;
}) {
  const styles = useThemedStyles(createStyles);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTIONS);

  // Reset on each open. A count chosen for one course should not silently
  // become the answer for the next one.
  useEffect(() => {
    if (visible) {
      setQuestionCount(DEFAULT_QUESTIONS);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <>
        <View>
          <Text style={styles.title}>
            {courseCode ? `Quiz ${courseCode}` : 'Quiz your ungrouped lectures'}
          </Text>
          <Text style={styles.subtitle}>
            {lectureCount === 1
              ? 'Drawn from 1 lecture'
              : `Drawn from across ${lectureCount} lectures`}
          </Text>
        </View>

        <View style={styles.field}>
          <View style={styles.head}>
            <Text style={styles.label}>Questions</Text>
            <Text style={styles.value}>{questionCount}</Text>
          </View>
          <StepSlider
            min={MIN_QUESTIONS}
            max={MAX_QUESTIONS}
            value={questionCount}
            onChange={setQuestionCount}
          />
        </View>

        <NeonButton
          label="Generate quiz"
          onPress={() => onGenerate(questionCount)}
          loading={busy}
          size="lg"
        />
      </>
    </Sheet>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  title: {
    ...typography.heading,
    color: c.text,
  },
  subtitle: {
    ...typography.caption,
    color: c.textMuted,
    marginTop: 2,
  },
  field: {
    gap: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
    color: c.textSecondary,
  },
  value: {
    ...typography.heading,
    color: c.accent,
    // Tabular, so the row does not shift as the number counts up.
    fontVariant: ['tabular-nums'],
  },
});
