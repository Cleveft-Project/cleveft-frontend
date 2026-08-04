import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ApiError, authApi } from '@/api';
import { useHaptics } from '@/components/animated/haptics';
import { Kofi } from '@/components/kofi';
import { NeonButton } from '@/components/neon-button';
import { useTypewriter } from '@/components/onboarding/use-typewriter';
import { CourseEditor } from '@/components/peers/course-editor';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/state/auth-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The three questions Cleveft needs, asked by Kofi rather than by a form.
 *
 * <p>Runs once, after sign-up. Before the account exists there is nowhere to
 * put the answers, and asking for them as the price of entry is how onboarding
 * gets abandoned — someone who has just registered is far more willing.
 *
 * <p>Every question is skippable and all three live on the profile afterwards,
 * so nothing here is a gate. Courses matter most: without them Cleveft cannot
 * introduce a student to anyone, and the whole Circle tab is empty by
 * construction.
 */

type Step = 'university' | 'programme' | 'courses' | 'done';

const ORDER: Step[] = ['university', 'programme', 'courses', 'done'];

const ASKS: Record<Step, string> = {
  university: 'Which university are you at?',
  programme: 'And what are you studying?',
  courses: 'Which courses are you taking this semester?',
  done: '',
};

export default function SetupScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState<Step>('university');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [programme, setProgramme] = useState(user?.programme ?? '');
  const [courses, setCourses] = useState<string[]>(user?.courses ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = ORDER.indexOf(step);
  const ask = useTypewriter(ASKS[step], { speed: 30, delay: 240 });

  // The bar fills as questions are answered rather than jumping between
  // screens, so progress reads as continuous rather than as four separate
  // pages that happen to be numbered.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(index / (ORDER.length - 1), {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const finish = async (skipped = false) => {
    haptics.commit();
    setSaving(true);
    setError(null);

    try {
      const updated = await authApi.updateProfile({
        university: university.trim(),
        programme: programme.trim(),
        courses,
      });
      updateUser(updated);
      haptics.success();
      router.replace('/home');
    } catch (caught) {
      // A failure here must not trap someone in onboarding. The answers live on
      // the profile screen too, so letting them through and telling them why is
      // better than holding them at a wall.
      setError(
        caught instanceof ApiError
          ? `${caught.message} You can add these later in your profile.`
          : 'Could not save that. You can add these later in your profile.',
      );
      if (skipped) {
        router.replace('/home');
      }
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    haptics.tap();
    const at = ORDER.indexOf(step);
    if (at < ORDER.length - 1) {
      setStep(ORDER[at + 1]);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} blob="violet">
      <View style={styles.head}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>

        <Pressable
          onPress={() => {
            haptics.tap();
            router.replace('/home');
          }}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Kofi asks, rather than a label above a box. The same three fields
              in a form get skipped; asked by someone, they get answered. */}
          <View style={styles.asking}>
            <Kofi mood={step === 'done' ? 'celebrate' : 'idle'} size={72} grounded={false} />
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>
                {step === 'done'
                  ? `Thanks${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}. That is everything I need.`
                  : ask.typed || ' '}
                {ask.typing ? <Text style={styles.caret}>▍</Text> : null}
              </Text>
            </View>
          </View>

          {step === 'university' ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.field}>
              <TextField
                label="INSTITUTION"
                value={university}
                onChangeText={setUniversity}
                placeholder="KNUST"
                autoCapitalize="words"
                autoFocus
              />
              <NeonButton label="Continue" onPress={next} size="lg" />
            </Animated.View>
          ) : null}

          {step === 'programme' ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.field}>
              <TextField
                label="PROGRAMME"
                value={programme}
                onChangeText={setProgramme}
                placeholder="Computer Science"
                autoCapitalize="words"
                autoFocus
              />
              <NeonButton label="Continue" onPress={next} size="lg" />
            </Animated.View>
          ) : null}

          {step === 'courses' ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.field}>
              <CourseEditor courses={courses} onChange={setCourses} />
              <NeonButton
                label={courses.length > 0 ? 'Continue' : 'I will add these later'}
                onPress={next}
                size="lg"
              />
            </Animated.View>
          ) : null}

          {step === 'done' ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.field}>
              {/* Their own answers, read back. The Duolingo move: a number the
                  student gave, turned into a consequence they get. */}
              <View style={styles.summary}>
                {courses.length > 0 ? (
                  <Text style={styles.summaryText}>
                    {courses.length === 1
                      ? 'I will keep that course separate from everything else.'
                      : `I will keep your ${courses.length} courses apart, so revising one never drags in another.`}
                  </Text>
                ) : (
                  <Text style={styles.summaryText}>
                    Add your courses any time from your profile, and I will show you who else is
                    taking them.
                  </Text>
                )}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <NeonButton
                label="Record my first lecture"
                onPress={() => void finish()}
                loading={saving}
                size="lg"
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: c.accent,
  },
  skip: {
    ...typography.caption,
    color: c.textMuted,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  asking: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bubble: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 58,
    justifyContent: 'center',
  },
  bubbleText: {
    ...typography.body,
    color: c.text,
    lineHeight: 22,
  },
  caret: {
    color: c.accent,
  },
  field: {
    gap: spacing.lg,
  },
  summary: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.accentSoft,
  },
  summaryText: {
    ...typography.body,
    color: c.text,
    lineHeight: 22,
  },
  error: {
    ...typography.caption,
    color: c.danger,
  },
});
