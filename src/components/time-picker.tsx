import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useHaptics } from '@/components/animated/haptics';
import { NeonButton } from '@/components/neon-button';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/** Row height, and therefore the snap interval. */
const ITEM = 44;

/** Rows visible above and below the selected one. */
const PADDING_ROWS = 1;

const WHEEL_HEIGHT = ITEM * (PADDING_ROWS * 2 + 1);

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['am', 'pm'];

/** Renders "19:00" as "7:00 pm". Storage stays 24-hour; only the label changes. */
export function formatTime(value: string): string {
  const [rawHour, minute] = value.split(':');
  const hour = Number(rawHour);
  const suffix = hour < 12 ? 'am' : 'pm';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

function parse(value: string) {
  const [rawHour, rawMinute] = value.split(':');
  const hour24 = Number(rawHour);
  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: Number(rawMinute),
    period: hour24 < 12 ? 'am' : 'pm',
  };
}

function build(hour: number, minute: number, period: string): string {
  // 12am is 00 and 12pm is 12 — the two cases naive arithmetic gets wrong.
  let hour24 = hour % 12;
  if (period === 'pm') {
    hour24 += 12;
  }
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------

/**
 * One scrolling column.
 *
 * <p>Lives only inside the sheet, never on a scrolling page. Two vertical scroll
 * views competing for the same drag is not a thing to solve with flags — the
 * outer one wins, and the fixes for that all fight the platform. Putting the
 * wheel on its own surface removes the competition instead.
 */
function Column<T extends string | number>({
  values,
  selected,
  onSelect,
  format,
}: {
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
}) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const ref = useRef<ScrollView>(null);
  const lastIndex = useRef(values.indexOf(selected));

  const offsetFor = useCallback(
    (value: T) => Math.max(0, values.indexOf(value)) * ITEM,
    [values],
  );

  /*
   * Positioned imperatively, because `contentOffset` is an iOS-only prop on
   * ScrollView. On Android it is ignored outright, which left the wheel parked
   * at midnight while the highlighted row claimed otherwise — the value and the
   * thing under the selection band disagreeing.
   */
  useEffect(() => {
    const id = setTimeout(
      () => ref.current?.scrollTo({ y: offsetFor(selected), animated: false }),
      0,
    );
    return () => clearTimeout(id);
    // Mount only. Re-running on every change would yank the wheel out from under
    // a moving finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * A tick per row as it passes the band, which is what makes a wheel feel like
   * a dial. Fired during the scroll rather than at the end, so it lands while
   * the row is actually there.
   */
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM);
      if (index !== lastIndex.current && index >= 0 && index < values.length) {
        lastIndex.current = index;
        haptics.tick();
      }
    },
    [haptics, values.length],
  );

  const onSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM);
      const next = values[Math.min(Math.max(index, 0), values.length - 1)];
      if (next !== selected) {
        onSelect(next);
      }
    },
    [onSelect, selected, values],
  );

  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      contentContainerStyle={{ paddingVertical: ITEM * PADDING_ROWS }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={onSettle}
      // Momentum does not fire on a short flick or a slow drag; without this a
      // gentle nudge snaps visually and never reports the change.
      onScrollEndDrag={onSettle}
    >
      {values.map((value) => (
        <View key={String(value)} style={styles.item}>
          <Text style={[styles.itemText, value === selected && styles.itemTextOn]}>
            {format ? format(value) : String(value)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------

/** Typed entry, for when scrolling to 3:47 is the wrong tool. */
function Keypad({
  hour,
  minute,
  period,
  onChange,
}: {
  hour: number;
  minute: number;
  period: string;
  onChange: (hour: number, minute: number, period: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  // Held as text while editing. Coercing every keystroke to a number makes the
  // field impossible to clear — deleting "10" to type "9" briefly needs "" to be
  // a legal state, and a number cannot represent that.
  const [hourText, setHourText] = useState(String(hour));
  const [minuteText, setMinuteText] = useState(String(minute).padStart(2, '0'));

  const commitHour = (text: string) => {
    setHourText(text);
    const next = Number(text);
    if (text && next >= 1 && next <= 12) {
      onChange(next, minute, period);
    }
  };

  const commitMinute = (text: string) => {
    setMinuteText(text);
    const next = Number(text);
    if (text && next >= 0 && next <= 59) {
      onChange(hour, next, period);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.keypad}>
      <TextInput
        style={styles.field}
        value={hourText}
        onChangeText={commitHour}
        // Blur restores whatever the last valid value was, so a field left
        // reading "0" or empty does not become the saved time.
        onBlur={() => setHourText(String(hour))}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel="Hour"
      />
      <Text style={styles.fieldColon}>:</Text>
      <TextInput
        style={styles.field}
        value={minuteText}
        onChangeText={commitMinute}
        onBlur={() => setMinuteText(String(minute).padStart(2, '0'))}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel="Minute"
      />

      <View style={styles.periodStack}>
        {PERIODS.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              haptics.tap();
              onChange(hour, minute, option);
            }}
            style={[styles.periodPill, option === period && styles.periodPillOn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: option === period }}
          >
            <Text style={[styles.periodText, option === period && styles.periodTextOn]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

/**
 * The picker itself, on its own surface.
 *
 * <p>Two ways in, because they suit different intentions: the wheel for nudging
 * a time by half an hour, typing for going straight to 6:45. That is the pair
 * every phone clock app offers, and for the same reason.
 *
 * <p>Edits are held in a draft and only handed back on Set. Committing on every
 * notch of a wheel would fire a save per row scrolled past, and would leave a
 * cancelled edit already saved.
 */
export function TimePickerSheet({
  visible,
  label,
  value,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  label: string;
  value: string;
  onCancel: () => void;
  onConfirm: (next: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [draft, setDraft] = useState(value);
  const [typing, setTyping] = useState(false);

  // Reset whenever it opens, so a cancelled edit does not persist into the next.
  useEffect(() => {
    if (visible) {
      setDraft(value);
      setTyping(false);
    }
  }, [visible, value]);

  const { hour, minute, period } = useMemo(() => parse(draft), [draft]);

  if (!visible) {
    return null;
  }

  return (
    <Sheet visible={visible} onClose={onCancel}>
      <>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.preview}>{formatTime(draft)}</Text>
          </View>

          <Pressable
            onPress={() => {
              haptics.tap();
              setTyping((on) => !on);
            }}
            style={styles.modeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={typing ? 'Use the wheel' : 'Type the time'}
          >
            <Ionicons
              name={typing ? 'time-outline' : 'keypad-outline'}
              size={19}
              color={colors.accent}
            />
          </Pressable>
        </View>

        {typing ? (
          <Keypad
            hour={hour}
            minute={minute}
            period={period}
            onChange={(h, m, p) => setDraft(build(h, m, p))}
          />
        ) : (
          <View style={styles.wheel}>
            {/* Behind the columns and not interactive, so it never intercepts a
                drag. */}
            <View style={styles.band} pointerEvents="none" />
            <View style={styles.columns}>
              <Column
                values={HOURS}
                selected={hour}
                onSelect={(next) => setDraft(build(next, minute, period))}
              />
              <Text style={styles.colon}>:</Text>
              <Column
                values={MINUTES}
                selected={minute}
                onSelect={(next) => setDraft(build(hour, next, period))}
                format={(m) => String(m).padStart(2, '0')}
              />
              <Column
                values={PERIODS}
                selected={period}
                onSelect={(next) => setDraft(build(hour, minute, next))}
              />
            </View>
          </View>
        )}

        <NeonButton
          label="Set"
          variant="accent"
          size="lg"
          onPress={() => {
            haptics.commit();
            onConfirm(draft);
          }}
        />
        <Pressable
          onPress={onCancel}
          style={styles.cancel}
          hitSlop={{ top: 10, bottom: 10, left: 24, right: 24 }}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

/**
 * The collapsed control: one time, tappable.
 *
 * <p>What sits on the page. A picker permanently expanded on a scrolling screen
 * is both a gesture conflict and a lot of furniture for a setting most people
 * touch once.
 */
export function TimeField({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.field2, disabled && styles.fieldOff]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatTime(value)}`}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValue}>
        <Text style={styles.fieldTime}>{formatTime(value)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  // Backdrop, sheet chrome and grabber live in Sheet.
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading,
    color: c.text,
  },
  preview: {
    ...typography.caption,
    color: c.accent,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },

  wheel: {
    justifyContent: 'center',
    height: WHEEL_HEIGHT,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM,
    top: ITEM * PADDING_ROWS,
    borderRadius: radius.md,
    backgroundColor: c.accentSoft,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  column: {
    width: 64,
    height: WHEEL_HEIGHT,
  },
  item: {
    height: ITEM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    ...typography.body,
    color: c.textMuted,
  },
  itemTextOn: {
    ...typography.bodyStrong,
    color: c.accent,
    fontSize: 18,
  },
  colon: {
    ...typography.bodyStrong,
    color: c.textMuted,
  },

  keypad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: WHEEL_HEIGHT,
  },
  field: {
    width: 74,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: c.borderMuted,
    color: c.text,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
  },
  fieldColon: {
    ...typography.title,
    color: c.textMuted,
  },
  periodStack: {
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  periodPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: c.surfaceSunken,
  },
  periodPillOn: {
    backgroundColor: c.accentVivid,
  },
  periodText: {
    ...typography.caption,
    color: c.textSecondary,
  },
  periodTextOn: {
    color: c.textOnAccent,
    fontWeight: '700',
  },

  cancel: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  cancelText: {
    ...typography.bodyStrong,
    color: c.textMuted,
  },

  field2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    marginTop: spacing.sm,
  },
  fieldOff: {
    opacity: 0.4,
  },
  fieldLabel: {
    ...typography.body,
    color: c.text,
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldTime: {
    ...typography.bodyStrong,
    color: c.accent,
  },
});
