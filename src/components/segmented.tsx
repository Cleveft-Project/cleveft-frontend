import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { radius, spacing, typography, useThemedStyles, type Palette } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Fills the width. Off for a control that should hug its labels. */
  block?: boolean;
}

/**
 * A pill switch: a sunken track with one solid thumb sliding between labels.
 *
 * This replaces the row of bordered chips it inherited. The difference matters
 * beyond looks — a set of outlined chips gives every option the same visual
 * weight and asks the reader to spot which border is brighter, while a track
 * with a single filled thumb says "one of these, and it is this one" before any
 * of the labels are read.
 *
 * The thumb is the selected item's own background rather than a separate
 * absolutely-positioned layer, so it cannot drift out of alignment when the
 * labels are different widths.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  block = true,
}: SegmentedProps<T>) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  return (
    <View style={[styles.track, block && styles.trackBlock]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Animated.View
            key={option.value}
            layout={LinearTransition.duration(200)}
            style={block ? styles.slot : undefined}
          >
            <Pressable
              onPress={() => {
                haptics.tap();
                onChange(option.value);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text
                style={[styles.label, selected && styles.labelActive]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSunken,
      borderRadius: radius.pill,
      padding: 4,
      gap: 4,
      alignSelf: 'flex-start',
    },
    trackBlock: {
      alignSelf: 'stretch',
    },
    slot: {
      flex: 1,
    },
    segment: {
      paddingVertical: 9,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: c.fillPrimary,
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
    },
    labelActive: {
      color: c.onFillPrimary,
      fontWeight: '600',
    },
  });
