import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const VOICE_KEY = 'cleveft.mascot.voice';
const VOICE_ID_KEY = 'cleveft.mascot.voiceId';
const VOICE_RATE_KEY = 'cleveft.mascot.voiceRate';
const HAPTICS_KEY = 'cleveft.haptics';

interface Toggle {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

interface VoiceSetting extends Toggle {
  /**
   * The exact system voice to speak with, or null to let Cleveft choose.
   *
   * <p>Automatic selection takes the first installed voice matching a preferred
   * locale, which is a guess — Android ships several voices per locale and they
   * vary enormously in quality. A student who dislikes the one it picked had no
   * way to change it, and "the mascot sounds wrong" is the kind of thing that
   * gets a feature switched off permanently rather than reported.
   */
  id: string | null;
  setId(id: string | null): void;
  /**
   * Words per minute, as a multiplier on the platform default.
   *
   * <p>Kept with the voice because they are one decision in practice: a voice
   * that sounds right at one speed sounds wrong at another, and a student who
   * finds the default too fast will otherwise turn speech off rather than hunt
   * for a separate control.
   */
  rate: number;
  setRate(rate: number): void;
}

/** The platform's own pace. */
export const DEFAULT_RATE = 0.95;

interface FeedbackContextValue {
  /** Whether the mascot reads his lines aloud, and in whose voice. */
  voice: VoiceSetting;
  /** Whether actions answer with a tap. */
  haptics: Toggle;
  /** False until stored preferences have been read. */
  ready: boolean;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Mirrors the theme's persistence — SecureStore on device, localStorage on web
 * — rather than introducing a second storage dependency for two booleans.
 */
async function load(key: string): Promise<boolean | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(key) ?? null)
        : await SecureStore.getItemAsync(key);

    return raw === 'on' ? true : raw === 'off' ? false : null;
  } catch {
    return null;
  }
}

/** The same storage, for a value that is not a boolean. */
async function loadText(key: string): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(key) ?? null)
      : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function saveText(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) {
        globalThis.localStorage?.removeItem(key);
      } else {
        globalThis.localStorage?.setItem(key, value);
      }
      return;
    }
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // As below: a preference that will not persist is not worth an interruption.
  }
}

async function save(key: string, enabled: boolean): Promise<void> {
  try {
    const raw = enabled ? 'on' : 'off';
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, raw);
      return;
    }
    await SecureStore.setItemAsync(key, raw);
  } catch {
    // A preference that fails to persist is a small annoyance, not something
    // worth interrupting the student over.
  }
}

/**
 * The two ways the app can answer an action beyond what is on screen.
 *
 * ## Why their defaults differ
 *
 * **Speech is off.** This app is used in lecture halls and libraries. A mascot
 * that greets you audibly the first time you open it is a good way to get
 * someone thrown out of a lecture, and they would have had no chance to
 * prevent it.
 *
 * **Haptics are on.** A tap is silent, felt only by the person holding the
 * phone, and is what every well-made app on the platform already does. Off by
 * default would just make Cleveft feel dead by comparison — and anyone who
 * dislikes it, or has it disabled system-wide, can turn it off here.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceId, setVoiceIdState] = useState<string | null>(null);
  const [voiceRate, setVoiceRateState] = useState(DEFAULT_RATE);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedVoice, storedHaptics, storedVoiceId, storedRate] = await Promise.all([
        load(VOICE_KEY),
        load(HAPTICS_KEY),
        loadText(VOICE_ID_KEY),
        loadText(VOICE_RATE_KEY),
      ]);
      if (!active) {
        return;
      }
      if (storedVoice !== null) {
        setVoiceEnabled(storedVoice);
      }
      if (storedHaptics !== null) {
        setHapticsEnabled(storedHaptics);
      }
      setVoiceIdState(storedVoiceId);
      // Parsed defensively: a corrupted or hand-edited value should fall back to
      // the default rather than leave the mascot unintelligible.
      const parsed = storedRate === null ? NaN : Number(storedRate);
      if (Number.isFinite(parsed) && parsed >= 0.5 && parsed <= 1.6) {
        setVoiceRateState(parsed);
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setVoice = useCallback((next: boolean) => {
    setVoiceEnabled(next);
    void save(VOICE_KEY, next);
  }, []);

  const setHaptics = useCallback((next: boolean) => {
    setHapticsEnabled(next);
    void save(HAPTICS_KEY, next);
  }, []);

  const setVoiceId = useCallback((next: string | null) => {
    setVoiceIdState(next);
    void saveText(VOICE_ID_KEY, next);
  }, []);

  const setVoiceRate = useCallback((next: number) => {
    setVoiceRateState(next);
    void saveText(VOICE_RATE_KEY, String(next));
  }, []);

  const value = useMemo(
    () => ({
      voice: {
        enabled: voiceEnabled,
        setEnabled: setVoice,
        id: voiceId,
        setId: setVoiceId,
        rate: voiceRate,
        setRate: setVoiceRate,
      },
      haptics: { enabled: hapticsEnabled, setEnabled: setHaptics },
      ready,
    }),
    [
      hapticsEnabled, ready, setHaptics, setVoice, setVoiceId, setVoiceRate,
      voiceEnabled, voiceId, voiceRate,
    ],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

/**
 * Falls back to sensible defaults outside the provider rather than throwing:
 * both of these are optional embellishment, and a screen rendered in isolation
 * should degrade quietly rather than crash.
 */
export function useFeedback(): FeedbackContextValue {
  return (
    useContext(FeedbackContext) ?? {
      voice: {
        enabled: false,
        setEnabled: () => {},
        id: null,
        setId: () => {},
        rate: DEFAULT_RATE,
        setRate: () => {},
      },
      haptics: { enabled: true, setEnabled: () => {} },
      ready: true,
    }
  );
}
