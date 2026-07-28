import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { BOUNCY, CELEBRATE, EASE_IN_OUT, GENTLE, SNAPPY } from '@/components/animated/motion';
import { useTheme } from '@/theme';

/**
 * Sankofa — the Cleveft mascot.
 *
 * ## Why this bird
 *
 * Sankofa is the Akan symbol of a bird turning its head backward to retrieve an
 * egg it left behind: *go back and get what you forgot*. That is not a
 * decorative choice. It is a one-image statement of what this app does — reach
 * back into a lecture the student already sat through and retrieve what they
 * missed.
 *
 * A generic owl or blob would have been faster to draw and would have said
 * nothing. This one is recognisable to every student in Ghana on sight, and
 * cannot be copied without looking borrowed.
 *
 * ## Why it is drawn in code
 *
 * No Rive or Lottie file, no export pipeline, no asset to keep in sync with the
 * palette. The bird is built from primitives and coloured from the theme, so it
 * follows light and dark automatically. If it ever needs genuinely
 * character-grade motion — secondary animation, squash and stretch — that is
 * the point to move it to Rive, and the API here (a single `mood` prop) is
 * deliberately the shape a Rive state machine would take.
 *
 * ## Notes for editing the art
 *
 * Everything is inside one 100×100 `viewBox`. Rotations use react-native-svg's
 * `rotation` / `originX` / `originY` props rather than a `transform` array,
 * because the array form is a React Native style concept and is silently
 * ignored on SVG nodes. Translations use `G`'s `x` / `y`.
 */
export type SankofaMood =
  /** Resting. Breathing, occasional blink. */
  | 'idle'
  /** Ear cocked — recording, or waiting for the student to speak. */
  | 'listening'
  /** Working on something: transcribing, generating, answering. */
  | 'thinking'
  /** They got it right. */
  | 'celebrate'
  /** They got it wrong. Sympathetic, never scolding. */
  | 'encourage';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SankofaProps {
  mood?: SankofaMood;
  /** Rendered width and height in points. The art scales from a 100×100 box. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Supply only where the bird carries meaning. Most placements are decorative
   * and the surrounding text already says what is happening, so the default is
   * to hide it from screen readers rather than announce "image" over and over.
   */
  label?: string;
}

export function Sankofa({ mood = 'idle', size = 96, style, label }: SankofaProps) {
  const { colors } = useTheme();

  // Breathing. Always running, slow enough to read as alive rather than as an
  // animation — the difference between a mascot and a logo.
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);

  // Whole-body reaction to a mood change.
  const bodyScale = useSharedValue(1);
  const bodyLift = useSharedValue(0);
  const bodyTilt = useSharedValue(0);

  // The head is separate so it can turn back — the whole point of the symbol.
  const headTurn = useSharedValue(0);

  // The egg: what the bird reaches back for. It glows when knowledge is found.
  const eggGlow = useSharedValue(0.55);
  const eggLift = useSharedValue(0);

  // Wings only move for a reason.
  const wingFlap = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: EASE_IN_OUT }),
        withTiming(0, { duration: 1800, easing: EASE_IN_OUT }),
      ),
      -1,
      false,
    );

    // A long open-eyed hold then two quick frames, so it reads as an occasional
    // blink rather than a flicker.
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600 }),
        withTiming(0.08, { duration: 70 }),
        withTiming(1, { duration: 90 }),
      ),
      -1,
      false,
    );

    return () => {
      // A loop left running on an unmounted screen is the usual reason a mascot
      // quietly costs battery all day.
      cancelAnimation(breath);
      cancelAnimation(blink);
    };
  }, [blink, breath]);

  useEffect(() => {
    switch (mood) {
      case 'celebrate':
        // Three hops, each smaller than the last, with the body squashing on
        // landing. Squash-and-stretch is the difference between a shape moving
        // up and down and a *character* jumping — it costs two extra keyframes
        // and does most of the work.
        bodyLift.value = withSequence(
          withTiming(-34, { duration: 230, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
          withTiming(-20, { duration: 190, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
          withTiming(-9, { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(0, CELEBRATE),
        );
        bodyScale.value = withSequence(
          withTiming(0.9, { duration: 90, easing: EASE_IN_OUT }),   // crouch
          withTiming(1.16, { duration: 200, easing: Easing.out(Easing.quad) }), // launch
          withTiming(0.92, { duration: 170, easing: EASE_IN_OUT }), // land
          withTiming(1.08, { duration: 180 }),
          withSpring(1, CELEBRATE),
        );
        bodyTilt.value = withSequence(
          withTiming(-14, { duration: 200, easing: EASE_IN_OUT }),
          withTiming(11, { duration: 220, easing: EASE_IN_OUT }),
          withTiming(-6, { duration: 190, easing: EASE_IN_OUT }),
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
        // The egg is thrown up and caught — the payoff of the whole symbol.
        eggLift.value = withSequence(
          withTiming(-26, { duration: 250, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
          withSpring(-6, BOUNCY),
          withSpring(0, GENTLE),
        );
        eggGlow.value = withSequence(
          withTiming(1, { duration: 160 }),
          withTiming(0.7, { duration: 300 }),
          withTiming(1, { duration: 200 }),
          withTiming(0.55, { duration: 800 }),
        );
        headTurn.value = withSequence(
          withTiming(-18, { duration: 220, easing: EASE_IN_OUT }),
          withTiming(8, { duration: 240, easing: EASE_IN_OUT }),
          withSpring(0, BOUNCY),
        );
        break;

      case 'encourage':
        // A slow sympathetic tilt — deliberately not a shake. The bird is not
        // telling the student off; a mascot that scolds is what people
        // uninstall during exam week.
        bodyTilt.value = withSequence(
          withTiming(9, { duration: 260, easing: EASE_IN_OUT }),
          withTiming(-3, { duration: 260, easing: EASE_IN_OUT }),
          withSpring(0, GENTLE),
        );
        headTurn.value = withSequence(
          withTiming(12, { duration: 300, easing: EASE_IN_OUT }),
          withSpring(0, GENTLE),
        );
        bodyScale.value = withSequence(
          withTiming(0.96, { duration: 200 }),
          withSpring(1, GENTLE),
        );
        break;

      case 'thinking':
        bodyTilt.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 620, easing: EASE_IN_OUT }),
            withTiming(5, { duration: 620, easing: EASE_IN_OUT }),
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
        headTurn.value = withSpring(-14, GENTLE);
        break;

      case 'listening':
        // Head turned back — the Sankofa pose proper — but *bobbing*, as though
        // following what is being said. Holding the pose still, which is what
        // this did before, reads as a paused animation rather than attention.
        headTurn.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 520, easing: EASE_IN_OUT }),
            withTiming(-14, { duration: 620, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        bodyLift.value = withRepeat(
          withSequence(
            withTiming(-7, { duration: 520, easing: EASE_IN_OUT }),
            withTiming(0, { duration: 620, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        bodyTilt.value = withRepeat(
          withSequence(
            withTiming(-4, { duration: 900, easing: EASE_IN_OUT }),
            withTiming(4, { duration: 900, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        // The egg brightens in time with the bob: something is being captured.
        eggGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 520, easing: EASE_IN_OUT }),
            withTiming(0.6, { duration: 620, easing: EASE_IN_OUT }),
          ),
          -1,
          true,
        );
        break;

      case 'idle':
      default:
        bodyTilt.value = withSpring(0, GENTLE);
        headTurn.value = withSpring(0, GENTLE);
        bodyLift.value = withSpring(0, GENTLE);
        bodyScale.value = withSpring(1, SNAPPY);
        eggGlow.value = withTiming(0.55, { duration: 400 });
        eggLift.value = withSpring(0, GENTLE);
        wingFlap.value = withTiming(0, { duration: 200 });
        break;
    }

    return () => {
      // Only the looping moods need cancelling; springs settle by themselves.
      if (mood === 'thinking' || mood === 'listening') {
        cancelAnimation(bodyTilt);
        cancelAnimation(eggGlow);
        cancelAnimation(bodyLift);
        cancelAnimation(headTurn);
      }
      if (mood === 'celebrate') {
        cancelAnimation(wingFlap);
      }
    };
  }, [bodyLift, bodyScale, bodyTilt, eggGlow, eggLift, headTurn, mood, wingFlap]);

  /*
   * Idle breaks — the single technique that separates a mascot from a sticker.
   *
   * A character that only reacts when poked is furniture between pokes. Duo
   * works because it does things *nobody asked for*: it looks around, it
   * shifts its weight, it fidgets. The screen is never quite still, so the eye
   * keeps treating it as a creature rather than an icon.
   *
   * So every few seconds an idle bird picks one small unprompted action. The
   * interval is randomised because a fidget on an exact metronome reads as a
   * loop, and a loop is the thing being avoided.
   */
  useEffect(() => {
    if (mood !== 'idle') {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      // 2.4–5.2s. Long enough not to nag, short enough that the bird is never
      // still for long.
      timer = setTimeout(() => {
        switch (Math.floor(Math.random() * 4)) {
          case 0:
            // A hop, with a crouch before and a squash on landing.
            bodyScale.value = withSequence(
              withTiming(0.93, { duration: 110, easing: EASE_IN_OUT }),
              withTiming(1.08, { duration: 170, easing: Easing.out(Easing.quad) }),
              withTiming(0.96, { duration: 140, easing: EASE_IN_OUT }),
              withSpring(1, BOUNCY),
            );
            bodyLift.value = withSequence(
              withTiming(-18, { duration: 200, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
              withSpring(0, BOUNCY),
            );
            break;

          case 1:
            // Looks back over its shoulder, then front again — the symbol,
            // performed unprompted.
            headTurn.value = withSequence(
              withTiming(-28, { duration: 460, easing: EASE_IN_OUT }),
              withTiming(-24, { duration: 700, easing: EASE_IN_OUT }),
              withTiming(7, { duration: 420, easing: EASE_IN_OUT }),
              withSpring(0, GENTLE),
            );
            eggGlow.value = withSequence(
              withTiming(0.95, { duration: 500 }),
              withTiming(0.55, { duration: 700 }),
            );
            break;

          case 2:
            // Shakes out its wings.
            wingFlap.value = withRepeat(
              withSequence(
                withTiming(0.8, { duration: 110, easing: EASE_IN_OUT }),
                withTiming(0, { duration: 110, easing: EASE_IN_OUT }),
              ),
              3,
              false,
            );
            bodyTilt.value = withSequence(
              withTiming(4, { duration: 150, easing: EASE_IN_OUT }),
              withTiming(-4, { duration: 150, easing: EASE_IN_OUT }),
              withSpring(0, BOUNCY),
            );
            break;

          default:
            // Shifts its weight — the smallest of the four, so the fidgets are
            // not all equally loud.
            bodyTilt.value = withSequence(
              withTiming(-7, { duration: 520, easing: EASE_IN_OUT }),
              withTiming(5, { duration: 620, easing: EASE_IN_OUT }),
              withSpring(0, GENTLE),
            );
            break;
        }

        scheduleNext();
      }, 2400 + Math.random() * 2800);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [bodyLift, bodyScale, bodyTilt, eggGlow, headTurn, mood, wingFlap]);

  // The whole-body transform lives on a React Native view wrapping the SVG,
  // which is both cheaper and far less fiddly than transforming a root <G>.
  const bodyStyle = useAnimatedStyle(() => {
    const breathe = 1 + breath.value * 0.022;
    return {
      transform: [
        { translateY: bodyLift.value + breath.value * 1.6 },
        { scale: bodyScale.value * breathe },
        { rotate: `${bodyTilt.value}deg` },
      ],
    };
  });

  // Pivots about the neck joint, not the art's centre — a head rotating around
  // the wrong point reads as detached.
  const headProps = useAnimatedProps(() => ({ rotation: headTurn.value }));
  const wingProps = useAnimatedProps(() => ({ rotation: -wingFlap.value * 26 }));
  const eggGroupProps = useAnimatedProps(() => ({ y: eggLift.value }));
  const eggFillProps = useAnimatedProps(() => ({ opacity: eggGlow.value }));
  const pupilProps = useAnimatedProps(() => ({ ry: 3.4 * blink.value }));
  const glintProps = useAnimatedProps(() => ({ r: 1.2 * blink.value }));

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
          {/* Ground shadow, so the bird sits somewhere rather than floating. */}
          <Ellipse cx="50" cy="88" rx="22" ry="4" fill={colors.ink} opacity={0.1} />

          {/* The egg being retrieved: the meaning of the symbol, and the only
              element that glows, because it stands for the recovered lecture. */}
          <AnimatedG animatedProps={eggGroupProps}>
            <AnimatedEllipse
              cx="27"
              cy="70"
              rx="9"
              ry="11"
              fill={colors.accentVivid}
              animatedProps={eggFillProps}
            />
            <Ellipse
              cx="27"
              cy="70"
              rx="9"
              ry="11"
              fill="none"
              stroke={colors.accent}
              strokeWidth={1.6}
            />
          </AnimatedG>

          {/* Legs */}
          <Path d="M46 78 L44 88" stroke={colors.accentDeep} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M56 78 L58 88" stroke={colors.accentDeep} strokeWidth={2.6} strokeLinecap="round" />

          {/* Body — a teardrop leaning forward, the way a bird actually stands. */}
          <Path
            d="M51 32 C68 32 78 46 78 60 C78 74 66 80 51 80 C36 80 26 72 26 59 C26 45 36 32 51 32 Z"
            fill={colors.ink}
          />

          {/* Wing, hinged at the shoulder so a flap rotates rather than slides. */}
          <AnimatedG originX={44} originY={52} animatedProps={wingProps}>
            <Path
              d="M44 50 C56 46 68 52 70 62 C64 70 50 70 44 62 Z"
              fill={colors.accentDim}
              opacity={0.95}
            />
          </AnimatedG>

          {/* Tail, opposite the head, so the backward turn reads clearly. */}
          <Path d="M78 56 C88 50 92 56 90 64 C86 70 80 68 77 64 Z" fill={colors.accentDeep} />

          {/* Head, turned back over the shoulder — the Sankofa pose. */}
          <AnimatedG originX={62} originY={38} animatedProps={headProps}>
            <Circle cx="62" cy="30" r="15" fill={colors.ink} />
            {/* Beak, pointing back toward the egg. */}
            <Path d="M49 30 L38 35 L49 38 Z" fill={colors.accentVivid} />
            {/* Eye: sclera, blinking pupil, and a glint that closes with it. */}
            <Circle cx="58" cy="26" r="5.4" fill={colors.textOnInk} />
            <AnimatedEllipse
              cx="56.5"
              cy="26"
              rx="3.4"
              ry="3.4"
              fill={colors.ink}
              animatedProps={pupilProps}
            />
            <AnimatedCircle
              cx="55.2"
              cy="24.6"
              r="1.2"
              fill={colors.textOnInk}
              animatedProps={glintProps}
            />
            {/* Crest — two feathers, the flourish that makes it a character
                rather than a silhouette. */}
            <Path d="M64 15 C66 9 70 8 72 11 C70 13 68 15 67 18 Z" fill={colors.accentVivid} />
            <Path d="M69 18 C73 13 77 14 78 17 C75 19 72 20 70 22 Z" fill={colors.accent} />
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
