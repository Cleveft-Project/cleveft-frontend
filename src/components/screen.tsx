import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useThemedStyles, useTheme, type Palette } from '@/theme';

export type BlobTint = 'cyan' | 'violet';

interface ScreenProps {
  children: React.ReactNode;
  /** Which safe-area edges to inset. Tab screens skip the bottom. */
  edges?: readonly Edge[];
  /** Draws the decorative blob in the top-right corner. */
  glow?: boolean;
  /** Which hue that blob takes. Vary it between screens. */
  blob?: BlobTint;
  style?: ViewStyle;
}

/**
 * The base layer for every screen: the page wash, safe-area insets and a
 * decorative blob bleeding off the top-right corner.
 *
 * The blob is a flat disc, not a gradient. A soft radial falloff is invisible
 * at these opacities — it reads as a smudge or as nothing at all — whereas a
 * solid tint cropped by the screen edge reads as a deliberate shape, which is
 * what makes a page look art-directed rather than merely coloured. It is
 * anchored well past the corner so only an arc of it is ever on screen: a blob
 * whose whole outline is visible looks like a stray element.
 */
export function Screen({
  children,
  edges = ['top'],
  glow = true,
  blob = 'cyan',
  style,
}: ScreenProps) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />

      {glow ? (
        <View
          style={[styles.blob, blob === 'violet' ? styles.blobViolet : styles.blobCyan]}
          pointerEvents="none"
        />
      ) : null}

      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    safe: {
      flex: 1,
    },
    blob: {
      position: 'absolute',
      top: -150,
      right: -110,
      width: 300,
      height: 300,
      borderRadius: 999,
    },
    blobCyan: {
      backgroundColor: c.accentSoft,
    },
    blobViolet: {
      backgroundColor: c.violetSoft,
    },
  });
