import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

/**
 * Shared entrance choreography.
 *
 * A single source for how content arrives on screen keeps every list and card
 * moving to the same rhythm. Two knobs matter:
 *
 * - {@link ENTRANCE_BASE_DELAY} holds the first item back until the hero
 *   greeting has begun settling, so the screen reads top-to-bottom rather than
 *   everything arriving at once.
 * - {@link ENTRANCE_STEP} is the gap between successive items. ~60ms is the
 *   sweet spot: enough to perceive the cascade, short enough that a long list
 *   never feels like it is being withheld.
 */
/*
 * Fluidity comes from how long each card takes to travel, not from how long
 * the cascade runs. Cutting the duration to 230ms made every card *snap* into
 * place — technically faster, but it lost the glide entirely. The lever that
 * mattered for the sluggishness was elsewhere (spring layout transitions
 * re-animating on every data arrival), not here.
 *
 * So: a generous per-card duration for the glide, a tight stagger and a short
 * hold so the whole thing is still done in ~750ms.
 */
export const ENTRANCE_BASE_DELAY = 60;
export const ENTRANCE_STEP = 50;
const ENTRANCE_DURATION = 340;
/** Decelerating, so each card arrives easing to a stop rather than halting. */
const ENTRANCE_EASING = Easing.out(Easing.cubic);
/** Far enough that the travel is legible; short enough that it never lurches. */
const ENTRANCE_TRAVEL = 18;

/**
 * A staggered fade-and-slide for the item at {@link index}.
 *
 * ```tsx
 * <Animated.View entering={staggeredEntrance(0)}>…</Animated.View>
 * <Animated.View entering={staggeredEntrance(1)}>…</Animated.View>
 * ```
 */
export function staggeredEntrance(index: number, baseDelay: number = ENTRANCE_BASE_DELAY) {
  return FadeInDown.delay(baseDelay + index * ENTRANCE_STEP)
    .duration(ENTRANCE_DURATION)
    .easing(ENTRANCE_EASING)
    .withInitialValues({ transform: [{ translateY: ENTRANCE_TRAVEL }] });
}

/**
 * A plainer fade for content that should not also travel — long transcript
 * bodies, chat bubbles mid-stream — where a slide would read as jitter.
 */
export function fadeEntrance(index = 0, baseDelay = 0) {
  return FadeIn.delay(baseDelay + index * ENTRANCE_STEP)
    .duration(ENTRANCE_DURATION)
    .easing(ENTRANCE_EASING);
}

/**
 * The layout transition for containers that grow, shrink, or reorder — an
 * expanding card, a list gaining a row, a tab swapping its contents. Springy so
 * the reflow settles with a little life rather than a linear glide.
 */
export const smoothLayout = LinearTransition.springify().damping(18).stiffness(140);

export { Animated, FadeIn, FadeInDown, LinearTransition };
