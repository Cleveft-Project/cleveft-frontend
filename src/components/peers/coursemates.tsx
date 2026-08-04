import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { authApi } from '@/api';
import type { PeerSummary } from '@/api/types';
import { useHaptics } from '@/components/animated/haptics';
import { CountUp } from '@/components/count-up';
import { SectionHeader } from '@/components/headers';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/**
 * The people sitting in the same lectures as you.
 *
 * <p>Finding coursemates by searching a name only works if you already know who
 * to look for — which makes it useless for the person a student most wants to
 * meet, the one two rows over whose name they never caught. Cleveft knows which
 * courses everyone is taking, so it can simply say who else is in the room.
 *
 * <p>Grouped by course rather than merged into one list. "Nine others in
 * CSM 266" is a fact a student can act on; "twenty-three people you might know"
 * is a wall.
 */

/**
 * A colour derived from the name itself.
 *
 * <p>Stable without storing anything: the same person is the same colour on
 * every screen and every device, which is what makes an initials avatar
 * recognisable at a glance rather than just decorative.
 */
function hueFor(name: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PeerAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const tint = hueFor(name, [
    colors.accent,
    colors.violet,
    colors.warning,
    colors.accentVivid,
  ]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint + '26',
        borderWidth: 1.5,
        borderColor: tint,
      }}
    >
      <Text style={{ ...typography.caption, color: tint, fontWeight: '700' }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

export function Coursemates({
  courses,
  connectedIds,
  onConnect,
  busyId,
}: {
  /** The student's own course codes. */
  courses: string[];
  /** Ids already connected or requested, so they are not offered again. */
  connectedIds: Set<string>;
  onConnect: (userId: string) => void;
  busyId?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [byCourse, setByCourse] = useState<Record<string, PeerSummary[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (courses.length === 0) {
      return;
    }
    let active = true;
    setLoading(true);

    // One request per course, in parallel. A student takes six or eight, so
    // this is a handful of small calls rather than something worth batching.
    void Promise.all(
      courses.map(async (code) => [code, await authApi.peersByCourse(code)] as const),
    )
      .then((entries) => {
        if (!active) {
          return;
        }
        const next: Record<string, PeerSummary[]> = {};
        entries.forEach(([code, people]) => {
          if (people.length > 0) {
            next[code] = people;
          }
        });
        setByCourse(next);
      })
      .catch(() => {
        // A failure here leaves the section empty rather than erroring the
        // screen — finding coursemates is a bonus, not the point of the tab.
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [courses]);

  const total = useMemo(
    () =>
      Object.values(byCourse)
        .flat()
        .filter((person) => !connectedIds.has(person.id)).length,
    [byCourse, connectedIds],
  );

  const invite = async () => {
    haptics.tap();
    await Share.share({
      message:
        'I use Cleveft to record lectures and ask them questions afterwards. '
        + 'Get it and we can share what we revise.',
    }).catch(() => {});
  };

  if (courses.length === 0) {
    return (
      <View style={styles.block}>
        <SectionHeader title="Find your coursemates" />
        <View style={styles.prompt}>
          <Ionicons name="school-outline" size={22} color={colors.accent} />
          <Text style={styles.promptText}>
            Add the courses you are taking to your profile, and Cleveft will show you who else is
            in them.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <SectionHeader title="In your courses" />

      {total > 0 ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.tally}>
          <CountUp value={total} style={styles.tallyNumber} />
          <Text style={styles.tallyText}>
            {total === 1 ? 'person you have not added yet' : 'people you have not added yet'}
          </Text>
        </Animated.View>
      ) : null}

      {Object.entries(byCourse).map(([code, people]) => {
        const available = people.filter((person) => !connectedIds.has(person.id));
        if (available.length === 0) {
          return null;
        }

        return (
          <View key={code} style={styles.courseGroup}>
            <View style={styles.courseHead}>
              <View style={styles.courseChip}>
                <Text style={styles.courseChipText}>{code}</Text>
              </View>
              <Text style={styles.courseCount}>
                {available.length} {available.length === 1 ? 'person' : 'people'}
              </Text>
            </View>

            {/* Horizontal, so a course with twelve people does not push every
                other course off the screen. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              {available.map((person, index) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  index={index}
                  busy={busyId === person.id}
                  onConnect={() => onConnect(person.id)}
                />
              ))}
            </ScrollView>
          </View>
        );
      })}

      {!loading && total === 0 ? (
        <View style={styles.prompt}>
          <Ionicons name="paper-plane-outline" size={22} color={colors.accent} />
          <View style={styles.promptBody}>
            <Text style={styles.promptText}>
              Nobody from your courses is on Cleveft yet. Be the one who brings them.
            </Text>
            <Pressable onPress={invite} style={styles.inviteButton} accessibilityRole="button">
              <Ionicons name="share-social" size={15} color={colors.onFillPrimary} />
              <Text style={styles.inviteText}>Invite a coursemate</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** One person, with the courses you share highlighted. */
function PersonCard({
  person,
  index,
  busy,
  onConnect,
}: {
  person: PeerSummary;
  index: number;
  busy: boolean;
  onConnect: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const haptics = useHaptics();

  // Springs in on a stagger, so a row of eight arrives as a sequence rather
  // than appearing all at once like a table.
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withDelay(index * 70, withSpring(1, { damping: 12, stiffness: 160 }));
  }, [index, pop]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.9 + pop.value * 0.1 }],
  }));

  return (
    <Animated.View style={[styles.card, style]}>
      <PeerAvatar name={person.fullName} size={52} />

      <Text style={styles.cardName} numberOfLines={1}>
        {person.fullName}
      </Text>
      {person.programme ? (
        <Text style={styles.cardMeta} numberOfLines={1}>
          {person.programme}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          haptics.commit();
          onConnect();
        }}
        disabled={busy}
        style={[styles.connect, busy && styles.connectBusy]}
        accessibilityRole="button"
        accessibilityLabel={`Add ${person.fullName}`}
      >
        <Ionicons
          name={busy ? 'hourglass-outline' : 'person-add'}
          size={14}
          color={colors.onFillPrimary}
        />
        <Text style={styles.connectText}>{busy ? 'Sending' : 'Add'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  tally: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tallyNumber: {
    ...typography.title,
    color: c.accent,
  },
  tallyText: {
    ...typography.caption,
    color: c.textSecondary,
    flex: 1,
  },
  courseGroup: {
    gap: spacing.sm,
  },
  courseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  courseChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  courseChipText: {
    ...typography.micro,
    color: c.accent,
    letterSpacing: 0.4,
  },
  courseCount: {
    ...typography.micro,
    color: c.textMuted,
  },
  cardRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
    paddingVertical: 2,
  },
  card: {
    width: 132,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  cardName: {
    ...typography.caption,
    color: c.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardMeta: {
    ...typography.micro,
    color: c.textMuted,
    textAlign: 'center',
  },
  connect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: c.fillPrimary,
  },
  connectBusy: {
    opacity: 0.6,
  },
  connectText: {
    ...typography.micro,
    color: c.onFillPrimary,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderMuted,
  },
  promptBody: {
    flex: 1,
    gap: spacing.md,
  },
  promptText: {
    ...typography.caption,
    color: c.textSecondary,
    lineHeight: 19,
    flex: 1,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: c.fillPrimary,
  },
  inviteText: {
    ...typography.caption,
    color: c.onFillPrimary,
    fontWeight: '600',
  },
});
