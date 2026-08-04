import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ApiError, collabApi } from '@/api';
import type { ChatMessage } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Turns a conversation into a learning path.
 *
 * <p>Cleveft's proposal defines a path as "the sequence of queries that produced
 * mastery" — and until now the only way to make one was to type it out by hand,
 * question by question, from memory. Nobody was ever going to do that, which is
 * why paths were empty however good the sharing around them got.
 *
 * <p>The conversation already <em>is</em> the sequence. This just names it and
 * keeps it.
 */

/** How much of an answer to carry into a step. */
const DIGEST_CHARS = 320;

export interface PathStepDraft {
  question: string;
  answerDigest: string;
  lectureId?: string;
}

/**
 * Pairs each question with the answer that followed it.
 *
 * <p>A trailing question with no answer yet is dropped — a step whose answer is
 * missing teaches nobody anything, and the student can save again once it
 * arrives.
 */
export function stepsFrom(messages: ChatMessage[]): PathStepDraft[] {
  const steps: PathStepDraft[] = [];

  messages.forEach((message, index) => {
    if (message.role !== 'user') {
      return;
    }
    const answer = messages[index + 1];
    if (!answer || answer.role !== 'assistant') {
      return;
    }

    const digest = answer.content.replace(/\s+/g, ' ').trim();

    steps.push({
      question: message.content.trim(),
      answerDigest:
        digest.length > DIGEST_CHARS ? `${digest.slice(0, DIGEST_CHARS).trim()}…` : digest,
      // The lecture the answer was grounded in, so a peer following this path
      // lands on the same material rather than on a bare question.
      lectureId: answer.citations?.[0]?.lectureId ?? undefined,
    });
  });

  return steps;
}

export function SavePathSheet({
  visible,
  onClose,
  messages,
  suggestedTitle,
  courseCode,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  suggestedTitle?: string | null;
  courseCode?: string | null;
  onSaved: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const steps = useMemo(() => stepsFrom(messages), [messages]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) {
    return null;
  }

  const effectiveTitle = title.trim() || suggestedTitle?.trim() || '';

  const save = async () => {
    if (!effectiveTitle) {
      setError('Give the path a name.');
      return;
    }
    if (steps.length === 0) {
      setError('There are no answered questions in this chat yet.');
      return;
    }

    haptics.commit();
    setSaving(true);
    setError(null);

    try {
      await collabApi.createPath({
        title: effectiveTitle,
        description: description.trim() || undefined,
        courseCode: courseCode ?? undefined,
        steps,
      });
      haptics.success();
      onSaved();
      onClose();
    } catch (caught) {
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'Could not save that path.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
        <>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="git-branch-outline" size={19} color={colors.accent} />
            </View>
            <View style={styles.headText}>
              <Text style={styles.title}>Save as a learning path</Text>
              <Text style={styles.subtitle}>
                {steps.length === 1
                  ? '1 question and its answer'
                  : `${steps.length} questions and their answers`}
              </Text>
            </View>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={suggestedTitle?.trim() || 'How I finally got this'}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={styles.input}
            maxLength={120}
            editable={!saving}
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What clicked, in a sentence (optional)"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={[styles.input, styles.inputMultiline]}
            multiline
            maxLength={280}
            editable={!saving}
          />

          {/* The steps, shown before saving. A student is about to publish their
              own questions to coursemates — they should see exactly what that
              is rather than trust a count. */}
          <ScrollView style={styles.steps} contentContainerStyle={styles.stepsBody}>
            {steps.map((step, index) => (
              <Animated.View
                key={`${index}-${step.question.slice(0, 12)}`}
                entering={FadeIn.delay(index * 60).duration(220)}
                style={styles.step}
              >
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <Text style={styles.stepText} numberOfLines={2}>
                  {step.question}
                </Text>
              </Animated.View>
            ))}

            {steps.length === 0 ? (
              <Text style={styles.empty}>
                Ask something and get an answer back, then this becomes a path worth sharing.
              </Text>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <NeonButton
            label="Save path"
            onPress={save}
            loading={saving}
            disabled={steps.length === 0}
            size="lg"
          />

          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </>
      </Sheet>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading,
    color: c.text,
  },
  subtitle: {
    ...typography.micro,
    color: c.textMuted,
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    ...typography.body,
    color: c.text,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  steps: {
    maxHeight: 200,
  },
  stepsBody: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: c.surfaceSunken,
  },
  stepIndex: {
    ...typography.micro,
    color: c.accent,
    fontWeight: '700',
    minWidth: 14,
  },
  stepText: {
    ...typography.caption,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  empty: {
    ...typography.caption,
    color: c.textMuted,
    lineHeight: 19,
  },
  error: {
    ...typography.caption,
    color: c.danger,
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.caption,
    color: c.textMuted,
  },
});
