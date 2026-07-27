import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import {
  gradientSets,
  glows,
  palettes,
  type ColorScheme,
  type GlowSet,
  type GradientSet,
  type Palette,
} from './palettes';

/** 'system' follows the OS; the other two pin it. */
export type ThemePreference = ColorScheme | 'system';

const STORAGE_KEY = 'cleveft.themePreference';

interface ThemeContextValue {
  scheme: ColorScheme;
  preference: ThemePreference;
  colors: Palette;
  glow: GlowSet;
  gradients: GradientSet;
  isDark: boolean;
  setPreference(preference: ThemePreference): void;
  /** Flips between light and dark, pinning the result. */
  toggle(): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * SecureStore has no web build, and a theme choice is not a secret anyway —
 * but reusing the one storage helper the app already has avoids adding a second
 * persistence dependency for a single string.
 */
async function loadPreference(): Promise<ThemePreference | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
        : await SecureStore.getItemAsync(STORAGE_KEY);

    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null;
  } catch {
    return null;
  }
}

async function savePreference(preference: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(STORAGE_KEY, preference);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, preference);
  } catch {
    // A theme that fails to persist is a small annoyance, not an error worth
    // interrupting the student over.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');

  // Restore asynchronously and let the app render dark meanwhile. Blocking the
  // first frame on a disk read to avoid a brief flash trades a guaranteed delay
  // for an occasional one.
  useEffect(() => {
    let cancelled = false;
    void loadPreference().then((stored) => {
      if (!cancelled && stored) {
        setPreferenceState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? ((systemScheme ?? 'dark') as ColorScheme) : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void savePreference(next);
  }, []);

  // Keeps native surfaces the app does not draw — the keyboard, the share
  // sheet, the overscroll glow — in step with the chosen scheme, rather than
  // whatever the OS is set to.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // The resolved scheme rather than the preference: RN's type has no
      // "follow the system" value, and on 'system' the resolved scheme already
      // *is* the system's, so setting it explicitly is a no-op rather than an
      // override.
      Appearance.setColorScheme(scheme);
    }
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      colors: palettes[scheme],
      glow: glows[scheme],
      gradients: gradientSets[scheme],
      isDark: scheme === 'dark',
      setPreference,
      // Deliberately pins rather than cycling back to 'system': someone who
      // reaches for the switch is overriding their OS on purpose.
      toggle: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}

export function useColorScheme(): ColorScheme {
  return useTheme().scheme;
}

/**
 * Builds a style sheet for the active palette.
 *
 * `StyleSheet.create` at module scope captures colours once, at import — which
 * is exactly why a themeable app cannot use it for anything coloured. Passing a
 * factory instead defers creation to render time, and the cache below means the
 * sheet is still built only once per scheme rather than on every render.
 *
 * ```tsx
 * const styles = useThemedStyles(createStyles);
 * const createStyles = (c: Palette) => StyleSheet.create({ … });
 * ```
 */
const styleCache = new WeakMap<object, Partial<Record<ColorScheme, unknown>>>();

export type { GlowSet, GradientSet };

/**
 * Colours and elevation are passed as `c` and `g` deliberately: a themed sheet
 * mentions them on nearly every line, and `colors.textSecondary` repeated forty
 * times buries the property name that actually varies.
 */
export type StyleFactory<T> = (c: Palette, g: GlowSet, scheme: ColorScheme) => T;

export function useThemedStyles<T>(factory: StyleFactory<T>): T {
  const { scheme } = useTheme();

  return useMemo(() => {
    let perScheme = styleCache.get(factory);
    if (!perScheme) {
      perScheme = {};
      styleCache.set(factory, perScheme);
    }
    if (!perScheme[scheme]) {
      perScheme[scheme] = factory(palettes[scheme], glows[scheme], scheme);
    }
    return perScheme[scheme] as T;
  }, [factory, scheme]);
}
