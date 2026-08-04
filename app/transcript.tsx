import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Animated from 'react-native-reanimated';

import { ApiError, lecturesApi } from '@/api';
import type { Lecture } from '@/api/types';
import { Card } from '@/components/card';
import { ErrorState, LoadingState, Pill } from '@/components/feedback';
import { RoundButton, ScreenHeader, SectionHeader } from '@/components/headers';
import { formatDuration } from '@/components/lecture-card';
import { NeonButton } from '@/components/neon-button';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { VideoImportSheet } from '@/components/video-import-sheet';
import { CoursePicker } from '@/components/course-picker';
import { LectureExamPrepTab } from '@/components/lecture-exam-prep';
import { useAsync } from '@/hooks/use-async';
import { coursesFromLectures } from '@/lib/courses';
import { useLectureProgress } from '@/hooks/use-lecture-progress';
import { useCollapsingHeader } from '@/state/chrome-context';
import { useNotifications } from '@/state/notifications-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';

/** Named TranscriptTab, not View — `View` is already the RN component here. */
type TranscriptTab = 'notes' | 'transcript' | 'examprep';

export default function TranscriptScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();
  const headerStyle = useCollapsingHeader();
  // Interactive rows move but never scale, so their touch targets stay put.
  const compactStyle = useCollapsingHeader({ scale: 0, fade: 0, lift: 12 });
  const params = useLocalSearchParams<{ lectureId?: string }>();
  const lectureId = typeof params.lectureId === 'string' ? params.lectureId : null;
  const { askPermission } = useNotifications();

  const lecture = useAsync(
    () => lecturesApi.get(lectureId as string),
    [lectureId],
    { enabled: !!lectureId },
  );

  const [view, setView] = useState<TranscriptTab>('notes');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseDraft, setCourseDraft] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);

  // Courses the student already uses, so assigning one here is a tap rather
  // than retyping a code they have entered a dozen times.
  const lectures = useAsync(() => lecturesApi.list(), []);
  const courseOptions = useMemo(
    () => coursesFromLectures(lectures.data ?? []),
    [lectures.data],
  );

  const isProcessing =
    lecture.data?.status === 'PENDING' || lecture.data?.status === 'PROCESSING';

  const progress = useLectureProgress(lectureId, isProcessing);

  // When the background job finishes, pull the finished lecture in — otherwise
  // the student sits on a "processing" screen that is already out of date.
  useEffect(() => {
    if (progress?.terminal) {
      void lecture.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.terminal]);

  /*
   * The moment to ask about notifications.
   *
   * A student who has just watched a lecture finish knows exactly what the
   * permission is for — they waited for this. Asking at launch instead means
   * asking before Cleveft has done anything, which is how an app collects a
   * "no" it can never undo without sending someone into system settings.
   *
   * Only after a job the student actually watched complete, and askPermission
   * itself never re-prompts once the OS has an answer.
   */
  useEffect(() => {
    if (progress?.terminal && lecture.data?.status === 'COMPLETED') {
      void askPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.terminal, lecture.data?.status]);

  if (!lectureId) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Lecture" />
        <ErrorState message="No lecture was selected." onRetry={() => router.back()} />
      </Screen>
    );
  }

  if (lecture.isLoading && !lecture.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Lecture" />
        <LoadingState label="Opening your lecture…" />
      </Screen>
    );
  }

  if (lecture.error && !lecture.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title="Lecture" />
        <ErrorState message={lecture.error} onRetry={lecture.reload} />
      </Screen>
    );
  }

  const data = lecture.data as Lecture;

  const startEditing = () => {
    setDraft(data.fullTranscript ?? '');
    setSaveError(null);
    setEditing(true);
  };

  const saveTranscript = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await lecturesApi.update(data.id, { fullTranscript: draft });
      setEditing(false);
      void lecture.reload();
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not save your changes.',
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditingTitle = () => {
    setTitleDraft(data.title);
    setTitleError(null);
    setEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(false);
    setTitleError(null);
  };

  const saveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleError('Give the lecture a name.');
      return;
    }
    setSavingTitle(true);
    setTitleError(null);
    try {
      await lecturesApi.update(data.id, { title: trimmed });
      setEditingTitle(false);
      void lecture.reload();
    } catch (error) {
      setTitleError(
        error instanceof ApiError ? error.message : 'Could not rename this lecture.',
      );
    } finally {
      setSavingTitle(false);
    }
  };

  /**
   * Assigns this lecture to a course.
   *
   * Lives here because the lecture is the thing being changed — and until now
   * a course could only be set while recording, so an existing lecture could
   * never be grouped at all.
   */
  const saveCourse = async (nextCourse: string) => {
    setSavingCourse(true);
    try {
      await lecturesApi.update(data.id, { courseCode: nextCourse.trim() });
      setEditingCourse(false);
      void lecture.reload();
      void lectures.reload();
    } catch (error) {
      Alert.alert(
        "Couldn't set the course",
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    } finally {
      setSavingCourse(false);
    }
  };

  /**
   * Removes the lecture for good.
   *
   * Reachable from the failed screen as well as the normal one, which is the
   * whole point: a lecture that cannot finish processing is exactly the one a
   * student wants rid of, and until now that screen offered only "Try again" —
   * so a failing import was permanent.
   */
  const deleteLecture = () => {
    Alert.alert(
      'Delete this lecture?',
      'Its transcript, notes and any quizzes made from it go too. This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await lecturesApi.remove(data.id);
              void lectures.reload();
              // replace, not back: returning to a screen that lists a lecture
              // which no longer exists is how you get a dead row.
              router.replace('/(tabs)/home');
            } catch (error) {
              Alert.alert(
                "Couldn't delete",
                error instanceof ApiError ? error.message : 'Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const retryProcessing = async () => {
    setRetrying(true);
    try {
      await lecturesApi.retry(data.id);
      // The lecture is PENDING again server-side; reload picks that up and
      // the screen below naturally switches to the processing view.
      await lecture.reload();
    } catch (error) {
      // The retry attempt itself was rejected (already processing, audio not
      // retained, etc.) — the lecture's own status did not change, so
      // reloading it would silently show the exact same FAILED screen with
      // no explanation. Surface the real reason instead.
      Alert.alert(
        "Couldn't retry",
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setRetrying(false);
    }
  };

  // Still working: show the stage, not an empty shell.
  if (isProcessing) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title={data.title} subtitle={data.courseCode ?? undefined} />

        <View style={styles.processingWrap}>
          <Card active style={styles.processingCard}>
            <Text style={styles.processingPercent}>{progress?.progressPercent ?? 5}%</Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(4, progress?.progressPercent ?? 5)}%` },
                ]}
              />
            </View>

            <Text style={styles.processingTitle}>Processing your lecture</Text>
            <Text style={styles.processingDetail}>
              {progress?.statusDetail ?? data.statusDetail ?? 'Transcribing audio…'}
            </Text>
            <Text style={styles.processingHint}>
              You can leave this screen — it keeps going in the background.
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  if (data.status === 'FAILED') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <RoundButton
            icon="chevron-back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            label="Go back"
          />
          <View style={styles.flexSpacer} />
          <RoundButton
            icon="trash-outline"
            onPress={deleteLecture}
            label="Delete this lecture"
            tone="danger"
            disabled={deleting}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.lectureTitle}>{data.title}</Text>
        </View>

        <ErrorState
          message={data.statusDetail ?? 'This lecture could not be processed.'}
          onRetry={retryProcessing}
          retrying={retrying}
        />
      </Screen>
    );
  }

  return (
    // Violet here, cyan on the tabs. Changing the blob per screen is a cheap
    // way to make a push feel like arriving somewhere rather than reloading.
    <Screen edges={['top', 'bottom']} blob="violet">
      {/* Navigation and title are separated deliberately.
          Squeezing a lecture name into a fixed-height header bar means
          truncating it to one line beside two buttons. Letting the buttons have
          their own row frees the title to be display type on two lines, which
          is what makes this read as the lecture's own page rather than a list
          row someone drilled into. */}
      <View style={styles.navRow}>
        <RoundButton
          icon="chevron-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          label="Go back"
        />
        <View style={styles.flexSpacer} />
        {editingTitle ? null : (
          <View style={styles.navActions}>
            {/* The main way a video gets into Cleveft, and the reason it lives
                here rather than on the Record tab: students go looking for one
                because a particular class did not land. Starting the import
                from that class records what it was for, without asking. Hidden
                on a video's own page — attaching supporting material to
                supporting material is a chain nobody wants to follow. */}
            {data.source === 'YOUTUBE' ? null : (
              <RoundButton
                icon="logo-youtube"
                onPress={() => setAddingVideo(true)}
                label="Add a video for this lecture"
              />
            )}
            <RoundButton icon="create-outline" onPress={startEditingTitle} label="Rename lecture" />
            <RoundButton
              icon="trash-outline"
              onPress={deleteLecture}
              label="Delete this lecture"
              tone="danger"
              disabled={deleting}
            />
          </View>
        )}
      </View>

      {editingTitle ? (
        <View style={styles.titleEditWrap}>
          <Text style={styles.editHeading}>Rename lecture</Text>
          <Card>
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder="Lecture name"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              style={styles.titleInput}
              autoFocus
              maxLength={120}
              returnKeyType="done"
              onSubmitEditing={saveTitle}
            />
          </Card>

          {titleError ? <Text style={styles.error}>{titleError}</Text> : null}

          <View style={styles.editActions}>
            <NeonButton
              label="Save"
              onPress={saveTitle}
              loading={savingTitle}
              style={styles.editAction}
            />
            <NeonButton
              label="Cancel"
              onPress={cancelEditingTitle}
              variant="ghost"
              style={styles.editAction}
            />
          </View>
        </View>
      ) : (
        <>
          {/* The course this lecture belongs to, editable in place. A lecture
              sits inside a course, so the control for saying which one belongs
              on the lecture — not on a screen listing everything. */}
          <Animated.View style={[styles.courseRow, compactStyle]}>
            {editingCourse ? (
              <View style={styles.coursePickerWrap}>
                <CoursePicker
                  courses={courseOptions}
                  value={courseDraft}
                  onChange={setCourseDraft}
                />
                <View style={styles.editActions}>
                  <NeonButton
                    label="Save course"
                    onPress={() => saveCourse(courseDraft)}
                    loading={savingCourse}
                    style={styles.editAction}
                  />
                  <NeonButton
                    label="Cancel"
                    onPress={() => setEditingCourse(false)}
                    variant="ghost"
                    style={styles.editAction}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setCourseDraft(data.courseCode ?? '');
                  setEditingCourse(true);
                }}
                style={[styles.courseChip, !data.courseCode && styles.courseChipEmpty]}
                accessibilityRole="button"
                accessibilityLabel={
                  data.courseCode ? `Course ${data.courseCode}. Change it.` : 'Set a course'
                }
              >
                <Ionicons
                  name={data.courseCode ? 'school' : 'add-circle-outline'}
                  size={14}
                  color={data.courseCode ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[styles.courseChipText, !data.courseCode && styles.courseChipTextEmpty]}
                >
                  {data.courseCode || 'Set a course'}
                </Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Shrinks and lifts as the student reads, returning on the first
              upward flick — the same signal that shrinks the tab bar, so the
              chrome at both ends of the screen moves as one. */}
          <Animated.View style={[styles.titleBlock, headerStyle]}>
            <Text style={styles.lectureTitle}>{data.title}</Text>
            <Text style={styles.lectureMeta}>
              {/* keyConcepts, not topics: `topics` is on LectureSummary, the
                  shape the list endpoint returns. The detail endpoint returns
                  the extracted concepts themselves, which is the better number
                  to show anyway — it says how much Cleveft actually pulled out
                  of this lecture. */}
              {[
                formatDuration(data.durationSeconds),
                data.keyConcepts?.length
                  ? `${data.keyConcepts.length} key ${
                      data.keyConcepts.length === 1 ? 'concept' : 'concepts'
                    }`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Animated.View>

          {/* Lifted, never scaled. A scaled control keeps its original
              hit-testing region in React Native, so its edges would quietly
              stop responding while it looked smaller — the same trap the tab
              bar avoids on press. Translation moves the touch target with it. */}
          <Animated.View style={[styles.segmentWrap, compactStyle]}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'notes', label: 'Notes' },
                { value: 'transcript', label: 'Transcript' },
                { value: 'examprep', label: 'Exam prep' },
              ]}
            />
          </Animated.View>
        </>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {view === 'notes' ? (
            <>
              {data.keyConcepts && data.keyConcepts.length > 0 ? (
                <>
                  <SectionHeader title="Key concepts" />
                  <View style={styles.list}>
                    {data.keyConcepts.map((concept, index) => (
                      <Card key={`${concept.term}-${index}`}>
                        <View style={styles.conceptHeader}>
                          <Text style={styles.conceptTerm}>{concept.term}</Text>
                          {concept.kind ? <Pill label={concept.kind} tone="accent" /> : null}
                        </View>
                        {concept.detail ? (
                          <Text style={styles.conceptDetail}>{concept.detail}</Text>
                        ) : null}
                      </Card>
                    ))}
                  </View>
                </>
              ) : null}

              {data.structuredNotes && data.structuredNotes.length > 0 ? (
                <>
                  <SectionHeader title="Lecture notes" />
                  <View style={styles.list}>
                    {data.structuredNotes.map((section, index) => (
                      <Card key={`${section.heading}-${index}`}>
                        <Text style={styles.sectionHeading}>{section.heading}</Text>
                        {section.summary ? (
                          <Text style={styles.sectionSummary}>{section.summary}</Text>
                        ) : null}
                        {section.points?.map((point, pointIndex) => (
                          <View key={pointIndex} style={styles.bulletRow}>
                            <Text style={styles.bullet}>▸</Text>
                            <Text style={styles.bulletText}>{point}</Text>
                          </View>
                        ))}
                      </Card>
                    ))}
                  </View>
                </>
              ) : (
                <Card>
                  <Text style={styles.mutedCopy}>
                    Structured notes were not generated for this lecture. The full transcript is
                    still available and fully searchable.
                  </Text>
                </Card>
              )}
            </>
          ) : view === 'transcript' ? (
            <>
              {editing ? (
                <>
                  <Card>
                    <Text style={styles.editHint}>
                      Fixing a mistranscribed term re-indexes the lecture, so future answers use
                      your correction.
                    </Text>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      selectionColor={colors.accent}
                      style={styles.editor}
                      textAlignVertical="top"
                    />
                  </Card>

                  {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

                  <View style={styles.editActions}>
                    <NeonButton
                      label="Save & re-index"
                      onPress={saveTranscript}
                      loading={saving}
                      style={styles.editAction}
                    />
                    <NeonButton
                      label="Cancel"
                      onPress={() => setEditing(false)}
                      variant="ghost"
                      style={styles.editAction}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Card>
                    <Text style={styles.transcript}>
                      {data.fullTranscript ?? 'No transcript is available for this lecture.'}
                    </Text>
                  </Card>

                  <NeonButton
                    label="Edit transcript"
                    onPress={startEditing}
                    variant="secondary"
                    style={styles.editButton}
                  />
                </>
              )}
            </>
          ) : null}

          {view === 'examprep' ? (
            <LectureExamPrepTab
              lectureId={data.id}
              lectureTitle={data.title}
              ready={data.status === 'COMPLETED'}
            />
          ) : null}

          {/* "Quiz me on this" is gone: it pushed to the shared Exams screen,
              which is now navigation only. Quizzing this lecture lives in its
              own Exam prep tab above. */}
          {view === 'examprep' ? null : (
            <View style={styles.footerActions}>
              <NeonButton
                label="Ask about this lecture"
                onPress={() =>
                  router.push(
                    `/chat?lectureId=${data.id}&lectureTitle=${encodeURIComponent(data.title)}`,
                  )
                }
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />

      <VideoImportSheet
        visible={addingVideo}
        onClose={() => setAddingVideo(false)}
        relatedLectureId={data.id}
        relatedTitle={data.title}
        courseCode={data.courseCode}
        // Straight to the new item, which opens on its processing state. The
        // alternative — staying put with a toast — leaves the student with no
        // way to tell whether anything is happening.
        onImported={(lecture) => router.push(`/transcript?lectureId=${lecture.id}`)}
      />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  flexSpacer: {
    flex: 1,
  },
  navActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  titleBlock: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  lectureTitle: {
    ...typography.display,
    color: c.text,
  },
  lectureMeta: {
    ...typography.caption,
    color: c.textMuted,
  },
  segmentWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  editHeading: {
    ...typography.heading,
    color: c.text,
    marginBottom: spacing.xs,
  },
  titleEditWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  titleInput: {
    ...typography.body,
    color: c.text,
    padding: 0,
  },
  courseRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  coursePickerWrap: {
    gap: spacing.md,
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  courseChipEmpty: {
    backgroundColor: c.surfaceSunken,
  },
  courseChipText: {
    ...typography.caption,
    color: c.accent,
  },
  courseChipTextEmpty: {
    color: c.textMuted,
  },
  processingWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  processingCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  processingPercent: {
    ...typography.display,
    fontSize: 44,
    color: c.accent,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: c.accentVivid,
  },
  processingTitle: {
    ...typography.heading,
    color: c.text,
    marginTop: spacing.sm,
  },
  processingDetail: {
    ...typography.body,
    color: c.textSecondary,
    textAlign: 'center',
  },
  processingHint: {
    ...typography.micro,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  conceptTerm: {
    ...typography.subheading,
    color: c.accent,
    flex: 1,
  },
  conceptDetail: {
    ...typography.body,
    color: c.text,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    ...typography.subheading,
    color: c.text,
  },
  sectionSummary: {
    ...typography.body,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bullet: {
    ...typography.caption,
    color: c.accent,
  },
  bulletText: {
    ...typography.caption,
    color: c.text,
    flex: 1,
  },
  mutedCopy: {
    ...typography.body,
    color: c.textMuted,
  },
  transcript: {
    ...typography.body,
    color: c.text,
    lineHeight: 25,
  },
  editHint: {
    ...typography.micro,
    color: c.textMuted,
    marginBottom: spacing.md,
  },
  editor: {
    minHeight: 320,
    ...typography.body,
    color: c.text,
    lineHeight: 24,
  },
  editButton: {
    marginTop: spacing.lg,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  editAction: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: c.danger,
    marginTop: spacing.md,
  },
  footerActions: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});
