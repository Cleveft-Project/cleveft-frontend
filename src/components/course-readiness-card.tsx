import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import type { CourseReadiness, LectureReadiness } from '@/api/types';
import { TopicBar } from '@/components/meters';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

interface CourseReadinessCardProps {
  course: CourseReadiness;
  index: number;
  /** Quiz across every lecture in this course. */
  onQuizCourse: (courseCode: string) => void;
  /** Open a lecture's transcript. */
  onOpenLecture: (lectureId: string) => void;
  /** True while a quiz for this course is being written. */
  quizzing?: boolean;
}

function toneFor(percent: number): 'strong' | 'fair' | 'weak' {
  return percent >= 70 ? 'strong' : percent >= 45 ? 'fair' : 'weak';
}

/**
 * A course, expanding to the lectures it is made of.
 *
 * The hierarchy is the point: a quiz is taken against a lecture, so a lecture
 * is where readiness is measured and a course is the roll-up. Collapsed by
 * default because eight courses of six lectures each is 48 rows, and the
 * caller sorts weakest-first so the course in trouble is already at the top.
 */
export function CourseReadinessCard({
  course,
  index,
  onQuizCourse,
  onOpenLecture,
  quizzing = false,
}: CourseReadinessCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, glow } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const tone = toneFor(course.readinessPercent);

  /**
   * "Ungrouped" is a bucket, not a course.
   *
   * Its lectures may be from different subjects entirely, so an aggregate
   * across them scores an exam that does not exist — and when it is the only
   * bucket, that number is just the old account-wide average under a new name.
   * The lectures inside it still have real, meaningful scores, so they are
   * shown; the bucket itself is not scored.
   */
  const scoreable = !!course.courseCode;

  /**
   * The server's verdict, unless it promises something this card cannot show.
   *
   * Two of the graded verdicts point "below" at a weak-areas list. That list is
   * built by filtering topics under a mastery threshold, so it can legitimately
   * come back empty — a student can sit at 67% because of a handful of missed
   * questions spread thin, with nothing scoring badly enough to flag. The copy
   * then names a section that is not on screen, which is what makes the card
   * look broken rather than merely quiet.
   */
  const verdict = !scoreable
    ? 'These lectures have no course code, so they are scored individually. Give them one and Cleveft can score the course as a whole.'
    : course.assessed && course.weakAreas.length === 0 && /weak areas below/i.test(course.verdict)
      ? 'Solid foundation. Nothing is scoring badly enough to flag yet — keep quizzing to sharpen the picture.'
      : course.verdict;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 45).duration(220)}
      layout={LinearTransition}
      style={[styles.wrap, glow.card]}
    >
      <Pressable
        onPress={() => setExpanded((previous) => !previous)}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={
          course.assessed
            ? `${course.courseLabel}, ${course.readinessPercent}% ready`
            : `${course.courseLabel}, not assessed`
        }
      >
        <View style={styles.head}>
          <View style={styles.titleBlock}>
            <Text style={styles.course} numberOfLines={1}>
              {course.courseLabel}
            </Text>
            <Text style={styles.meta}>
              {course.lectureCount}
              {course.lectureCount === 1 ? ' lecture' : ' lectures'}
              {course.quizzesTaken > 0 ? ` · ${course.quizzesTaken} quizzes` : ''}
            </Text>
          </View>

          {/* An untested course has no score. Rendering 0% would read as "you
              failed" rather than "you have not started". */}
          {!scoreable ? (
            <Text style={styles.untested}>No course set</Text>
          ) : course.assessed ? (
            <Text style={[styles.percent, styles[tone]]}>{course.readinessPercent}%</Text>
          ) : (
            <Text style={styles.untested}>Not assessed</Text>
          )}

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={colors.textMuted}
          />
        </View>

        {scoreable ? (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                styles[`${tone}Fill`],
                { width: `${course.assessed ? Math.max(3, course.readinessPercent) : 0}%` },
              ]}
            />
          </View>
        ) : null}

        {expanded ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.detail}>
            <Text style={styles.verdict}>{verdict}</Text>

            {/* Weak areas first, and mastered after.
                The order is not alphabetical or arbitrary — a student opening
                this card is deciding what to revise tonight, and the list of
                things they already know cannot answer that. Mastered stays
                because seeing it is what makes the weak list feel survivable
                rather than damning, but it goes second. */}
            {course.weakAreas.length > 0 ? (
              <View style={styles.topicGroup}>
                <Text style={styles.groupLabel}>Weak areas</Text>
                <View style={styles.topicList}>
                  {course.weakAreas.map((topic) => (
                    <TopicBar
                      key={`weak-${topic.topic}`}
                      topic={topic.topic}
                      percent={topic.masteryPercent}
                      detail={`${topic.attempts} quiz ${
                        topic.attempts === 1 ? 'answer' : 'answers'
                      }`}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {course.strongAreas.length > 0 ? (
              <View style={styles.topicGroup}>
                <Text style={styles.groupLabel}>Mastered</Text>
                <View style={styles.topicList}>
                  {course.strongAreas.map((topic) => (
                    <TopicBar
                      key={`strong-${topic.topic}`}
                      topic={topic.topic}
                      percent={topic.masteryPercent}
                      detail={`${topic.attempts} quiz ${
                        topic.attempts === 1 ? 'answer' : 'answers'
                      }`}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.lectures}>
              <Text style={styles.groupLabel}>Lectures</Text>
              {course.lectures.map((lecture) => (
                <LectureRow
                  key={lecture.lectureId}
                  lecture={lecture}
                  onOpen={() => onOpenLecture(lecture.lectureId)}
                />
              ))}
            </View>

            {/* Only for a real course. Lectures with no course code are a
                bucket, not a syllabus — a quiz "across ungrouped" would be a
                quiz across unrelated subjects. */}
            {course.courseCode ? (
              <Pressable
                onPress={() => onQuizCourse(course.courseCode as string)}
                disabled={quizzing}
                style={[styles.courseQuizButton, quizzing && styles.courseQuizDisabled]}
                accessibilityRole="button"
                accessibilityLabel={`Quiz me across ${course.courseLabel}`}
              >
                {quizzing ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <>
                    <Ionicons name="school" size={15} color={colors.textOnAccent} />
                    <Text style={styles.courseQuizText}>
                      Quiz me across {course.courseLabel}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * One lecture inside a course.
 *
 * An unquizzed lecture shows a "Quiz me" action instead of a score — the
 * absence of a number is exactly the thing that should prompt an action, and
 * showing 0% would both misrepresent it and drag the eye to the wrong row.
 */
function LectureRow({
  lecture,
  onOpen,
}: {
  lecture: LectureReadiness;
  onOpen: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const tone = toneFor(lecture.readinessPercent);

  return (
    <View style={styles.lectureRow}>
      <Pressable onPress={onOpen} style={styles.lectureMain} accessibilityRole="button">
        <Text style={styles.lectureTitle} numberOfLines={1}>
          {lecture.title}
        </Text>
        {lecture.assessed ? (
          <View style={styles.lectureTrack}>
            <View
              style={[
                styles.lectureFill,
                styles[`${tone}Fill`],
                { width: `${Math.max(4, lecture.readinessPercent)}%` },
              ]}
            />
          </View>
        ) : (
          <Text style={styles.lectureHint}>Not quizzed yet</Text>
        )}
      </Pressable>

      {/* Opens the lecture rather than starting a quiz here: quizzing is one
          of several things you do *inside* a lecture, so it belongs on the
          lecture's own screen alongside its weak areas and past quizzes. */}
      {lecture.assessed ? (
        <Text style={[styles.lecturePercent, styles[tone]]}>{lecture.readinessPercent}%</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      borderRadius: radius.lg,
    },
    card: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
      gap: spacing.md,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    titleBlock: {
      flex: 1,
      gap: 1,
    },
    course: {
      ...typography.subheading,
      color: c.text,
    },
    meta: {
      ...typography.micro,
      color: c.textMuted,
    },
    percent: {
      ...typography.heading,
      fontVariant: ['tabular-nums'],
    },
    untested: {
      ...typography.micro,
      color: c.textMuted,
    },
    strong: { color: c.accent },
    fair: { color: c.warning },
    weak: { color: c.danger },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    // The bar takes the vivid cyan, the number beside it takes the readable
    // one. Same tone, two jobs.
    strongFill: { backgroundColor: c.accentVivid },
    fairFill: { backgroundColor: c.warning },
    weakFill: { backgroundColor: c.danger },
    detail: {
      gap: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    verdict: {
      ...typography.caption,
      color: c.textSecondary,
    },
    lectures: {
      gap: spacing.md,
    },
    topicGroup: {
      gap: spacing.md,
    },
    topicList: {
      gap: spacing.lg,
    },
    // Sentence case. Shouting a one-word section heading was left over from the
    // old aesthetic and is the loudest thing in a card built on restraint.
    groupLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: c.text,
    },
    lectureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    lectureMain: {
      flex: 1,
      gap: spacing.sm,
    },
    lectureTitle: {
      ...typography.caption,
      color: c.text,
    },
    lectureTrack: {
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceSunken,
      overflow: 'hidden',
    },
    lectureFill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    lectureHint: {
      ...typography.micro,
      color: c.textMuted,
    },
    lecturePercent: {
      ...typography.caption,
      fontVariant: ['tabular-nums'],
    },
    quizButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.accentVivid,
    },
    courseQuizButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: c.accentVivid,
    },
    courseQuizDisabled: {
      opacity: 0.6,
    },
    courseQuizText: {
      ...typography.caption,
      color: c.textOnAccent,
    },
    quizButtonText: {
      ...typography.micro,
      color: c.textOnAccent,
    },
  });
