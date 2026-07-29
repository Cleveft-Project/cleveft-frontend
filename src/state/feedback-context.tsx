import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const VOICE_KEY = 'cleveft.mascot.voice';
const HAPTICS_KEY = 'cleveft.haptics';

interface Toggle {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

interface FeedbackContextValue {
  /** Whether the mascot reads his lines aloud. */
  voice: Toggle;
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
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedVoice, storedHaptics] = await Promise.all([
        load(VOICE_KEY),
        load(HAPTICS_KEY),
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

  const value = useMemo(
    () => ({
      voice: { enabled: voiceEnabled, setEnabled: setVoice },
      haptics: { enabled: hapticsEnabled, setEnabled: setHaptics },
      ready,
    }),
    [hapticsEnabled, ready, setHaptics, setVoice, voiceEnabled],
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
      voice: { enabled: false, setEnabled: () => {} },
      haptics: { enabled: true, setEnabled: () => {} },
      ready: true,
    }
  );
}
