/**
 * The two palettes.
 *
 * Both define exactly the same keys, so anything reading a colour works in
 * either scheme without a single conditional. A key that only makes sense in
 * one scheme is a design bug — it means a screen has hardcoded an assumption
 * about which one is active.
 *
 * ## The design language
 *
 * Light-first. A cool near-white page, opaque white cards lifted by soft
 * shadow, deep ink navy for structure and display type, and cyan used sparingly
 * — active states and data, not decoration. Restraint is what reads as
 * premium; an accent stops meaning "look here" the moment six things wear it.
 *
 * Dark is not this palette inverted, and it is deliberately not neon. It is the
 * same room with the lights off: deeper surfaces, the same cyan, shadow
 * replaced by separation between surface levels.
 *
 * ## Why some keys look redundant
 *
 * `accent` and `accentVivid` differ because one colour cannot do both jobs. On
 * a white card, a cyan bright enough to make a progress bar sing fails contrast
 * as text. So `accent` is always the readable one (text, icons) and
 * `accentVivid` is the saturated fill (bars, active pills).
 *
 * `fillPrimary` / `onFillPrimary` exist for the same reason at scheme level. In
 * light the primary button is ink navy; in dark, navy on near-black is mud, so
 * it becomes cyan. Encoding that here keeps every button component scheme-blind
 * rather than sprinkling `scheme === 'dark' ? …` through the UI.
 */

export type ColorScheme = 'light' | 'dark';

/**
 * Widened to `string` on purpose. `as const` below is what gives the light
 * palette useful autocomplete, but it also makes every value its own literal
 * type — so `bg` would be the type `'#F4F7F9'` and no other colour could ever
 * satisfy it. Mapping the keys keeps the shape while letting a second palette
 * fill it with different values.
 */
export type Palette = { [K in keyof typeof lightColors]: string };

interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Elevation, not glow.
 *
 * Named by role rather than size so a card does not have to know whether it is
 * currently the 2 or the 3 on some abstract scale.
 */
export interface GlowSet {
  /** Strongest — floating chrome: the tab bar, a primary button. */
  accent: ShadowStyle;
  /** Mid — an emphasised or interactive card. */
  accentSoft: ShadowStyle;
  /** The default resting card. Barely there by design. */
  card: ShadowStyle;
  /** A dark hero slab that has to sit above everything near it. */
  lifted: ShadowStyle;
}

/** LinearGradient needs at least two stops, hence the tuple head. */
export type GradientStops = readonly [string, string, ...string[]];

export interface GradientSet {
  screen: GradientStops;
  /** Soft wash bled behind the top of a scroll view. */
  accentGlow: GradientStops;
  accentButton: GradientStops;
  card: GradientStops;
  /** The ink hero on the home screen. */
  hero: GradientStops;
  /**
   * The page colour fading to nothing, for the top and bottom of a scroll
   * view — content dissolves into the edge instead of being cut off by it.
   *
   * Must be the page colour at full opacity fading to *the same colour* at
   * zero, not to `transparent`. Fading to transparent interpolates through
   * transparent black, which reads as a grey smear on a light page.
   */
  edgeFade: GradientStops;
}

export const lightColors = {
  /** Deepest layer — the page itself. Cool, never pure white. */
  bg: '#F4F7F9',
  /** One step up: cards and sheets. */
  bgElevated: '#FFFFFF',
  /** Faint cyan wash used at the top of scroll views. */
  bgTint: '#EAF3F6',

  /**
   * Opaque, not glass. Translucency over a busy scroll region costs a blend per
   * frame and reads as grey haze rather than depth on a light ground — the
   * shadow does that job now.
   */
  surface: '#FFFFFF',
  surfaceSolid: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  /** Inputs, inert chips, empty progress tracks. */
  surfaceSunken: '#EBF1F4',

  /**
   * Ink: the structural dark. Hero slabs, the tab bar, solid buttons, display
   * type. Doing this work in near-black rather than in cyan is what keeps the
   * cyan meaningful.
   */
  ink: '#0E1B2A',
  textOnInk: '#FFFFFF',
  textOnInkMuted: '#8FA6B6',
  /**
   * A chip raised *on* an ink slab — the inactive circles in the tab bar.
   *
   * It flips rather than shifts between schemes. On a navy bar a raised chip is
   * white; on the dark scheme's slate bar, white would be a row of headlights,
   * so it becomes a lighter slate. Same role, opposite direction, which is
   * exactly the sort of thing that belongs in the palette and not in a
   * component.
   */
  inkElevated: '#FFFFFF',
  onInkElevated: '#0E1B2A',

  /** What a primary button is filled with, and what sits on top of it. */
  fillPrimary: '#0E1B2A',
  onFillPrimary: '#FFFFFF',
  /**
   * Secondary text on that fill. Its own token rather than a reuse of
   * `textOnInkMuted`, because the fill is ink in one scheme and cyan in the
   * other — a muted colour that works on navy is illegible on cyan.
   */
  onFillPrimaryMuted: '#93AABA',

  /**
   * Borders are near-invisible here. On a light ground, depth comes from shadow
   * and surface contrast; a visible outline on every card is what made the old
   * build look like a wireframe.
   */
  border: '#E3EAEF',
  borderStrong: '#C6D6DE',
  borderMuted: '#EDF2F5',

  /** Readable cyan. Text, icons, a number you are meant to read. */
  accent: '#06707E',
  /** Saturated cyan. Fills only — bars, active pills, the mic. */
  accentVivid: '#00C2D1',
  accentDim: '#0E97A8',
  accentDeep: '#05545F',
  /** Tinted fills behind accent text and icons. */
  accentSoft: '#DFF7FA',
  accentSofter: '#EFFBFD',

  /** Secondary hue. Decorative blobs and a second icon-chip tint. */
  violet: '#4A3E9E',
  violetSoft: '#EDE9FB',

  text: '#0E1B2A',
  textSecondary: '#48606F',
  textMuted: '#7D91A0',
  textOnAccent: '#04333A',

  danger: '#C7442F',
  dangerSoft: '#FBEAE6',
  warning: '#B0741A',
  warningSoft: '#FBF0DE',
  info: '#1E6FB8',

  /** Waveform bars. */
  wave: '#00C2D1',
  waveDim: '#9FE3EB',
} as const;

export const darkColors: Palette = {
  /**
   * True black, and neutral — no blue cast.
   *
   * The earlier dark palette was a blue-grey charcoal, on the theory that a
   * navy tint would keep the brand family recognisable. On a phone it just read
   * as "dim navy": the page never looked black because it wasn't. Sampling the
   * Spotify reference settles it — its page is #111111 and its greys are
   * perfectly neutral, so nothing competes with the artwork. Same logic here:
   * the cyan is the only colour on screen, and it is far louder against real
   * black than against a colour that is already slightly blue.
   *
   * Pure #000 for the page also costs nothing on the OLED panels most students
   * carry, and gives the biggest possible step up to the cards.
   */
  bg: '#000000',
  bgElevated: '#121212',
  bgTint: '#0A0A0A',

  // Cards sit one step off black. The gap is deliberately small: separation
  // comes mostly from the spacing between cards, exactly as it does in the
  // reference, so the overall impression stays "black" rather than "grey".
  surface: '#121212',
  surfaceSolid: '#121212',
  surfaceRaised: '#1C1C1C',
  surfaceSunken: '#0A0A0A',

  // Ink inverts its job in the dark. A navy slab on a black page has nothing to
  // say, so the structural surface becomes a *lifted* neutral — still the
  // darkest thing in its neighbourhood on light, still the lightest here.
  ink: '#1C1C1C',
  textOnInk: '#F5F5F5',
  textOnInkMuted: '#9A9A9A',
  inkElevated: '#2E2E2E',
  onInkElevated: '#EDEDED',

  // The one real inversion: a navy button on a dark page is invisible, so the
  // primary action takes the cyan instead.
  fillPrimary: '#22D3EE',
  onFillPrimary: '#052730',
  onFillPrimaryMuted: '#0A5967',

  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(45, 212, 230, 0.34)',
  borderMuted: 'rgba(255, 255, 255, 0.06)',

  // Brighter than light mode's cyan for the same reason light mode's is
  // darker: contrast is measured against the surface, not against taste.
  accent: '#2DD4E6',
  accentVivid: '#22D3EE',
  accentDim: '#0FA3B8',
  accentDeep: '#0A7E8F',
  accentSoft: 'rgba(45, 212, 230, 0.14)',
  accentSofter: 'rgba(45, 212, 230, 0.07)',

  violet: '#A79BF5',
  violetSoft: 'rgba(126, 110, 232, 0.18)',

  // Neutral greys, for the same reason as the surfaces. A blue-tinted secondary
  // grey on a neutral black is the tell that a dark theme was derived from a
  // light one rather than designed.
  text: '#F5F5F5',
  textSecondary: '#B3B3B3',
  // #8A8A8A rather than the #7A7A7A this started as. Muted carries captions and
  // meta lines at 11-13pt, which is small text, so it needs 4.5:1 against the
  // surface it sits on — and it sits on cards (#121212) and raised rows
  // (#1C1C1C), not on the page. Measured against the darkest of those, #7A7A7A
  // came out at 3.97:1 and would have shipped as unreadable metadata.
  textMuted: '#8A8A8A',
  textOnAccent: '#052730',

  danger: '#F2705A',
  dangerSoft: 'rgba(242, 112, 90, 0.14)',
  warning: '#E0A63B',
  warningSoft: 'rgba(224, 166, 59, 0.14)',
  info: '#4BA8E8',

  wave: '#22D3EE',
  waveDim: 'rgba(34, 211, 238, 0.30)',
};

/**
 * Light-mode elevation.
 *
 * Tinted toward the page's own blue-grey rather than pure black — a neutral
 * shadow on a cool ground reads as dirt. Tight and shallow: the difference
 * between "premium" and "2013 Material demo" is mostly shadow restraint.
 */
export const lightGlow: GlowSet = {
  accent: {
    shadowColor: 'rgba(14, 27, 42, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  accentSoft: {
    shadowColor: 'rgba(14, 27, 42, 1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    shadowColor: 'rgba(14, 27, 42, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  lifted: {
    shadowColor: 'rgba(14, 27, 42, 1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 10,
  },
};

/**
 * Dark-mode elevation.
 *
 * A shadow is the absence of light, so on a dark page it barely registers —
 * most of the separation has to come from the surface steps in the palette
 * above. These stay for the floating chrome, where a real cast shadow still
 * tells you the tab bar is above the list scrolling under it.
 */
export const darkGlow: GlowSet = {
  accent: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  accentSoft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 2,
  },
  lifted: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 10,
  },
};

/**
 * Background gradients, top to bottom.
 *
 * Nearly flat on purpose. The ground should read as one colour; the gradient
 * exists only to keep a long scroll from looking like a flat swatch.
 */
export const lightGradients: GradientSet = {
  screen: ['#EAF3F6', '#F4F7F9', '#F4F7F9'] as const,
  accentGlow: ['rgba(0, 194, 209, 0.10)', 'rgba(0, 194, 209, 0)'] as const,
  accentButton: ['#0E1B2A', '#0E1B2A'] as const,
  card: ['#FFFFFF', '#FFFFFF'] as const,
  hero: ['#16293C', '#0E1B2A'] as const,
  // The page's own #F4F7F9, fading out.
  edgeFade: ['rgba(244, 247, 249, 1)', 'rgba(244, 247, 249, 0)'] as const,
};

export const darkGradients: GradientSet = {
  // Flat black. The light theme's page gradient exists to stop a long scroll
  // reading as one dead swatch, but black does not have that problem — a
  // gradient here would only reintroduce the grey haze this palette removes.
  screen: ['#000000', '#000000', '#000000'] as const,
  accentGlow: ['rgba(34, 211, 238, 0.12)', 'rgba(34, 211, 238, 0)'] as const,
  accentButton: ['#22D3EE', '#0FA3B8'] as const,
  card: ['#121212', '#121212'] as const,
  hero: ['#1F1F1F', '#171717'] as const,
  // True black, fading out.
  edgeFade: ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0)'] as const,
};

export const palettes: Record<ColorScheme, Palette> = {
  dark: darkColors,
  light: lightColors,
};

export const glows: Record<ColorScheme, GlowSet> = {
  dark: darkGlow,
  light: lightGlow,
};

export const gradientSets: Record<ColorScheme, GradientSet> = {
  dark: darkGradients,
  light: lightGradients,
};
