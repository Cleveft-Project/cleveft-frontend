import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
}

/**
 * Dark-mode input with a focus ring in the accent colour and inline errors.
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  secure = false,
  multiline = false,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && !revealed}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />

        {/* An eye, not the words "Show"/"Hide".
            The label had to change with the state, which meant the control
            moved as it was pressed and read as a sentence rather than a button.
            The eye is the convention everywhere else, so nobody has to work out
            what it does. */}
        {secure ? (
          <Pressable
            onPress={() => setRevealed((previous) => !previous)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.micro,
    fontWeight: '500',
    color: c.textMuted,
  },
  // Borderless at rest. The fill already says "type here"; an outline on top of
  // it is the second border for the same job that the reskin removed elsewhere.
  // The focus ring stays, because that one carries information.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 120,
  },
  fieldFocused: {
    borderColor: c.accentVivid,
    backgroundColor: c.accentSofter,
  },
  fieldError: {
    borderColor: c.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: c.text,
    // Android adds its own vertical padding that breaks the 52pt row height.
    paddingVertical: 0,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 96,
  },
  reveal: {
    ...typography.caption,
    color: c.accent,
  },
  error: {
    ...typography.caption,
    color: c.danger,
  },
  hint: {
    ...typography.caption,
    color: c.textMuted,
  },
});
