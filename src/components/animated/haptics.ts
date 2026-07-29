import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';

import { useFeedback } from '@/state/feedback-context';

/**
 * The app's haptic vocabulary — four taps, each with a job.
 *
 * Named by *meaning* rather than by strength, for the same reason the motion
 * tokens are: a component should ask for "this went well", not for "medium
 * impact". Otherwise every screen makes its own decision and the app develops
 * an accent.
 *
 * Every call is a no-op when the student has switched haptics off, so callers
 * never have to check. And every call is fire-and-forget: a failed haptic on a
 * device without a motor is not an error worth surfacing, or even logging.
 */
export function useHaptics() {
  const { haptics } = useFeedback();
  const on = haptics.enabled;

  return useMemo(
    () => ({
      /** Acknowledging a touch — selecting an answer, toggling a chip. */
      tap: () => {
        if (on) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      },

      /** Something completed. Firmer than a tap, still not an event. */
      commit: () => {
        if (on) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      },

      /**
       * It went well — a passing quiz, a streak day earned.
       *
       * The notification patterns rather than a plain impact: they are a
       * *rhythm* rather than a single knock, which is what makes success and
       * failure distinguishable without looking at the screen.
       */
      success: () => {
        if (on) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      },

      /**
       * It did not. Used for a wrong answer and a failed action.
       *
       * Deliberately the same weight as `success`, not heavier. A punishing
       * buzz on a wrong answer teaches a student to stop taking quizzes.
       */
      miss: () => {
        if (on) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      },
    }),
    [on],
  );
}
