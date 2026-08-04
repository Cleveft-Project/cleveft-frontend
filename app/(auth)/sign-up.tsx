import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { ScreenHeader } from '@/components/headers';
import { NeonButton } from '@/components/neon-button';
import { PasswordStrength } from '@/components/password-strength';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

const TERMS_URL = 'https://cleveft.app/terms';
const PRIVACY_URL = 'https://cleveft.app/privacy';

export default function SignUpScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const { signUp } = useAuth();
  const [agreed, setAgreed] = useState(false);

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
    if (!agreed) {
      errors.agreed = 'Please accept the terms to continue';
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
              // Instructional rather than a sample person. A name in a
              // placeholder gets read as a suggestion, and whichever name is
              // chosen belongs to somebody.
              placeholder="Your full name"
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextField
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              // The real KNUST student format, so it reads as an example of the
              // address they actually have rather than a generic one.
              placeholder="you@st.knust.edu.gh"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <View>
              <TextField
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                hint={password ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters`}
                placeholder="Choose a password"
                secure
                autoCapitalize="none"
                autoComplete="new-password"
              />
              {/* Replaces the hint once typing starts. A length rule tells you
                  when you may proceed; it never tells you whether what you
                  chose is any good, and "password1" clears it. */}
              <PasswordStrength password={password} />
            </View>

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
              placeholder="Computer Science"
              autoCapitalize="words"
            />
          </View>

          {/* Unticked by default and required. A pre-ticked box is not consent,
              and in several jurisdictions is not legally consent either. */}
          <Pressable
            onPress={() => {
              haptics.tap();
              setAgreed((previous) => !previous);
              setFieldErrors((previous) => ({ ...previous, agreed: '' }));
            }}
            style={styles.agreeRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <Ionicons name="checkmark" size={14} color={colors.onFillPrimary} /> : null}
            </View>
            <Text style={styles.agreeText}>
              I agree to Cleveft&apos;s{' '}
              <Text style={styles.agreeLink} onPress={() => Linking.openURL(TERMS_URL)}>
                Terms
              </Text>{' '}
              and{' '}
              <Text style={styles.agreeLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          {fieldErrors.agreed ? (
            <Text style={styles.formError}>{fieldErrors.agreed}</Text>
          ) : null}

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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: c.fillPrimary,
    borderColor: c.fillPrimary,
  },
  agreeText: {
    ...typography.caption,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  agreeLink: {
    color: c.accent,
    fontWeight: '600',
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
