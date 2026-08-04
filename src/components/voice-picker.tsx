import { Ionicons } from '@expo/vector-icons';
import type * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/components/animated/haptics';
import { availableVoices, previewVoice } from '@/components/kofi-says';
import { Sheet } from '@/components/sheet';
import { useFeedback } from '@/state/feedback-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * Choose the voice Kofi speaks in.
 *
 * <p>Cleveft used to pick for you: the first installed voice matching a
 * preferred locale. That is a coin toss — Android ships several voices per
 * locale and they range from modern neural ones to a decade-old formant
 * synthesiser, all reporting the same language code. Landing on a bad one made
 * the whole feature feel cheap, and there was no way out except turning speech
 * off entirely.
 *
 * <p>Every row previews on tap rather than on a separate play button. Choosing a
 * voice is choosing a sound, so hearing it *is* the interaction — a list you
 * have to audition through a secondary control makes you press twice for every
 * candidate.
 */

/**
 * Four speeds, named rather than numbered.
 *
 * <p>"0.75×" means nothing to a student deciding whether Kofi talks too fast.
 * The slow end exists for anyone reading along with the words, which is one of
 * the groups Cleveft is explicitly for.
 */
const RATES = [
  { label: 'Slow', value: 0.72 },
  { label: 'Normal', value: 0.95 },
  { label: 'Brisk', value: 1.15 },
  { label: 'Fast', value: 1.35 },
] as const;

/** Turns "en-GB" into something a person would say. */
function localeLabel(language?: string): string {
  if (!language) {
    return 'English';
  }
  const region = language.split(/[-_]/)[1]?.toUpperCase();
  const names: Record<string, string> = {
    GB: 'British',
    US: 'American',
    AU: 'Australian',
    IN: 'Indian',
    IE: 'Irish',
    GH: 'Ghanaian',
    NG: 'Nigerian',
    ZA: 'South African',
    KE: 'Kenyan',
    CA: 'Canadian',
    NZ: 'New Zealand',
  };
  return region ? (names[region] ?? region) : 'English';
}

/**
 * Voice identifiers are not written for people — Android reports things like
 * "en-gb-x-gbb-network". The locale is the part a student actually chooses on,
 * so it leads, and the raw name is reduced to a distinguishing suffix.
 */
function voiceLabel(voice: Speech.Voice, index: number): string {
  return `${localeLabel(voice.language)} ${index + 1}`;
}

export function VoicePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { voice } = useFeedback();

  const [voices, setVoices] = useState<Speech.Voice[] | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let active = true;
    void availableVoices().then((list) => {
      if (active) {
        setVoices(list);
      }
    });
    return () => {
      active = false;
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const choose = (id: string | null) => {
    haptics.tap();
    voice.setId(id);
    // Automatic previews too, using whatever it resolves to — otherwise the one
    // option a student might return to is the only one they cannot hear.
    previewVoice(id ?? undefined, voice.rate);
  };

  const setRate = (rate: number) => {
    haptics.tap();
    voice.setRate(rate);
    // Speaks at the new pace immediately. A speed control you cannot hear the
    // effect of is guesswork.
    previewVoice(voice.id ?? undefined, rate);
  };

  // Numbered per locale, so "British 1" and "British 2" are distinguishable
  // without showing the student an identifier string.
  const counters = new Map<string, number>();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <>
        <View style={styles.head}>
          <Text style={styles.title}>Kofi&apos;s voice</Text>
          <Text style={styles.subtitle}>Tap any voice to hear it.</Text>
        </View>

        {voices === null ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        ) : voices.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.empty}>
              This device has no English voices installed. Add one in your phone&apos;s
              text-to-speech settings and it will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listWrap}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Automatic stays available, and stays first. Someone who dislikes
                every option should be able to get back to the default without
                reinstalling. */}
            <Row
              label="Automatic"
              detail="Cleveft picks the closest British voice"
              selected={voice.id === null}
              onPress={() => choose(null)}
            />

            {voices.map((item) => {
              const locale = localeLabel(item.language);
              const seen = counters.get(locale) ?? 0;
              counters.set(locale, seen + 1);

              return (
                <Row
                  key={item.identifier}
                  label={voiceLabel(item, seen)}
                  detail={item.quality === 'Enhanced' ? 'Enhanced quality' : item.language}
                  selected={voice.id === item.identifier}
                  onPress={() => choose(item.identifier)}
                />
              );
            })}
          </ScrollView>
        )}

        {/* Pace sits with the voice because they are one decision: a voice that
            sounds right at one speed sounds wrong at another. */}
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Speed</Text>
          <View style={styles.rateOptions}>
            {RATES.map((option) => {
              const active = Math.abs(voice.rate - option.value) < 0.01;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => setRate(option.value)}
                  style={[styles.rateChip, active && styles.rateChipActive]}
                  // The chip is about 32pt tall for the sake of the layout, well
                  // under the ~48pt a fingertip actually covers. hitSlop keeps
                  // the look and gives the touch the area it needs — without it
                  // a tap that visually lands on the chip misses the view.
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.rateChipText, active && styles.rateChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={onClose} style={styles.done} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </>
    </Sheet>
  );
}

function Row({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
      ) : (
        <Ionicons name="play-circle-outline" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  /*
   * The backdrop, sheet chrome and grabber all live in Sheet now. What is left
   * here is only this picker's own content — which is the point of having moved
   * them: an overlay that dims a band in the middle of the screen is what you
   * get when every sheet rolls its own.
   */
  head: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  /*
   * Bounded, or a device with twenty voices installed pushes Speed and Done off
   * the bottom of the sheet. The sheet caps its own height, but a child that
   * wants to be tall still needs telling.
   */
  listWrap: {
    maxHeight: 260,
  },
  title: {
    ...typography.heading,
    color: c.text,
  },
  subtitle: {
    ...typography.micro,
    color: c.textMuted,
  },
  state: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    ...typography.caption,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  rowSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    ...typography.bodyStrong,
    color: c.text,
  },
  rowDetail: {
    ...typography.micro,
    color: c.textMuted,
  },
  rateRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderMuted,
    marginTop: spacing.sm,
  },
  rateLabel: {
    ...typography.micro,
    color: c.textMuted,
    paddingTop: spacing.md,
  },
  rateOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rateChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: c.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  rateChipActive: {
    backgroundColor: c.fillPrimary,
    borderColor: c.fillPrimary,
  },
  rateChipText: {
    ...typography.caption,
    color: c.textSecondary,
  },
  rateChipTextActive: {
    color: c.onFillPrimary,
    fontWeight: '600',
  },
  done: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneText: {
    ...typography.bodyStrong,
    color: c.accent,
  },
});
