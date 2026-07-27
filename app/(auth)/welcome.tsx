import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NeonButton } from '@/components/neon-button';
import { Screen } from '@/components/screen';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

const HIGHLIGHTS = [
  { glyph: '◉', title: 'Record any lecture', copy: 'One tap. Cleveft transcribes it for you.' },
  { glyph: '◈', title: 'Ask your lectures', copy: 'Answers grounded in what your lecturer said.' },
  { glyph: '◆', title: 'Know your gaps', copy: 'Quizzes and readiness scores before the exam.' },
];

export default function WelcomeScreen() {
  const { glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          {/* Cyan on an ink tile, which is the logo itself rather than an
              interpretation of it — the app icon and the first screen the
              student sees should be the same object. */}
          <View style={[styles.mark, glow.lifted]}>
            <Text style={styles.markGlyph}>C</Text>
          </View>

          <Text style={styles.brand}>Cleveft</Text>
          <Text style={styles.tagline}>
            Everything you were taught this semester — organised, connected, and explainable on
            demand.
          </Text>
        </View>

        <View style={styles.highlights}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.title} style={styles.highlight}>
              <View style={styles.highlightGlyphWrap}>
                <Text style={styles.highlightGlyph}>{item.glyph}</Text>
              </View>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightCopy}>{item.copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <NeonButton label="Create your account" onPress={() => router.push('/sign-up')} size="lg" />
          <NeonButton
            label="I already have an account"
            onPress={() => router.push('/login')}
            variant="ghost"
          />
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  mark: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.ink,
  },
  markGlyph: {
    fontSize: 38,
    fontWeight: '800',
    color: c.accentVivid,
  },
  brand: {
    ...typography.display,
    fontSize: 40,
    color: c.text,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.body,
    color: c.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  highlights: {
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  highlightGlyphWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.border,
  },
  highlightGlyph: {
    fontSize: 18,
    color: c.accent,
  },
  highlightText: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  highlightCopy: {
    ...typography.caption,
    color: c.textMuted,
  },
  actions: {
    gap: spacing.md,
  },
});
