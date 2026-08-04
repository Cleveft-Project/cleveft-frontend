import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ApiError, authApi } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/** Typed exactly, to confirm. */
const CONFIRM_WORD = 'DELETE';

/**
 * Deleting the account, with friction on purpose.
 *
 * <p>Almost everything else in Cleveft is built to remove steps. This is the one
 * place that adds them: it is irreversible, it destroys a semester of
 * recordings, and the cost of a mistap is far higher than the cost of an extra
 * tap. Two stages, a typed word and a password — none of it is decoration.
 *
 * <p>It also says plainly what goes, itemised. "This cannot be undone" is a
 * warning nobody reads; a list of what they are about to lose is one they do.
 */
export function DeleteAccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { signOut } = useAuth();

  const [stage, setStage] = useState<'warn' | 'confirm'>('warn');
  const [word, setWord] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) {
    return null;
  }

  const close = () => {
    setStage('warn');
    setWord('');
    setPassword('');
    setError(null);
    onClose();
  };

  const remove = async () => {
    if (word.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} to confirm.`);
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    haptics.commit();
    setBusy(true);
    setError(null);

    try {
      await authApi.deleteAccount(password);
      // Signing out locally after the server has erased everything. The tokens
      // are already revoked; this clears the device.
      await signOut();
    } catch (caught) {
      haptics.miss();
      setError(
        caught instanceof ApiError ? caught.message : 'Could not delete your account.',
      );
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close}>
        <>
          <View style={styles.head}>
            <View style={styles.icon}>
              <Ionicons name="warning" size={20} color={colors.danger} />
            </View>
            <Text style={styles.title}>Delete your account</Text>
          </View>

          {stage === 'warn' ? (
            <>
              {/* Itemised rather than "this cannot be undone". A list of what
                  they lose is a warning people actually read. */}
              <View style={styles.list}>
                <Loss icon="mic" text="Every lecture you have recorded, and its audio" />
                <Loss icon="document-text" text="All transcripts, notes and key concepts" />
                <Loss icon="chatbubble-ellipses" text="Every question you have asked and its answer" />
                <Loss icon="school" text="Your quizzes, scores and exam readiness" />
                <Loss icon="people" text="Your circle, shared paths and anything you shared" />
              </View>

              <Text style={styles.note}>
                This cannot be undone, and nothing can be recovered afterwards.
              </Text>

              <NeonButton
                label="I understand, continue"
                onPress={() => {
                  haptics.tap();
                  setStage('confirm');
                }}
                variant="danger"
                size="lg"
              />
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(220)} style={styles.confirmBlock}>
              <Text style={styles.note}>
                Type <Text style={styles.word}>{CONFIRM_WORD}</Text> and enter your password.
              </Text>

              <TextField
                label={`TYPE ${CONFIRM_WORD}`}
                value={word}
                onChangeText={setWord}
                placeholder={CONFIRM_WORD}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!busy}
              />

              <TextField
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                editable={!busy}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton
                label="Delete my account"
                onPress={remove}
                loading={busy}
                variant="danger"
                size="lg"
              />
            </Animated.View>
          )}

          {!busy ? (
            <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Keep my account</Text>
            </Pressable>
          ) : null}
        </>
      </Sheet>
  );
}

function Loss({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.loss}>
      <Ionicons name={icon} size={15} color={colors.danger} />
      <Text style={styles.lossText}>{text}</Text>
    </View>
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
    backgroundColor: c.dangerSoft,
  },
  title: {
    ...typography.heading,
    color: c.text,
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  loss: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  lossText: {
    ...typography.caption,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  note: {
    ...typography.caption,
    color: c.textMuted,
    lineHeight: 19,
  },
  word: {
    color: c.danger,
    fontWeight: '700',
  },
  confirmBlock: {
    gap: spacing.lg,
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
    ...typography.bodyStrong,
    color: c.accent,
  },
});
