import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';

import { ApiError, lecturesApi } from '@/api';
import { preferredWebMimeType } from '@/api/audio-upload';
import { normaliseMetering } from '@/components/waveform';

/**
 * Metering has to be requested explicitly, and the waveform depends on it.
 *
 * On web the top-level `mimeType` is what the recorder reads (its default is
 * plain `audio/webm`); on native it is ignored in favour of the preset's
 * per-platform extension and output format.
 */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,

  /*
   * Tuned for speech, not music.
   *
   * HIGH_QUALITY is 128 kbps stereo at 44.1 kHz — a sample rate that reaches
   * 22 kHz, when human speech has run out of energy by 8, and a second channel
   * that a phone microphone fills with a near-copy of the first. Gemini
   * downsamples to mono before it listens, so all of that is encoded, uploaded
   * and then discarded.
   *
   * The bitrate is the one figure a real lecture hall argues about. A lossy
   * codec spends its bits on whatever it judges most audible, and it cannot
   * tell the lecturer from the fan, the corridor or the row behind — so in a
   * noisy room those bits are shared out, and too low a ceiling starts costing
   * intelligibility rather than just fidelity. 48 kbps mono leaves comfortable
   * headroom for that; 32 would be fine for a quiet room and a gamble in a
   * full one, and a lost lecture cannot be re-recorded.
   *
   * That still lands around 22 MB an hour rather than 58, well inside the
   * gateway's upload window — which is what actually limits how long a lecture
   * can be, far more than the 200 MB cap does.
   */
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 48000,
  web: { ...RecordingPresets.HIGH_QUALITY.web, bitsPerSecond: 48000 },

  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    /*
     * The actual handle on a noisy room, and nothing to do with the codec.
     *
     * <p>Android routes recording through a named source, and the default one
     * assumes it is capturing whatever is in front of it. `voice_recognition`
     * tells the device this is speech destined for a recogniser, which on most
     * handsets switches on the hardware noise suppressor and disables the
     * aggressive automatic gain that otherwise pumps room noise up between
     * sentences. It is the source Android's own speech recognition asks for.
     *
     * <p>`voice_communication` was the alternative and is tuned for a phone
     * held to the ear — it adds echo cancellation and clamps harder, which
     * flatters a close talker and can bury a lecturer three rows away.
     */
    audioSource: 'voice_recognition' as const,
  },

  isMeteringEnabled: true,
  ...(Platform.OS === 'web' ? { mimeType: preferredWebMimeType() } : null),
};

/** Only used when the platform reports no type of its own. */
const FALLBACK_MIME_TYPE = Platform.select({ web: 'audio/webm', default: 'audio/mp4' });

/**
 * How much the floating bar shows.
 *
 * <p>Compact is the dot, the clock and the controls — everything you need to
 * know a lecture is running and to stop it. Detailed adds the word for the
 * state and the live level, which some people want and which costs width on a
 * thing whose whole job is to stay out of the way. Hence a choice rather than a
 * verdict.
 */
export type BarDetail = 'compact' | 'detailed';

const BAR_DETAIL_KEY = 'cleveft.recording.barDetail';

/** Mirrors the theme preference's storage: one helper, no new dependency. */
async function loadBarDetail(): Promise<BarDetail | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(BAR_DETAIL_KEY) ?? null)
        : await SecureStore.getItemAsync(BAR_DETAIL_KEY);
    return raw === 'compact' || raw === 'detailed' ? raw : null;
  } catch {
    return null;
  }
}

async function saveBarDetail(value: BarDetail): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(BAR_DETAIL_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(BAR_DETAIL_KEY, value);
  } catch {
    // A preference that fails to persist is a small annoyance, not an error
    // worth interrupting the student over.
  }
}

/** Below this, there is nothing worth sending to the transcription pipeline. */
const MIN_USEFUL_SECONDS = 2;

interface RecordingContextValue {
  /** A take is open — recording or held. Distinct from `paused`. */
  isActive: boolean;
  /** Held, tape still rolling. `isRecording` alone cannot say this. */
  paused: boolean;
  durationMillis: number;
  /** Microphone level, 0 to 1, for the waveform. */
  level: number;
  uploading: boolean;
  uploadError: string | null;
  permissionGranted: boolean | null;

  /** Bound to the record screen's fields, read by the upload. */
  title: string;
  setTitle(value: string): void;
  courseCode: string;
  setCourseCode(value: string): void;

  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stopAndUpload(): Promise<void>;
  /** Throws the take away. The confirmation belongs to the caller. */
  discard(): Promise<void>;
  /**
   * Shared with the record screen's own failures — a PDF that would not open
   * belongs on the same line as a recording that would not upload, because to
   * the student they are one thing going wrong in one place.
   */
  setError(message: string | null): void;

  /** Bumped after every successful upload, so lecture lists can refresh. */
  uploadCount: number;

  /** How much the floating bar shows. Persisted. */
  barDetail: BarDetail;
  setBarDetail(value: BarDetail): void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

/**
 * The recorder, owned above every screen rather than inside one.
 *
 * <p>A lecture outlives the screen that started it. A student checks a
 * definition in the transcript, asks the chatbot something, glances at the
 * board — and the tape has to keep rolling through all of it, visibly, with
 * the controls still in reach. Holding the recorder inside the record tab made
 * that impossible: nothing else in the app could see that anything was
 * happening, let alone stop it.
 *
 * <p>So the take lives here — its audio, its clock, its title and course, and
 * the upload that closes it. The record screen and the bar above the tabs are
 * two views onto the same thing rather than two copies of it.
 */
export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [paused, setPaused] = useState(false);

  /*
   * Wall clock, not tape.
   *
   * The native recorder's duration keeps advancing while it is held — it counts
   * from the moment recording started, not the audio actually written. Left
   * alone the clock runs on through a pause, which is both wrong on screen and
   * wrong in the duration sent up with the file.
   *
   * So the held stretches are measured against that same clock and subtracted
   * back out. Anchoring to the recorder's own count rather than to a timer of
   * our own means the two can never drift apart.
   */
  const [pausedTotal, setPausedTotal] = useState(0);
  const heldFrom = useRef<number | null>(null);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [barDetail, setBarDetailState] = useState<BarDetail>('compact');

  useEffect(() => {
    void loadBarDetail().then((stored) => {
      if (stored) {
        setBarDetailState(stored);
      }
    });
  }, []);

  const setBarDetail = useCallback((value: BarDetail) => {
    setBarDetailState(value);
    void saveBarDetail(value);
  }, []);

  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);

      if (granted) {
        // playsInSilentMode keeps iOS from muting the session when the ringer
        // switch is off — otherwise a lecture silently records nothing.
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  const level = useMemo(
    () => normaliseMetering(recorderState.metering),
    [recorderState.metering],
  );

  // The current hold, which is still growing on the recorder's clock, plus
  // every hold before it.
  const heldNow =
    paused && heldFrom.current !== null
      ? Math.max(0, (recorderState.durationMillis ?? 0) - heldFrom.current)
      : 0;
  const elapsedMillis = Math.max(
    0,
    (recorderState.durationMillis ?? 0) - pausedTotal - heldNow,
  );

  const start = useCallback(async () => {
    if (!permissionGranted) {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Microphone needed',
          'Cleveft needs microphone access to record your lecture. Enable it in Settings.',
        );
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    }

    setUploadError(null);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPaused(false);
      setPausedTotal(0);
      heldFrom.current = null;
    } catch {
      setUploadError('Could not start recording. Close any other app using the microphone.');
    }
  }, [permissionGranted, recorder]);

  const pause = useCallback(() => {
    try {
      recorder.pause();
      // Where on the recorder's clock this hold began.
      heldFrom.current = recorderState.durationMillis ?? 0;
      setPaused(true);
    } catch {
      setUploadError('Could not pause the recording.');
    }
  }, [recorder, recorderState.durationMillis]);

  const resume = useCallback(() => {
    try {
      if (heldFrom.current !== null) {
        const held = (recorderState.durationMillis ?? 0) - heldFrom.current;
        setPausedTotal((total) => total + Math.max(0, held));
        heldFrom.current = null;
      }
      recorder.record();
      setPaused(false);
    } catch {
      setUploadError('Could not resume the recording.');
    }
  }, [recorder, recorderState.durationMillis]);

  const discard = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // Already stopped, or never started cleanly. Either way there is nothing
      // left to tidy up and nothing worth telling the student.
    }
    setPaused(false);
    setPausedTotal(0);
    heldFrom.current = null;
    setUploadError(null);
  }, [recorder]);

  const stopAndUpload = useCallback(async () => {
    const durationSeconds = Math.round(elapsedMillis / 1000);

    try {
      await recorder.stop();
    } catch {
      setUploadError('Could not stop the recording cleanly.');
      return;
    }
    setPaused(false);

    const uri = recorder.uri;
    if (!uri) {
      setUploadError('The recording produced no audio file.');
      return;
    }

    if (durationSeconds < MIN_USEFUL_SECONDS) {
      setUploadError('That recording was too short to transcribe.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const lecture = await lecturesApi.upload({
        uri,
        // Extension is appended from the real audio type. On web the uri is a
        // blob: URL, so there is no meaningful filename to take from it.
        baseName: 'lecture',
        mimeType: FALLBACK_MIME_TYPE,
        /*
         * No date in the name.
         *
         * Every card already prints when the lecture was recorded, so stamping
         * it into the title says the same thing twice and pushes the actual
         * subject onto a second line. The course code is the useful half of
         * what a date was standing in for — it says which lecture this is, not
         * merely which day it happened.
         */
        title:
          title.trim()
          || (courseCode.trim() ? `${courseCode.trim()} lecture` : 'Untitled lecture'),
        courseCode: courseCode.trim() || undefined,
        durationSeconds,
      });

      setTitle('');
      setCourseCode('');
      setPausedTotal(0);
      heldFrom.current = null;
      setUploadCount((n) => n + 1);

      router.push(`/transcript?lectureId=${lecture.id}`);
    } catch (error) {
      // Hitting the free cap is not a failure the student can retry their way
      // out of, so it gets a route to the fix rather than an error line they
      // would just tap "record" against again.
      if (error instanceof ApiError && error.isQuotaExceeded) {
        Alert.alert('Recording limit reached', error.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => router.push('/upgrade') },
        ]);
        setUploadError(error.message);
      } else {
        setUploadError(
          error instanceof ApiError ? error.message : 'Could not upload that recording.',
        );
      }
    } finally {
      setUploading(false);
    }
  }, [courseCode, elapsedMillis, recorder, router, title]);

  const setError = useCallback((message: string | null) => setUploadError(message), []);

  const value = useMemo<RecordingContextValue>(
    () => ({
      isActive: recorderState.isRecording || paused,
      paused,
      durationMillis: elapsedMillis,
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
      barDetail,
      setBarDetail,
    }),
    [
      recorderState.isRecording,
      elapsedMillis,
      paused,
      level,
      uploading,
      uploadError,
      permissionGranted,
      title,
      courseCode,
      start,
      pause,
      resume,
      stopAndUpload,
      discard,
      setError,
      uploadCount,
      barDetail,
      setBarDetail,
    ],
  );

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}

export function useRecording(): RecordingContextValue {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used inside a RecordingProvider');
  }
  return context;
}
