import { Easing, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * The app's motion vocabulary.
 *
 * Colour has `palettes.ts`, spacing has the theme tokens, and motion has this.
 * A scattering of bespoke damping values is what makes an interface feel
 * assembled rather than designed — the same reason the palette exists.
 *
 * Four springs, each with a job:
 *
 * - {@link SNAPPY}   acknowledgement. A press, a toggle. Arrives and stops.
 * - {@link BOUNCY}   reward. A correct answer, a completed streak day. Visibly
 *                    overshoots, because overshoot is what reads as delight.
 * - {@link GENTLE}   arrival. Something appearing that the student did not ask
 *                    for; it should not demand attention.
 * - {@link CELEBRATE} the big moment. Slower and looser than BOUNCY so it
 *                    lands as an event rather than a tick.
 *
 * The numbers matter less than the fact that there are only four of them.
 */
export const SNAPPY = { damping: 18, stiffness: 260, mass: 0.6 } as const;
export const BOUNCY = { damping: 9, stiffness: 190, mass: 0.7 } as const;
export const GENTLE = { damping: 20, stiffness: 110, mass: 0.9 } as const;
export const CELEBRATE = { damping: 7, stiffness: 140, mass: 0.9 } as const;

/** Decelerating. Anything travelling to a resting position uses this. */
export const EASE_OUT = Easing.out(Easing.cubic);
/** Symmetric. For things that return to where they started — a wiggle, a pulse. */
export const EASE_IN_OUT = Easing.inOut(Easing.quad);

/**
 * A quick pop: overshoot, then settle.
 *
 * The shape of every "yes, that worked" in the app. `peak` is deliberately
 * modest by default — a 1.5x pop reads as a bug, not a reward.
 */
export function pop(peak = 1.12, settled = 1) {
  'worklet';
  return withSequence(
    withTiming(peak, { duration: 130, easing: EASE_OUT }),
    withSpring(settled, BOUNCY),
  );
}

/**
 * A horizontal shake, for a wrong answer or a rejected input.
 *
 * Four decreasing swings rather than a constant wobble: a shake that decays
 * reads as "no", while one that does not reads as a broken loop. Kept small —
 * this should feel like a head shake, not an earthquake.
 */
export function shake(distance = 8) {
  'worklet';
  return withSequence(
    withTiming(-distance, { duration: 55, easing: EASE_IN_OUT }),
    withTiming(distance, { duration: 55, easing: EASE_IN_OUT }),
    withTiming(-distance * 0.6, { duration: 50, easing: EASE_IN_OUT }),
    withTiming(distance * 0.6, { duration: 50, easing: EASE_IN_OUT }),
    withTiming(0, { duration: 45, easing: EASE_IN_OUT }),
  );
}

/**
 * A single rocking wiggle, in degrees — a nod, a wave, a head tilt.
 *
 * Used by the mascot and by the greeting icon on the home screen.
 */
export function wiggle(degrees = 14, delay = 0) {
  'worklet';
  return withDelay(
    delay,
    withSequence(
      withTiming(-degrees, { duration: 160, easing: EASE_IN_OUT }),
      withTiming(degrees * 0.8, { duration: 160, easing: EASE_IN_OUT }),
      withTiming(-degrees * 0.4, { duration: 140, easing: EASE_IN_OUT }),
      withTiming(0, { duration: 140, easing: EASE_IN_OUT }),
    ),
  );
}

/**
 * A ring or halo expanding outward and fading — the shape of "something just
 * happened here".
 *
 * Returns the two halves separately because scale and opacity have to be
 * assigned to their own shared values.
 */
export function haloScale(to = 1.35, duration = 700) {
  'worklet';
  return withTiming(to, { duration, easing: EASE_OUT });
}

export function haloFade(duration = 700) {
  'worklet';
  return withSequence(
    withTiming(1, { duration: 110, easing: EASE_OUT }),
    withTiming(0, { duration: duration - 110, easing: EASE_OUT }),
  );
}

/**
 * How long a celebration holds the screen before the app moves on.
 *
 * One number, so the quiz result, the streak completion and any future
 * milestone all breathe for the same beat.
 */
export const CELEBRATION_HOLD_MS = 900;
