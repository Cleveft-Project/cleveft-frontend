import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The courses a student is taking this semester.
 *
 * <p>Chips rather than a text field, because this is a set that gets edited one
 * item at a time — added when a course starts, removed when it ends — and a
 * comma-separated string makes deleting the third of six an exercise in
 * cursor placement.
 *
 * <p>Codes are upper-cased and stripped as they are typed, so what the student
 * sees is exactly what the server will store. Two people typing "CSM 266" and
 * "csm266" have to end up matching, or they will never find each other.
 */
export function CourseEditor({
  courses,
  onChange,
  editable = true,
}: {
  courses: string[];
  onChange: (next: string[]) => void;
  editable?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [draft, setDraft] = useState('');

  const normalise = (raw: string) =>
    raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  const add = () => {
    const code = normalise(draft);
    if (!code) {
      return;
    }
    if (courses.includes(code)) {
      // Already there. Clearing the field is the honest response — an error
      // about a course they have already added helps nobody.
      setDraft('');
      return;
    }
    haptics.commit();
    onChange([...courses, code]);
    setDraft('');
  };

  const remove = (code: string) => {
    haptics.tap();
    onChange(courses.filter((entry) => entry !== code));
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>COURSES THIS SEMESTER</Text>

      <View style={styles.chips}>
        {courses.map((code) => (
          <Animated.View
            key={code}
            entering={FadeIn.duration(200)}
            layout={LinearTransition.duration(220)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{code}</Text>
            {editable ? (
              <Pressable
                onPress={() => remove(code)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${code}`}
              >
                <Ionicons name="close" size={14} color={colors.accent} />
              </Pressable>
            ) : null}
          </Animated.View>
        ))}

        {courses.length === 0 ? (
          <Text style={styles.empty}>None yet</Text>
        ) : null}
      </View>

      {editable ? (
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="CSM 266"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <Pressable
            onPress={add}
            disabled={!normalise(draft)}
            style={[styles.addButton, !normalise(draft) && styles.addButtonOff]}
            accessibilityRole="button"
            accessibilityLabel="Add course"
          >
            <Ionicons name="add" size={18} color={colors.onFillPrimary} />
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.hint}>
        Cleveft uses these to show you who else is taking them.
      </Text>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  label: {
    ...typography.micro,
    color: c.textMuted,
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 32,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  chipText: {
    ...typography.caption,
    color: c.accent,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  empty: {
    ...typography.caption,
    color: c.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    ...typography.body,
    color: c.text,
    letterSpacing: 0.6,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.fillPrimary,
  },
  addButtonOff: {
    opacity: 0.4,
  },
  hint: {
    ...typography.micro,
    color: c.textMuted,
  },
});
