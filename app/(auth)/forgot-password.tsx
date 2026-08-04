import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ApiError, authApi } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { PasswordStrength, scorePassword } from '@/components/password-strength';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { spacing, typography, useThemedStyles, type Palette } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Getting back in after forgetting a password. Three steps, one per decision.
 *
 * <p>Address, then code, then password. Putting the code and the new password
 * together meant a student typed a password twice before being told the code
 * was wrong — the rejection arrived after all the work rather than before it.
 * Checking the code on its own screen fails fast, which is the whole point of
 * having a step.
 *
 * <p>The code is checked but not spent at step two; the server redeems it at
 * step three. That costs one extra request and buys an error at the moment the
 * mistake was made.
 */
export default function ForgotPasswordScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const haptics = useHaptics();

  const [stage, setStage] = useState<'request' | 'code' | 'password'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const requestCode = async () => {
    const address = email.trim();
    if (!address || !/^\S+@\S+\.\S+$/.test(address)) {
      setFieldErrors({ email: 'Enter a valid email address' });
      return;
    }

    haptics.commit();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await authApi.forgotPassword(address);
      setStage('code');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send a code.');
    } finally {
      setBusy(false);
    }
  };

  /** Step two: prove the code is right before asking for anything else. */
  const submitCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setFieldErrors({ code: 'The code is six digits' });
      return;
    }

    haptics.commit();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await authApi.verifyCode({ email: email.trim(), code: code.trim() });
      haptics.success();
      setStage('password');
    } catch (caught) {
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const errors: Record<string, string> = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `At least ${MIN_PASSWORD_LENGTH} characters`;
    }
    // Checked here rather than on the server: it is a typing mistake, not a
    // rule, and the only place it can be caught is where both values exist.
    if (confirm !== password) {
      errors.confirm = 'Both passwords must match';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    haptics.commit();
    setBusy(true);
    setError(null);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      haptics.success();
      // Straight to sign-in rather than signing them in automatically. Typing
      // the new password once, immediately, is what makes it stick.
      router.replace('/login');
    } catch (caught) {
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  const weak = password.length > 0 && scorePassword(password).score === 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={
          stage === 'request'
            ? 'Forgot your password?'
            : stage === 'code'
              ? 'Check your email'
              : 'Set a new password'
        }
        // Back steps within the flow before it leaves it, so a mistyped address
        // does not mean starting over from the login screen.
        onBack={() => {
          if (stage === 'password') {
            setStage('code');
          } else if (stage === 'code') {
            setStage('request');
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/login');
          }
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {stage === 'request' ? (
            <>
              <Text style={styles.copy}>
                Enter the address you signed up with and we will send you a six-digit code.
              </Text>

              <TextField
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                placeholder="you@st.knust.edu.gh"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!busy}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton label="Send me a code" onPress={requestCode} loading={busy} size="lg" />
            </>
          ) : stage === 'code' ? (
            <Animated.View entering={FadeIn.duration(240)} style={styles.stage}>
              {/* Worded for the truth, not the happy path: the server will not
                  say whether the address is registered, so neither can this. */}
              <Text style={styles.copy}>
                If <Text style={styles.strong}>{email.trim()}</Text> has a Cleveft account, a code
                is on its way. It expires in 15 minutes.
              </Text>

              <TextField
                label="SIX-DIGIT CODE"
                value={code}
                onChangeText={setCode}
                error={fieldErrors.code}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!busy}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton label="Continue" onPress={submitCode} loading={busy} size="lg" />

              <Pressable
                onPress={() => {
                  haptics.tap();
                  setStage('request');
                  setCode('');
                  setError(null);
                }}
                style={styles.again}
                accessibilityRole="button"
              >
                <Text style={styles.againText}>Didn&apos;t get it? Send another code</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(240)} style={styles.stage}>
              <Text style={styles.copy}>
                Code accepted. Choose a password you have not used on Cleveft before.
              </Text>

              <View>
                <TextField
                  label="NEW PASSWORD"
                  value={password}
                  onChangeText={setPassword}
                  error={fieldErrors.password}
                  secure
                  placeholder="At least 8 characters"
                  autoCapitalize="none"
                  autoFocus
                  editable={!busy}
                />
                <PasswordStrength password={password} />
              </View>

              <TextField
                label="CONFIRM PASSWORD"
                value={confirm}
                onChangeText={setConfirm}
                error={fieldErrors.confirm}
                secure
                placeholder="Type it again"
                autoCapitalize="none"
                editable={!busy}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton
                label="Set new password"
                onPress={reset}
                loading={busy}
                disabled={weak}
                size="lg"
              />
            </Animated.View>
          )}
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
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  stage: {
    gap: spacing.lg,
  },
  copy: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 23,
  },
  strong: {
    color: c.text,
    fontWeight: '600',
  },
  error: {
    ...typography.caption,
    color: c.danger,
  },
  again: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  againText: {
    ...typography.caption,
    color: c.textMuted,
  },
});
