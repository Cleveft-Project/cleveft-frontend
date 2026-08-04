import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/api';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/state/auth-context';
import { spacing, typography, useThemedStyles, type Palette } from '@/theme';

export default function LoginScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Enter your email';
    }
    if (!password) {
      errors.password = 'Enter your password';
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
      await signIn(email, password);
      // The auth gate handles the redirect once the session lands.
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setFormError('Could not sign you in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Welcome back" subtitle="Pick up where you left off" />

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
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              placeholder="you@st.knust.edu.gh"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <TextField
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              placeholder="Your password"
              secure
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
          </View>

          {/* Directly under the password, which is where someone realises they
              have forgotten it. Below the sign-in button they would try, fail,
              and only then go looking. */}
          <Pressable
            onPress={() => router.push('/forgot-password')}
            style={styles.forgot}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </Pressable>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <NeonButton
            label="Sign in"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            style={styles.submit}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Cleveft?</Text>
            <NeonButton
              label="Create an account"
              onPress={() => router.replace('/sign-up')}
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
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotText: {
    ...typography.caption,
    color: c.accent,
  },
  submit: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xxl,
    gap: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: c.textMuted,
  },
});
