import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { CourseOption } from '@/lib/courses';
import { normaliseCourseCode } from '@/lib/courses';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

interface CoursePickerProps {
  courses: CourseOption[];
  value: string;
  onChange: (courseCode: string) => void;
  editable?: boolean;
}

/**
 * Picks the course a recording belongs to.
 *
 * Courses come from the student's own past lectures, so by the second week of
 * term this is one tap rather than typing "EE 355" again in the thirty seconds
 * before a lecture starts. That matters more than it sounds: every mistyped or
 * skipped code is a lecture that silently drops out of its course's readiness
 * score.
 *
 * Free text stays available behind "New" — a student always has a first
 * lecture in a course, and cannot pick from a list that does not yet contain
 * it.
 */
export function CoursePicker({ courses, value, onChange, editable = true }: CoursePickerProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  // Typing mode opens automatically when there is nothing to pick from.
  const [typing, setTyping] = useState(courses.length === 0);

  const selected = normaliseCourseCode(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Course</Text>

      {courses.length > 0 ? (
        <View style={styles.chips}>
          {courses.map((course) => {
            const active = selected === course.code;
            return (
              <Pressable
                key={course.code}
                disabled={!editable}
                onPress={() => {
                  // Tapping the active chip clears it, so a mis-tap does not
                  // strand the recording in the wrong course.
                  onChange(active ? '' : course.label);
                  setTyping(false);
                }}
                style={[styles.chip, active && styles.chipActive, !editable && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {course.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={13} color={colors.accent} />
                ) : (
                  <Text style={styles.chipCount}>{course.lectureCount}</Text>
                )}
              </Pressable>
            );
          })}

          <Pressable
            disabled={!editable}
            onPress={() => setTyping((previous) => !previous)}
            style={[styles.chip, typing && styles.chipActive, !editable && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Add a new course"
          >
            <Ionicons
              name={typing ? 'close' : 'add'}
              size={13}
              color={typing ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.chipText, typing && styles.chipTextActive]}>New</Text>
          </Pressable>
        </View>
      ) : null}

      {typing || courses.length === 0 ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <TextInput
            value={value}
            onChangeText={onChange}
            editable={editable}
            placeholder="e.g. EE 355"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            autoCapitalize="characters"
            style={styles.input}
          />
        </Animated.View>
      ) : null}

      <Text style={styles.hint}>
        {selected
          ? 'Readiness and quizzes for this course are scored together.'
          : 'Without a course this lecture is scored on its own, not with the rest of the course.'}
      </Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    label: {
      ...typography.micro,
      fontWeight: '500',
      color: c.textMuted,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
    },
    chipActive: {
      backgroundColor: c.accentSoft,
    },
    chipText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.accent,
    },
    chipCount: {
      ...typography.micro,
      color: c.textMuted,
    },
    disabled: {
      opacity: 0.45,
    },
    input: {
      minHeight: 52,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: c.borderMuted,
      ...typography.body,
      color: c.text,
    },
    hint: {
      ...typography.micro,
      color: c.textMuted,
    },
  });
