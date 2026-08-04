import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, authApi } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { Sheet } from '@/components/sheet';
import { PasswordStrength, scorePassword } from '@/components/password-strength';
import { TextField } from '@/components/text-field';
import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Changing a password without leaving Settings.
 *
 * <p>A sheet rather than a screen: it is three fields and a button, and pushing
 * a whole screen for it would make a routine change feel like an ordeal.
 *
 * <p>Every other session is signed out when it succeeds — which is usually the
 * reason someone is here — but not this one, because signing a student out of
 * the phone in their hand for securing their own account is a punishment for
 * doing the right thing.
 */
export function ChangePasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!visible) {
    return null;
  }

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setFieldErrors({});
    setDone(false);
    onClose();
  };

  const submit = async () => {
    const errors: Record<string, string> = {};
    if (!current) {
      errors.current = 'Enter your current password';
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      errors.next = `At least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (confirm !== next) {
      errors.confirm = 'Both passwords must match';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    haptics.commit();
    setSaving(true);
    setError(null);

    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      haptics.success();
      setDone(true);
    } catch (caught) {
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  };

  const weak = next.length > 0 && scorePassword(next).score === 0;

  return (
    <Sheet visible={visible} onClose={close}>
        <>
          {done ? (
            <View style={styles.doneBlock}>
              <Text style={styles.title}>Password changed</Text>
              <Text style={styles.copy}>
                Anyone signed in on another device has been signed out. You are still signed in
                here.
              </Text>
              <NeonButton label="Done" onPress={close} size="lg" />
            </View>
          ) : (
            <>
              <Text style={styles.title}>Change password</Text>

              <TextField
                label="CURRENT PASSWORD"
                value={current}
                onChangeText={setCurrent}
                error={fieldErrors.current}
                secure
                autoCapitalize="none"
                editable={!saving}
              />

              <View>
                <TextField
                  label="NEW PASSWORD"
                  value={next}
                  onChangeText={setNext}
                  error={fieldErrors.next}
                  secure
                  placeholder="At least 8 characters"
                  autoCapitalize="none"
                  editable={!saving}
                />
                <PasswordStrength password={next} />
              </View>

              <TextField
                label="CONFIRM NEW PASSWORD"
                value={confirm}
                onChangeText={setConfirm}
                error={fieldErrors.confirm}
                secure
                placeholder="Type it again"
                autoCapitalize="none"
                editable={!saving}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton
                label="Change password"
                onPress={submit}
                loading={saving}
                disabled={weak}
                size="lg"
              />

              <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </>
      </Sheet>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  title: {
    ...typography.heading,
    color: c.text,
    paddingTop: spacing.sm,
  },
  copy: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  doneBlock: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
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
