import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { BOUNCY, CELEBRATE, EASE_IN_OUT, GENTLE } from '@/components/animated/motion';
import { useTheme } from '@/theme';

/**
 * Kofi — the Cleveft mascot.
 *
 * ## The name, and the pose
 *
 * Two separate things, and conflating them was the original mistake here.
 *
 * **Sankofa** is what Kofi *does*: the Akan symbol of a bird turning its head
 * back to retrieve an egg it left behind — from Twi *san* (return), *ko* (go),
 * *fa* (take). "Go back and get what you forgot." That is a one-image statement
 * of what this app is: reach into a lecture the student already sat through and
 * retrieve what they missed. It is a concept and an Adinkra symbol, not a name,
 * so it describes the pose and never the character.
 *
 * **Kofi** is who he is: the Akan day name for a Friday-born boy. A real name,
 * immediately familiar to Ghanaian students, and recognisable well beyond Ghana
 * if Cleveft travels.
 *
 * ## Why it is built the way it is
 *
 * The first version of this component was a silhouette with transforms bolted
 * on: it breathed, it hopped, and it still read as a picture being moved
 * around, because it had no face. Personality in a cartoon character comes
 * almost entirely from **eyes, brows and mouth**, not from illustration detail
 * — Duo is geometrically trivial, two enormous eyes and a beak, and reads as
 * fully alive. So this version is built around a face rig:
 *
 * - **Pupils** move independently of the head. Where a character looks is the
 *   single strongest signal that something is behind the eyes.
 * - **Lids** slide over the eyes, giving blinks, sleepiness and squints.
 * - **Happy eyes** are a separate pair of arcs that cross-fade in, because an
 *   SVG path shape cannot be animated between forms reliably.
 * - **Brows** rotate and lift. Two small shapes carry most of the emotion.
 * - **The beak** opens on a hinge.
 *
 * Every animated value is numeric — react-native-svg animates `cx`, `cy`, `r`,
 * `rx`, `ry`, `opacity`, `rotation`, `x` and `y` reliably, and does *not*
 * animate path `d` data. Anything that looks like a shape change here is a
 * cross-fade between two static shapes.
 *
 * ## The honest ceiling
 *
 * This gets a long way, and it costs no asset pipeline and follows the theme
 * automatically. It is still not a professionally animated character: no
 * secondary motion, no real deformation, no illustrator. If Cleveft wants true
 * Duolingo parity, that is a Rive file drawn by someone who animates for a
 * living. The `mood` prop is deliberately shaped like a Rive state machine so
 * that swap changes this file and nothing else.
 */
export type KofiMood =
  /** Resting. Breathes, blinks, glances around. */
  | 'idle'
  /** Recording — ears up, eyes wide, watching what is being said. */
  | 'listening'
  /** Working: transcribing, generating, answering. */
  | 'thinking'
  /** They got it right. */
  | 'celebrate'
  /** They got it wrong. Sympathetic, never scolding. */
  | 'encourage';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface KofiProps {
  mood?: KofiMood;
  /** Rendered size in points. The art is drawn in a 100×100 box. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Only where the bird carries meaning; decorative by default. */
  label?: string;
  /**
   * Airborne: wings beat continuously and the legs tuck. Use where the
   * container is also moving him vertically — hovering with the wings still
   * would read as a bird being dragged around on a wire.
   */
  flying?: boolean;
  /**
   * Draws the small ellipse he stands on. Turn it off when he is airborne, or
   * when the container casts its own shadow — two shadows on one subject is
   * the fastest way to make a float look pasted on.
   */
  grounded?: boolean;
}

export function Kofi({
  mood = 'idle',
  size = 96,
  style,
  label,
  flying = false,
  grounded = true,
}: KofiProps) {
  const { colors } = useTheme();

  // --- always running -----------------------------------------------------
  const breath = useSharedValue(0);
  /** 0 open, 1 shut. Drives the lids. */
  const lid = useSharedValue(0);

  // --- body ---------------------------------------------------------------
  const bodyScale = useSharedValue(1);
  const bodyLift = useSharedValue(0);
  const bodyTilt = useSharedValue(0);
  const headTilt = useSharedValue(0);

  // --- face ---------------------------------------------------------------
  /** Pupil offset in viewBox units. Where the bird is looking. */
  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  /** Cross-fade to the smiling arc eyes. */
  const happyEyes = useSharedValue(0);
  /** Vertical squash of the eye whites — squinting. */
  const eyeOpen = useSharedValue(1);
  /** Brow lift (negative is raised) and angle (positive is furrowed). */
  const browLift = useSharedValue(0);
  const browAngle = useSharedValue(0);
  /** Beak opening, 0–1. */
  const beakOpen = useSharedValue(0);

  // --- props --------------------------------------------------------------
  const wingFlap = useSharedValue(0);
  const eggGlow = useSharedValue(0.55);
  const eggLift = useSharedValue(0);

  /* Airborne: wings beat continuously, which is what stops a vertically
     drifting bird from looking winched. */
  useEffect(() => {
    if (!flying) {
      return;
    }

    wingFlap.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 240, easing: EASE_IN_OUT }),
        withTiming(0.1, { duration: 240, easing: EASE_IN_OUT }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(wingFlap);
      wingFlap.value = withTiming(0, { duration: 200 });
    };
  }, [flying, wingFlap]);


  /* Breathing and blinking never stop: a character that holds perfectly still
     is a sticker. */
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: EASE_IN_OUT }),
        withTiming(0, { duration: 1700, easing: EASE_IN_OUT }),
      ),
      -1,
      false,
    );

    lid.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2400 }),
        withTiming(1, { duration: 65 }),
        withTiming(0, { duration: 85 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(breath);
      cancelAnimation(lid);
    };
  }, [breath, lid]);

  /* Mood — the whole face changes, not just the pose. */
  useEffect(() => {
    switch (mood) {
      case 'celebrate':
        happyEyes.value = withTiming(1, { duration: 140 });
        beakOpen.value = withSequence(
          withTiming(1, { duration: 130 }),
          withTiming(0.55, { duration: 200 }),
          withTiming(1, { duration: 160 }),
          withTiming(0.2, { duration: 400 }),
        );
        browLift.value = withSpring(-4, BOUNCY);
        browAngle.value = withSpring(-8, BOUNCY);

        // Three decreasing hops with a crouch before and a squash on landing.
        // Squash-and-stretch is what separates a character jumping from a shape
        // translating, and it costs two keyframes.
        bodyLift.value = withSequence(
          withTiming(-32, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
          withTiming(-19, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
          withTiming(-8, { duration: 140, easing: Easing.out(Easing.quad) }),
          withSpring(0, CELEBRATE),
        );
        bodyScale.value = withSequence(
          withTiming(0.9, { duration: 90, easing: EASE_IN_OUT }),
          withTiming(1.15, { duration: 190, easing: Easing.out(Easing.quad) }),
          withTiming(0.93, { duration: 160, easing: EASE_IN_OUT }),
          withTiming(1.07, { duration: 170 }),
          withSpring(1, CELEBRATE),
        );
        headTilt.value = withSequence(
          withTiming(-11, { duration: 200, easing: EASE_IN_OUT }),
          withTiming(9, { duration: 220, easing: EASE_IN_OUT }),
          withSpring(0, BOUNCY),
        );
        wingFlap.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 95, easing: EASE_IN_OUT }),
            withTiming(0, { duration: 95, easing: EASE_IN_OUT }),
          ),
          8,
          false,
        );
        eggLift.value = withSequence(
          withTiming(-24, { duration: 240, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 290, easing: Easing.in(Easing.quad) }),
          withSpring(0, BOUNCY),
        );
        eggGlow.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0.7, { duration: 300 }),
          withTiming(1, { duration: 190 }),
          withTiming(0.55, { duration: 800 }),
        );
        break;

      case 'encourage':
        // Sympathy, not scolding: inner brows up, eyes half-lidded, a slow
        // head tilt. A mascot that tells students off is what gets uninstalled
        // in exam week.
        happyEyes.value = withTiming(0, { duration: 120 });
        eyeOpen.value = withSequence(
          withTiming(0.62, { duration: 260, easing: EASE_IN_OUT }),
          withDelay(700, withTiming(1, { duration: 400 })),
        );
        browLift.value = withSequence(
          withTiming(3, { duration: 260 }),
          withDelay(700, withSpring(0, GENTLE)),
        );
        browAngle.value = withSequence(
          withTiming(13, { duration: 260 }),
          withDelay(700, withSpring(0, GENTLE)),
        );
        gazeY.value = withSequence(
          withTiming(1.6, { duration: 300 }),
          withDelay(700, withSpring(0, GENTLE)),
        );
        headTilt.value = withSequence(
          withTiming(13, { duration: 320, easing: EASE_IN_OUT }),
          withTiming(-4, { duration: 320, easing: EASE_IN_OUT }),
          withSpring(0, GENTLE),
        );
        bodyScale.value = withSequence(
          withTiming(0.96, { duration: 220 }),
          withSpring(1, GENTLE),
        );
        beakOpen.value = withTiming(0, { duration: 200 });
        break;

      case 'thinking':
        happyEyes.value = withTiming(0, { duration: 120 });
        // Looks up and away, brow furrowed — the universal shorthand for
        // working something out.
        eyeOpen.value = withTiming(0.78, { duration: 300 });
        browAngle.value = withTiming(11, { duration: 300 });
        browLift.value = withTiming(-2, { duration: 300 });
        gazeX.value = withRepeat(
          withSequence(
            withTiming(-2.4, { duration: 900, easing: EASE_IN_OUT }),
            withTiming(2.4, { duration: 900, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        gazeY.value = withTiming(-1.8, { duration: 400 });
        headTilt.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 900, easing: EASE_IN_OUT }),
            withTiming(6, { duration: 900, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        eggGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: EASE_IN_OUT }),
            withTiming(0.4, { duration: 700, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        break;

      case 'listening':
        happyEyes.value = withTiming(0, { duration: 120 });
        // Eyes wide, brows high, gaze flicking back over its shoulder — alert
        // rather than posed. Holding a still pose, which is what this did
        // before, reads as a paused animation.
        eyeOpen.value = withTiming(1.18, { duration: 300 });
        browLift.value = withTiming(-5, { duration: 300 });
        browAngle.value = withTiming(-4, { duration: 300 });
        gazeX.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 700, easing: EASE_IN_OUT }),
            withTiming(-1, { duration: 800, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        headTilt.value = withRepeat(
          withSequence(
            withTiming(-9, { duration: 620, easing: EASE_IN_OUT }),
            withTiming(-2, { duration: 700, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        bodyLift.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 620, easing: EASE_IN_OUT }),
            withTiming(0, { duration: 700, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        eggGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 620, easing: EASE_IN_OUT }),
            withTiming(0.6, { duration: 700, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        break;

      case 'idle':
      default:
        happyEyes.value = withTiming(0, { duration: 200 });
        eyeOpen.value = withSpring(1, GENTLE);
        browLift.value = withSpring(0, GENTLE);
        browAngle.value = withSpring(0, GENTLE);
        beakOpen.value = withTiming(0, { duration: 250 });
        gazeX.value = withSpring(0, GENTLE);
        gazeY.value = withSpring(0, GENTLE);
        headTilt.value = withSpring(0, GENTLE);
        bodyTilt.value = withSpring(0, GENTLE);
        bodyLift.value = withSpring(0, GENTLE);
        bodyScale.value = withSpring(1, GENTLE);
        eggGlow.value = withTiming(0.55, { duration: 400 });
        wingFlap.value = withTiming(0, { duration: 200 });
        break;
    }

    return () => {
      if (mood === 'thinking' || mood === 'listening') {
        cancelAnimation(gazeX);
        cancelAnimation(headTilt);
        cancelAnimation(bodyLift);
        cancelAnimation(eggGlow);
      }
      if (mood === 'celebrate') {
        cancelAnimation(wingFlap);
      }
    };
  }, [
    beakOpen, bodyLift, bodyScale, bodyTilt, browAngle, browLift, eggGlow, eggLift,
    eyeOpen, gazeX, gazeY, happyEyes, headTilt, mood, wingFlap,
  ]);

  /*
   * Idle breaks — the technique that separates a mascot from a sticker.
   *
   * A character that only moves when poked is furniture between pokes. Every
   * few seconds an idle bird does something nobody asked for: glances around,
   * hops, ruffles its wings, tilts its head. The interval is randomised because
   * a fidget on an exact metronome reads as a loop, which is the thing being
   * avoided.
   */
  useEffect(() => {
    if (mood !== 'idle') {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timer = setTimeout(() => {
        switch (Math.floor(Math.random() * 7)) {
          case 5: // the Sankofa look — a full turn back, held, then front again
            headTilt.value = withSequence(
              withTiming(-22, { duration: 420, easing: EASE_IN_OUT }),
              withDelay(900, withTiming(6, { duration: 380, easing: EASE_IN_OUT })),
              withSpring(0, GENTLE),
            );
            gazeX.value = withSequence(
              withTiming(-3.4, { duration: 420, easing: EASE_IN_OUT }),
              withDelay(900, withSpring(0, GENTLE)),
            );
            eggGlow.value = withSequence(
              withTiming(1, { duration: 500 }),
              withDelay(600, withTiming(0.55, { duration: 700 })),
            );
            break;

          case 6: // a quick chirp — beak opens twice, brows pop
            beakOpen.value = withSequence(
              withTiming(0.9, { duration: 110 }),
              withTiming(0, { duration: 130 }),
              withTiming(0.7, { duration: 100 }),
              withTiming(0, { duration: 150 }),
            );
            browLift.value = withSequence(
              withTiming(-5, { duration: 120 }),
              withDelay(260, withSpring(0, BOUNCY)),
            );
            break;

          case 0: // glance around — pupils only, which is the cheapest life
            gazeX.value = withSequence(
              withTiming(-3.2, { duration: 380, easing: EASE_IN_OUT }),
              withDelay(600, withTiming(3.2, { duration: 420, easing: EASE_IN_OUT })),
              withDelay(500, withSpring(0, GENTLE)),
            );
            break;

          case 1: // hop
            bodyScale.value = withSequence(
              withTiming(0.93, { duration: 110, easing: EASE_IN_OUT }),
              withTiming(1.08, { duration: 160, easing: Easing.out(Easing.quad) }),
              withTiming(0.96, { duration: 130, easing: EASE_IN_OUT }),
              withSpring(1, BOUNCY),
            );
            bodyLift.value = withSequence(
              withTiming(-17, { duration: 190, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
              withSpring(0, BOUNCY),
            );
            break;

          case 2: // ruffle
            wingFlap.value = withRepeat(
              withSequence(
                withTiming(0.85, { duration: 105, easing: EASE_IN_OUT }),
                withTiming(0, { duration: 105, easing: EASE_IN_OUT }),
              ),
              3,
              false,
            );
            bodyTilt.value = withSequence(
              withTiming(4, { duration: 140, easing: EASE_IN_OUT }),
              withTiming(-4, { duration: 140, easing: EASE_IN_OUT }),
              withSpring(0, BOUNCY),
            );
            break;

          case 3: // curious head tilt, brows up
            headTilt.value = withSequence(
              withTiming(-13, { duration: 320, easing: EASE_IN_OUT }),
              withDelay(800, withSpring(0, GENTLE)),
            );
            browLift.value = withSequence(
              withTiming(-4, { duration: 320 }),
              withDelay(800, withSpring(0, GENTLE)),
            );
            break;

          default: // a slow double blink, the quietest of the five
            lid.value = withSequence(
              withTiming(1, { duration: 80 }),
              withTiming(0, { duration: 100 }),
              withTiming(1, { duration: 80 }),
              withTiming(0, { duration: 110 }),
            );
            break;
        }

        scheduleNext();
        // 1.6–3.4s. Tighter than the first pass, which left gaps long enough
        // that a glance at the screen usually caught him doing nothing at all.
      }, 1600 + Math.random() * 1800);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [
    beakOpen, bodyLift, bodyScale, bodyTilt, browLift, eggGlow, gazeX, headTilt,
    lid, mood, wingFlap,
  ]);

  // --- animated props -----------------------------------------------------

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bodyLift.value + breath.value * 1.4 },
      { scale: bodyScale.value * (1 + breath.value * 0.02) },
      { rotate: `${bodyTilt.value}deg` },
    ],
  }));

  const headProps = useAnimatedProps(() => ({ rotation: headTilt.value }));
  const wingLeftProps = useAnimatedProps(() => ({ rotation: -wingFlap.value * 34 }));
  const wingRightProps = useAnimatedProps(() => ({ rotation: wingFlap.value * 34 }));

  /*
   * Eyes span cy 44 ± 12, so 32 to 56.
   *
   * The lid rectangle is 26 tall and must sit *entirely clear* of that when
   * open, or it shaves the top off both eyes permanently — which is exactly
   * what the first version did, and why he looked half-asleep and cross. Open
   * parks its bottom edge at 32 (y = 6); shut puts it at 58 (y = 32).
   */
  const eyeLeftProps = useAnimatedProps(() => ({ ry: 12 * eyeOpen.value }));
  const eyeRightProps = useAnimatedProps(() => ({ ry: 12 * eyeOpen.value }));
  const lidLeftProps = useAnimatedProps(() => ({ y: 6 + lid.value * 26 }));
  const lidRightProps = useAnimatedProps(() => ({ y: 6 + lid.value * 26 }));

  // Pupils track the gaze independently of the head — the strongest single
  // signal that something is behind the eyes.
  const pupilLeftProps = useAnimatedProps(() => ({
    cx: 37 + gazeX.value,
    cy: 45 + gazeY.value,
  }));
  const pupilRightProps = useAnimatedProps(() => ({
    cx: 63 + gazeX.value,
    cy: 45 + gazeY.value,
  }));
  const glintLeftProps = useAnimatedProps(() => ({
    cx: 33.6 + gazeX.value,
    cy: 41 + gazeY.value,
  }));
  const glintRightProps = useAnimatedProps(() => ({
    cx: 59.6 + gazeX.value,
    cy: 41 + gazeY.value,
  }));
  const glintSmallLeftProps = useAnimatedProps(() => ({
    cx: 40 + gazeX.value,
    cy: 49 + gazeY.value,
  }));
  const glintSmallRightProps = useAnimatedProps(() => ({
    cx: 66 + gazeX.value,
    cy: 49 + gazeY.value,
  }));

  const openEyesProps = useAnimatedProps(() => ({ opacity: 1 - happyEyes.value }));
  const happyEyesProps = useAnimatedProps(() => ({ opacity: happyEyes.value }));

  const browLeftProps = useAnimatedProps(() => ({
    y: browLift.value,
    rotation: -browAngle.value,
  }));
  const browRightProps = useAnimatedProps(() => ({
    y: browLift.value,
    rotation: browAngle.value,
  }));

  const beakLowerProps = useAnimatedProps(() => ({ rotation: beakOpen.value * 22 }));

  const eggGroupProps = useAnimatedProps(() => ({ y: eggLift.value }));
  const eggFillProps = useAnimatedProps(() => ({ opacity: eggGlow.value }));

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <Animated.View style={[styles.fill, bodyStyle]}>
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          {grounded ? (
            <Ellipse cx="50" cy="94" rx="21" ry="3.4" fill={colors.ink} opacity={0.1} />
          ) : null}

          {/* The egg it went back for — the meaning of the symbol, and the only
              thing on the bird that glows. */}
          <AnimatedG animatedProps={eggGroupProps}>
            <AnimatedEllipse
              cx="20" cy="80" rx="8" ry="10"
              fill={colors.accentVivid}
              animatedProps={eggFillProps}
            />
            <Ellipse cx="20" cy="80" rx="8" ry="10" fill="none" stroke={colors.accent} strokeWidth={1.6} />
          </AnimatedG>

          {/* Legs tuck away in flight, the way a bird's actually do. */}
          {flying ? null : (
            <>
              <Path d="M44 84 L42 92" stroke={colors.accentDeep} strokeWidth={2.8} strokeLinecap="round" />
              <Path d="M56 84 L58 92" stroke={colors.accentDeep} strokeWidth={2.8} strokeLinecap="round" />
            </>
          )}

          {/* Body: small, so the head reads as oversized. Cartoon proportions
              are what make a character look young and friendly. */}
          <Ellipse cx="50" cy="72" rx="20" ry="16" fill={colors.ink} />

          <AnimatedG originX={31} originY={68} animatedProps={wingLeftProps}>
            <Ellipse cx="27" cy="72" rx="7" ry="11" fill={colors.accentDim} />
          </AnimatedG>
          <AnimatedG originX={69} originY={68} animatedProps={wingRightProps}>
            <Ellipse cx="73" cy="72" rx="7" ry="11" fill={colors.accentDim} />
          </AnimatedG>

          {/* Head — deliberately huge, and everything expressive lives on it. */}
          <AnimatedG originX={50} originY={62} animatedProps={headProps}>
            <Circle cx="50" cy="40" r="31" fill={colors.ink} />


            {/* Open eyes — whites, pupils, glints, and lids that slide over.
                Enormous relative to the head, set low on it, with pupils more
                than half the width of the white. That ratio is the whole of
                "cute": it is infant proportion, and it is why Duo works. */}
            <AnimatedG animatedProps={openEyesProps}>
              <AnimatedEllipse cx="37" cy="44" rx="12.5" ry="12" fill={colors.textOnInk} animatedProps={eyeLeftProps} />
              <AnimatedEllipse cx="63" cy="44" rx="12.5" ry="12" fill={colors.textOnInk} animatedProps={eyeRightProps} />

              <AnimatedCircle cx="37" cy="45" r="7.4" fill={colors.ink} animatedProps={pupilLeftProps} />
              <AnimatedCircle cx="63" cy="45" r="7.4" fill={colors.ink} animatedProps={pupilRightProps} />

              {/* Two glints per eye, one large and one small, offset from each
                  other. A single centred highlight looks like plastic; an
                  offset pair looks wet, which is what reads as alive. */}
              <AnimatedCircle cx="33.6" cy="41" r="3" fill={colors.textOnInk} animatedProps={glintLeftProps} />
              <AnimatedCircle cx="59.6" cy="41" r="3" fill={colors.textOnInk} animatedProps={glintRightProps} />
              <AnimatedCircle cx="40" cy="49" r="1.4" fill={colors.textOnInk} opacity={0.75} animatedProps={glintSmallLeftProps} />
              <AnimatedCircle cx="66" cy="49" r="1.4" fill={colors.textOnInk} opacity={0.75} animatedProps={glintSmallRightProps} />

              {/* Lids: rectangles in the head colour, parked fully clear above
                  each eye and slid down to blink. Cheaper and far more reliable
                  than animating an arc's path data. */}
              <AnimatedRect x="23" y="6" width="28" height="26" fill={colors.ink} animatedProps={lidLeftProps} />
              <AnimatedRect x="49" y="6" width="28" height="26" fill={colors.ink} animatedProps={lidRightProps} />
            </AnimatedG>

            {/* Happy eyes: upward arcs, cross-faded in when celebrating. The
                ^ ^ that reads instantly as joy. */}
            <AnimatedG animatedProps={happyEyesProps}>
              <Path
                d="M28 48 C31 38 43 38 46 48"
                stroke={colors.textOnInk}
                strokeWidth={4.6}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M54 48 C57 38 69 38 72 48"
                stroke={colors.textOnInk}
                strokeWidth={4.6}
                strokeLinecap="round"
                fill="none"
              />
            </AnimatedG>

            {/* Crest, drawn after the lids — the open lids park at y=6, so
                anything above the eyes has to come later in the tree or it
                gets painted over. */}
            <Path d="M50 9 C52 2 58 1 60 5 C57 7 54 10 53 13 Z" fill={colors.accentVivid} />
            <Path d="M44 11 C42 4 36 3 34 7 C37 9 40 11 42 14 Z" fill={colors.accent} />

            {/* Brows: thin, short and high, well clear of the eyes. Heavy brows
                sitting on the lash line is what made the first pass look cross
                — the same reason a furrowed brow reads as anger on a face. */}
            <AnimatedG originX={37} originY={22} animatedProps={browLeftProps}>
              <Rect x="29" y="21" width="15" height="2.8" rx="1.4" fill={colors.accentVivid} />
            </AnimatedG>
            <AnimatedG originX={63} originY={22} animatedProps={browRightProps}>
              <Rect x="56" y="21" width="15" height="2.8" rx="1.4" fill={colors.accentVivid} />
            </AnimatedG>

            {/* Beak: small and low. A big beak steals area from the eyes, and
                the eyes are doing all the work. */}
            <Path d="M45.5 61 L54.5 61 L50 66.5 Z" fill={colors.accentVivid} />
            <AnimatedG originX={50} originY={61.5} animatedProps={beakLowerProps}>
              <AnimatedPath d="M46 61.5 L54 61.5 L50 67 Z" fill={colors.accentDim} />
            </AnimatedG>
          </AnimatedG>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
