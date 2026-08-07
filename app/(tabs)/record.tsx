import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ApiError, lecturesApi } from '@/api';
import { Animated, staggeredEntrance } from '@/components/animated/entrance';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Card } from '@/components/card';
import { SectionHeader } from '@/components/headers';
import { LectureCard } from '@/components/lecture-card';
import { CoursePicker } from '@/components/course-picker';
import { RecordControl, type RecorderPhase } from '@/components/record-control';
import { ScrollEdges, useScrollEdges } from '@/components/scroll-edges';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { VideoImportSheet } from '@/components/video-import-sheet';
import { Waveform } from '@/components/waveform';
import { useAsync } from '@/hooks/use-async';
import { coursesFromLectures, groupLecturesByCourse } from '@/lib/courses';
import { useRecording } from '@/state/recording-context';
import { radius, spacing, typography, useTheme, useThemedStyles, type Palette } from '@/theme';


/**
 * "EE355-Lecture4-BJT.pdf" -> "EE355 Lecture4 BJT".
 *
 * Students name lecture PDFs usefully, so the filename is a better default
 * title than any date. Separators become spaces because the result is a
 * heading, not a filename.
 */
function stripExtension(fileName: string): string {
  const stem = fileName.includes('.')
    ? fileName.slice(0, fileName.lastIndexOf('.'))
    : fileName;
  return stem.replace(/[_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || fileName;
}

function formatElapsed(millis: number): string {
  const total = Math.floor(millis / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * The blinking capture light.
 *
 * Blinks only while audio is genuinely being written. Held shows a steady amber
 * dot and idle a dead grey one — so the dot's behaviour, not just its colour,
 * distinguishes the three states for anyone who cannot rely on hue.
 */
function LiveDot({ active, paused }: { active: boolean; paused: boolean }) {
  const styles = useThemedStyles(createStyles);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (active) {
      blink.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 620, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 620, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(blink);
      blink.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(blink);
  }, [active, blink]);

  const style = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <Animated.View
      style={[
        styles.recDot,
        active && styles.recDotLive,
        paused && styles.recDotPaused,
        style,
      ]}
    />
  );
}

export default function RecordScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Tapping the tab you are already on returns you to the top of it.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Content dissolves into the top and bottom edges as it scrolls.
  const edges = useScrollEdges();

  /*
   * The take itself lives above the router, not here.
   *
   * This screen is the full view onto it — fields, waveform, the big control —
   * but it is no longer the owner, because a lecture has to keep running while
   * the student is somewhere else in the app. See `recording-context`.
   */
  const {
    isActive,
    paused,
    durationMillis,
    level,
    uploading,
    uploadError,
    permissionGranted,
    title,
    setTitle,
    courseCode,
    setCourseCode,
    start,
    pause,
    resume,
    stopAndUpload,
    discard,
    setError,
    uploadCount,
  } = useRecording();

  const [importing, setImporting] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);

  const lectures = useAsync(() => lecturesApi.list(), []);

  // Re-fetch when a recording finishes, wherever it was stopped from — the
  // bar above the tabs can finish a lecture while this screen is not even
  // on top, and its list would otherwise still be missing it on return.
  useEffect(() => {
    if (uploadCount > 0) {
      void lectures.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadCount]);

  useFocusEffect(
    useCallback(() => {
      void lectures.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  /** The student's own courses, so recording one is a tap rather than typing. */
  const courseOptions = useMemo(
    () => coursesFromLectures(lectures.data ?? []),
    [lectures.data],
  );

  const lectureGroups = useMemo(
    () => groupLecturesByCourse(lectures.data ?? []),
    [lectures.data],
  );

  /**
   * Picks a PDF and hands it to the same pipeline a recording goes through.
   *
   * `copyToCacheDirectory: false` is deliberate, and the opposite of the
   * obvious choice.
   *
   * Setting it true makes the picker copy into `cache/DocumentPicker/`, which
   * under Expo Go belongs to the *host* app (`host.exp.exponent`) rather than
   * to this experience — and expo-file-system scopes us to our own
   * `ExperienceData` folder, so the copy lands somewhere we are not allowed to
   * read: "Location '…/cache/DocumentPicker/…pdf' isn't readable."
   *
   * Left false, Android hands back the original `content://` URI along with a
   * read grant, which the ContentResolver honours. Copying that into our own
   * scoped cache is then permitted.
   */
  const importDocument = async () => {
    setError(null);

    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
        multiple: false,
      });
    } catch {
      setError('Could not open your files. Try again.');
      return;
    }

    if (picked.canceled || !picked.assets?.length) {
      return;
    }

    const file = picked.assets[0];
    setImporting(true);
    try {
      const lecture = await lecturesApi.importDocument({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType ?? 'application/pdf',
        // Falls back to the *picked* name, not the uploaded one.
        //
        // The file is copied into our cache under a generated name to keep two
        // imports of the same document apart, and that name is what arrives at
        // the server as the multipart filename. Left to derive its own title
        // from it, the server produced "cleveft 1785051159760 OceanofPDF.com…".
        // The name the student recognises has to be sent explicitly.
        title: title.trim() || stripExtension(file.name),
        courseCode: courseCode.trim() || undefined,
      });

      setTitle('');
      setCourseCode('');
      void lectures.reload();

      // Straight to the lecture, which already shows the processing state and
      // polls for progress — the same place a finished recording lands.
      router.push(`/transcript?lectureId=${lecture.id}`);
    } catch (error) {
      // The real message, not a friendly stand-in. Everything that can go wrong
      // between picking a file and the server answering lands here — the copy
      // out of the provider's storage, reading the bytes, the request itself —
      // and they need different fixes. Twice now a generic sentence has sent us
      // looking in the wrong place.
      console.warn('[import] failed:', error);
      setError(
        error instanceof ApiError
          ? error.message
          : `Could not import that file: ${(error as Error)?.message ?? String(error)}`,
      );
    } finally {
      setImporting(false);
    }
  };

  /**
   * Throws the take away without uploading.
   *
   * Confirmed first, and deliberately not undoable-by-accident: this is the one
   * control on the screen that can destroy a lecture the student just sat
   * through, and it sits a thumb's width from Stop.
   */
  const discardRecording = () => {
    Alert.alert(
      'Discard this recording?',
      'The audio will be thrown away and nothing will be transcribed.',
      [
        { text: 'Keep recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => void discard(),
        },
      ],
    );
  };

  // Paused still counts as armed: there is tape rolling, it is just held.
  // `isActive` is the context's name for the same idea.
  const armed = isActive;
  const isRecording = isActive && !paused;
  const elapsedMillis = durationMillis;

  const phase: RecorderPhase = uploading
    ? 'uploading'
    : paused
      ? 'paused'
      : isRecording
        ? 'recording'
        : 'idle';

  const allLectures = lectures.data ?? [];

  return (
    <Screen>
      <ScrollView
        onScroll={edges.onScroll}
        scrollEventThrottle={16}
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={lectures.isRefreshing}
            onRefresh={lectures.reload}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* No mascot here, deliberately.
            He was tried on this screen twice: first as a listening pose, then
            driven by the live microphone level. Both failed for the same
            reason. Every question this screen answers — is it running, for how
            long, is it hearing me — is already answered better by the status
            chip, the timer and the waveform directly beneath. A character
            restating the waveform is decoration, and decoration on a utility
            screen is noise. He belongs where there is waiting or feeling to
            carry: the empty chat, the pause before an answer, a quiz result. */}
        <View style={styles.header}>
          <Text style={styles.title}>Record</Text>
          <Text style={styles.subtitle}>
            {isRecording ? 'Listening to your lecture' : 'One tap and Cleveft handles the rest'}
          </Text>
        </View>

        {/* An ink slab, like the home hero, rather than another white card.
            This screen has exactly one job, and the recorder should be the
            heaviest object on it — the old card sat at the same visual weight
            as the form beneath it, so nothing said "start here". */}
        <Card tone="ink" style={styles.recorderCard}>
          {/* Status first, then the number. A student glancing down mid-lecture
              is checking "is this actually running", not the exact second. */}
          <View style={styles.statusRow}>
            <View style={[styles.statusChip, armed && styles.statusChipLive]}>
              <LiveDot active={isRecording} paused={paused} />
              <Text style={[styles.statusText, armed && styles.statusTextLive]}>
                {uploading ? 'Uploading' : paused ? 'Held' : isRecording ? 'Recording' : 'Ready'}
              </Text>
            </View>
          </View>

          {/* Timer and trace are one block with no gap between them: they are
              two readings of the same thing, and spacing them apart is what
              made the card read as scattered parts. */}
          <View style={styles.readout}>
            <Text style={[styles.timer, armed && styles.timerLive]}>
              {formatElapsed(elapsedMillis)}
            </Text>

            <Waveform level={level} active={armed} paused={paused} />
          </View>

          <RecordControl
            phase={phase}
            level={level}
            onStart={() => void start()}
            onStop={() => void stopAndUpload()}
            onPause={pause}
            onResume={resume}
            onDiscard={discardRecording}
          />

          <Text style={styles.recordHint}>
            {uploading
              ? 'Uploading your lecture…'
              : paused
                ? 'Held — resume when the lecturer starts again'
                : isRecording
                  ? 'Recording. Stop when the lecture ends and Cleveft takes it from there.'
                  : 'One tap to start. You can hold and resume as often as you need.'}
          </Text>
        </Card>

        {permissionGranted === false ? (
          <Card style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Microphone access is off</Text>
            <Text style={styles.permissionCopy}>
              Cleveft cannot record without it. Enable microphone access for Cleveft in your device
              settings, then come back.
            </Text>
          </Card>
        ) : null}

        {uploadError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{uploadError}</Text>
          </Card>
        ) : null}

        {/* Details are optional and collected before recording, so stopping is
            always a single tap — nothing stands between the student and saving
            the lecture they just sat through. */}
        <SectionHeader title="Lecture details" />
        <Card>
          <View style={styles.form}>
            <TextField
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Signals & Systems — Fourier transforms"
              editable={!isRecording}
            />
            <CoursePicker
              courses={courseOptions}
              value={courseCode}
              onChange={setCourseCode}
              editable={!isRecording}
            />
          </View>
        </Card>

        {/* Placed after the details, not before, because the title and course
            above apply to an import exactly as they do to a recording — filling
            them in first and then importing is one flow, not two. */}
        <SectionHeader title="Or import" />
        <Card onPress={isRecording || importing ? undefined : importDocument}>
          <View style={styles.importRow}>
            <View style={styles.importChip}>
              {importing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="document-text" size={18} color={colors.accent} />
              )}
            </View>
            <View style={styles.importText}>
              <Text style={styles.importTitle}>
                {importing ? 'Importing…' : 'Import a PDF'}
              </Text>
              <Text style={styles.importCopy}>
                Slides or a handout. Cleveft reads it and builds the same notes,
                quizzes and answers as a recording.
              </Text>
            </View>
            {importing ? null : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </View>
        </Card>

        {/* The other way in.
            Adding a video from a lecture attaches it to that class, which is
            the common case. This is the one that does not: a student teaching
            themselves something no course of theirs covers still deserves the
            notes, the search and the quizzes. Imported from here it belongs to
            nothing, which is a perfectly good thing for it to belong to. */}
        <Card onPress={isRecording || importing ? undefined : () => setAddingVideo(true)}>
          <View style={styles.importRow}>
            <View style={styles.importChip}>
              <Ionicons name="logo-youtube" size={18} color={colors.accent} />
            </View>
            <View style={styles.importText}>
              <Text style={styles.importTitle}>Add a video</Text>
              <Text style={styles.importCopy}>
                Anything you are learning from, course or not. To tie one to a
                lecture instead, add it from that lecture.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Card>

        <SectionHeader title="Your library" />

        {lectures.error && allLectures.length === 0 ? (
          <ErrorState message={lectures.error} onRetry={lectures.reload} />
        ) : allLectures.length === 0 ? (
          <EmptyState
            glyph="◉"
            title="Nothing recorded yet"
            message="Your recorded lectures will appear here, transcribed and ready to query."
          />
        ) : (
          // Grouped by course, because a student takes eight of them a
          // semester and revises one at a time. A flat list interleaves
          // Numerical Methods with Electronics in date order, which is the one
          // ordering nobody studies in.
          <View style={styles.courseGroups}>
            {lectureGroups.map((group, groupIndex) => (
              <View key={group.code ?? '__ungrouped__'} style={styles.courseGroup}>
                <View style={styles.courseGroupHead}>
                  <Text style={[styles.courseGroupTitle, !group.code && styles.courseGroupMuted]}>
                    {group.label}
                  </Text>
                  <Text style={styles.courseGroupCount}>
                    {group.lectures.length}
                    {group.lectures.length === 1 ? ' lecture' : ' lectures'}
                  </Text>
                </View>

                <View style={styles.lectureList}>
                  {group.lectures.map((lecture, index) => (
                    <Animated.View
                      key={lecture.id}
                      entering={staggeredEntrance(groupIndex + index, 80)}
                    >
                      <LectureCard
                        lecture={lecture}
                        index={index}
                        onPress={() => router.push(`/transcript?lectureId=${lecture.id}`)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* After the scroll view, so the fades paint over the content. */}
      <ScrollEdges {...edges} />

      {/* No relatedLectureId: imported from here, a video belongs to nothing.
          The course code above still applies if one was filled in, so an ML
          video can sit under a course without pretending to be a lecture in
          it. */}
      <VideoImportSheet
        visible={addingVideo}
        onClose={() => setAddingVideo(false)}
        courseCode={courseCode || undefined}
        onImported={(lecture) => router.push(`/transcript?lectureId=${lecture.id}`)}
      />
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: c.text,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
  },
  recorderCard: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // A tint on the slab rather than an outlined chip. Sitting on ink, the chip
  // needs to lift off it, and a hairline border on a dark surface is invisible
  // at arm's length anyway.
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusChipLive: {
    backgroundColor: c.dangerSoft,
  },
  // Sentence case, no tracking. "R E C" in wide caps was the loudest thing on
  // a screen whose loudest thing should be the mic.
  statusText: {
    ...typography.micro,
    fontSize: 12,
    color: c.textOnInkMuted,
    letterSpacing: 0.2,
  },
  statusTextLive: {
    color: c.danger,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  importChip: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  importText: {
    flex: 1,
    gap: 2,
  },
  importTitle: {
    ...typography.bodyStrong,
    color: c.text,
  },
  importCopy: {
    ...typography.micro,
    fontWeight: '500',
    color: c.textMuted,
    lineHeight: 16,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: c.textOnInkMuted,
  },
  recDotLive: {
    backgroundColor: c.danger,
  },
  recDotPaused: {
    backgroundColor: c.warning,
  },
  readout: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timer: {
    fontSize: 60,
    lineHeight: 66,
    fontWeight: '700',
    // Without tabular figures the whole row shifts every time a digit changes
    // width, which reads as the timer twitching once a second.
    fontVariant: ['tabular-nums'],
    color: c.textOnInkMuted,
    // Negative, not positive. Wide-tracked digits are a stopwatch-app cliché;
    // tightening them makes a big number read as typeset.
    letterSpacing: -1.5,
  },
  timerLive: {
    color: c.textOnInk,
  },
  recordHint: {
    ...typography.caption,
    color: c.textOnInkMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 19,
  },
  permissionCard: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  permissionTitle: {
    ...typography.bodyStrong,
    color: c.warning,
  },
  permissionCopy: {
    ...typography.caption,
    color: c.textMuted,
  },
  errorCard: {
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: c.danger,
  },
  form: {
    gap: spacing.lg,
  },
  courseGroups: {
    gap: spacing.xl,
  },
  courseGroup: {
    gap: spacing.md,
  },
  courseGroupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  courseGroupTitle: {
    ...typography.subheading,
    color: c.accent,
  },
  courseGroupMuted: {
    color: c.textMuted,
  },
  courseGroupCount: {
    ...typography.micro,
    color: c.textMuted,
  },
  lectureList: {
    gap: spacing.md,
  },
});
