/**
 * Cleveft design system — light-first, cyan and ink navy, plus a dark
 * counterpart in the same language.
 *
 * Every colour, radius and space in the app comes from here. Screens never
 * hardcode a hex value; that is what kept the previous build drifting into
 * three different blues.
 *
 * ## Reading colours
 *
 * Colours are per-scheme and therefore cannot be read at module scope —
 * `StyleSheet.create` runs once at import and freezes whatever it captured, so
 * a style sheet built from a module-level palette can never change theme. Use
 * {@link useThemedStyles} instead:
 *
 * ```tsx
 * const styles = useThemedStyles(createStyles);
 * // ...
 * const createStyles = (c: Palette) => StyleSheet.create({ … });
 * ```
 *
 * The bare `colors`/`glow`/`gradients` exports below are the light palette,
 * kept so that anything not yet migrated still compiles and renders — it simply
 * stays light. Prefer the hooks in anything new.
 */

export {
  lightColors as colors,
  lightGlow as glow,
  lightGradients as gradients,
  lightColors,
  darkColors,
  palettes,
  glows,
  gradientSets,
  type ColorScheme,
  type Palette,
} from './palettes';

export {
  ThemeProvider,
  useColorScheme,
  useTheme,
  useThemedStyles,
  type GlowSet,
  type GradientSet,
  type StyleFactory,
  type ThemePreference,
} from './context';

/** 4pt grid. Scheme-independent — spacing does not change with the lights. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Bigger than before, across the board.
 *
 * Corner radius is the single cheapest signal of production polish — the gap
 * between a 12pt card and a 24pt one is most of the distance between "student
 * project" and "shipped app". `sm` is for things too small to take a large
 * radius without turning into a blob: checkboxes, tiny badges.
 */
export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * Two weights carry the whole app: 400 for prose, 600–700 for anything that
 * labels or announces. Display type is tightened (negative tracking) because at
 * 32pt the default spacing reads loose and webby rather than typeset.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
} as const;
