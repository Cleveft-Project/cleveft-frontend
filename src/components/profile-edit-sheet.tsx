import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ApiError, authApi } from '@/api';
import type { User } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { CourseEditor } from '@/components/peers/course-editor';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { spacing, typography, useThemedStyles, type Palette } from '@/theme';

/**
 * Editing who you are, on its own surface.
 *
 * <p>This used to be a form occupying the lower two-thirds of the profile
 * screen, which is what made that screen read as a settings page with a
 * photograph on top. A profile should show what someone has built; the fields
 * behind it are something you open, change and close.
 *
 * <p>Saving is all-or-nothing and closes on success, so there is no state where
 * the sheet is open over a profile already showing different values.
 */
export function ProfileEditSheet({
  visible,
  onClose,
  user,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onSaved: (updated: User) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [programme, setProgramme] = useState(user?.programme ?? '');
  const [courses, setCourses] = useState<string[]>(user?.courses ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Reseeded every time it opens.
   *
   * The screen behind can change while this is closed — coming back from the
   * setup flow, or another device saving — and a sheet that kept its first
   * values would silently write stale ones back over them.
   *
   * The course list matters most: seeding from a `user` that has not hydrated
   * yet would send an empty array, which the server reads as "I take no
   * courses" and wipes the lot.
   */
  useEffect(() => {
    if (visible) {
      setFullName(user?.fullName ?? '');
      setUniversity(user?.university ?? '');
      setProgramme(user?.programme ?? '');
      setCourses(user?.courses ?? []);
      setError(null);
    }
  }, [visible, user]);

  const save = async () => {
    if (!fullName.trim()) {
      setError('Your name cannot be empty.');
      return;
    }

    haptics.commit();
    setSaving(true);
    setError(null);

    try {
      const updated = await authApi.updateProfile({
        fullName: fullName.trim(),
        university: university.trim(),
        programme: programme.trim(),
        courses,
      });
      haptics.success();
      onSaved(updated);
      onClose();
    } catch (caught) {
      haptics.miss();
      setError(caught instanceof ApiError ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} scrollable>
      <>
        <Text style={styles.title}>Edit profile</Text>

        <TextField
          label="FULL NAME"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          editable={!saving}
        />
        <TextField
          label="INSTITUTION"
          value={university}
          onChangeText={setUniversity}
          placeholder="University, polytechnic or college"
          autoCapitalize="words"
          editable={!saving}
        />
        <TextField
          label="PROGRAMME"
          value={programme}
          onChangeText={setProgramme}
          placeholder="Add your programme"
          autoCapitalize="words"
          editable={!saving}
        />

        {/* Last, because it is the only field that does something beyond
            describing you — it is what lets Cleveft introduce you to the people
            in those lecture rooms.

            CourseEditor prints its own heading, so this one does not add a
            second — "YOUR COURSES" directly above "COURSES THIS SEMESTER" was
            two labels for one control. */}
        <CourseEditor courses={courses} onChange={setCourses} editable={!saving} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <NeonButton label="Save" onPress={save} loading={saving} variant="accent" size="lg" />
      </>
    </Sheet>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  title: {
    ...typography.heading,
    color: c.text,
    paddingTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: c.danger,
  },
});
