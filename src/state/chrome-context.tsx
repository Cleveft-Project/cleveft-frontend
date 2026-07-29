import React, { createContext, useContext } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

interface ChromeContextValue {
  /**
   * How far the floating chrome is out of the way: 0 fully present, 1 shrunk.
   *
   * A shared value rather than React state, deliberately. Scroll direction
   * changes many times a second, and routing that through `setState` would
   * re-render every screen in the tab group on every flick. This stays on the
   * UI thread, so the tab bar animates without React hearing about it at all.
   */
  collapse: SharedValue<number>;
}

const ChromeContext = createContext<ChromeContextValue | null>(null);

/**
 * Lets a scrolling screen push the tab bar out of the way.
 *
 * The screens and the tab bar are siblings — neither can reach the other — so
 * the signal travels through here. Mounted in the tabs layout, above both.
 */
export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const collapse = useSharedValue(0);
  return <ChromeContext.Provider value={{ collapse }}>{children}</ChromeContext.Provider>;
}

/**
 * Null outside the tab group.
 *
 * The quiz, profile and settings screens scroll too but have no tab bar, so
 * they get nothing to drive — and should not crash for want of a provider.
 */
export function useChrome(): ChromeContextValue | null {
  return useContext(ChromeContext);
}

/**
 * A large header that shrinks out of the way as the student reads.
 *
 * The counterpart to the tab bar at the bottom: title goes small and lifts, the
 * bar goes small and sinks, and both return together on the first upward flick.
 *
 * Scale and translate only — never height. Animating a header's height reflows
 * the list beneath it on every frame of a scroll, which is the classic way to
 * make this effect stutter. Transforms cost nothing and the layout never moves,
 * so the content keeps its place while the title above it recedes.
 *
 * @param scale how far it shrinks — 0.14 means down to 86%
 * @param lift  how far it rises, in points
 * @param fade  how much opacity it loses
 */
export function useCollapsingHeader({
  scale = 0.14,
  lift = 10,
  fade = 0.35,
}: { scale?: number; lift?: number; fade?: number } = {}) {
  const chrome = useChrome();

  return useAnimatedStyle(() => {
    if (!chrome) {
      return {};
    }
    const c = chrome.collapse.value;
    return {
      // Origin stays centred, which is right for a centred header and near
      // enough for a left-aligned one at this scale.
      transform: [{ translateY: -c * lift }, { scale: 1 - c * scale }],
      opacity: 1 - c * fade,
    };
  });
}
