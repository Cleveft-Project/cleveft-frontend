import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/state/auth-context';
import { spacing, typography, useThemedStyles, type Palette } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [programme, setProgramme] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Mirrors the server's constraints so an obvious mistake is caught before a
   * round trip. The server still validates — this is convenience, not trust.
   */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Enter your full name';
    }
    if (!email.trim()) {
      errors.email = 'Enter your email';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `At least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        fullName: fullName.trim(),
        email,
        password,
        university: university.trim() || undefined,
        programme: programme.trim() || undefined,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setFormError('Could not create your account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Create account" subtitle="Start turning lectures into knowledge" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <TextField
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              error={fieldErrors.fullName}
              placeholder="Ama Mensah"
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextField
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              placeholder="you@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextField
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholder="Choose a password"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
            />

            <TextField
              label="UNIVERSITY (OPTIONAL)"
              value={university}
              onChangeText={setUniversity}
              placeholder="KNUST"
              autoCapitalize="words"
            />

            <TextField
              label="PROGRAMME (OPTIONAL)"
              value={programme}
              onChangeText={setProgramme}
              placeholder="Computer Engineering"
              autoCapitalize="words"
            />
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <NeonButton
            label="Create account"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            style={styles.submit}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <NeonButton
              label="Sign in instead"
              onPress={() => router.replace('/login')}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  formError: {
    ...typography.caption,
    color: c.danger,
  },
  submit: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: c.textMuted,
  },
});
