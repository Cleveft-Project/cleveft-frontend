import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError, lecturesApi } from '@/api';
import type { Lecture } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { TextField } from '@/components/text-field';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Paste a YouTube link and turn it into study material.
 *
 * <p>Opened from a lecture, so the video arrives already attached to the class
 * it was meant to explain — which is how students actually reach for one. That
 * attachment is why the sheet can promise, plainly, that this will not move the
 * readiness meter: supporting material helps you understand what you were
 * taught, it does not decide what you will be examined on.
 */
export function VideoImportSheet({
  visible,
  onClose,
  onImported,
  relatedLectureId,
  relatedTitle,
  courseCode,
}: {
  visible: boolean;
  onClose: () => void;
  /** Handed the PENDING lecture so the caller can start polling it. */
  onImported: (lecture: Lecture) => void;
  /** Omitted for a standalone import from the Record tab. */
  relatedLectureId?: string;
  relatedTitle?: string;
  courseCode?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setUrl('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!url.trim() || importing) {
      return;
    }

    haptics.commit();
    setImporting(true);
    setError(null);

    try {
      const lecture = await lecturesApi.importVideo({
        url: url.trim(),
        relatedLectureId,
        courseCode: courseCode ?? undefined,
      });

      haptics.success();
      setUrl('');
      onImported(lecture);
      onClose();
    } catch (caught) {
      // The server's rejections are written for the student — "that is a
      // playlist, open the video itself" — so they are shown as they arrive
      // rather than replaced with a generic failure.
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'Could not import that video.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.lift}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="logo-youtube" size={20} color={colors.danger} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Add a video</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {relatedTitle
                  ? `Saved alongside ${relatedTitle}`
                  : 'Saved to your library on its own'}
              </Text>
            </View>
          </View>

          <TextField
            label="YOUTUBE LINK"
            value={url}
            onChangeText={(next) => {
              setUrl(next);
              if (error) {
                setError(null);
              }
            }}
            placeholder="https://youtube.com/watch?v=…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!importing}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Said up front rather than discovered later. A student who thinks
              watching explainers raises their readiness is being misled by the
              app, and finding that out the week of an exam is the worst
              possible time. */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
            <Text style={styles.noteText}>
              Videos are searchable and quizzable, but never count towards exam readiness — that
              comes from your lectures.
            </Text>
          </View>

          <NeonButton
            label={importing ? 'Importing…' : 'Import'}
            onPress={submit}
            disabled={!url.trim()}
            loading={importing}
          />

          <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  lift: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surfaceSolid,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.borderMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.dangerSoft,
  },
  headerText: {
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
  error: {
    ...typography.caption,
    color: c.danger,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  noteText: {
    ...typography.micro,
    color: c.textMuted,
    flex: 1,
    lineHeight: 16,
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
