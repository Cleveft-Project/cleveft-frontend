import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = 'cleveft.mascot.voice';

interface VoiceContextValue {
  /** Whether the mascot reads his lines aloud. */
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  /** False until the stored preference has been read. */
  ready: boolean;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * Mirrors the theme's persistence exactly — SecureStore on device,
 * localStorage on web — rather than introducing a second storage dependency
 * for one boolean.
 */
async function load(): Promise<boolean | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
        : await SecureStore.getItemAsync(STORAGE_KEY);

    return raw === 'on' ? true : raw === 'off' ? false : null;
  } catch {
    return null;
  }
}

async function save(enabled: boolean): Promise<void> {
  try {
    const raw = enabled ? 'on' : 'off';
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(STORAGE_KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  } catch {
    // A preference that fails to persist is a small annoyance, not something
    // worth interrupting the student over.
  }
}

/**
 * Whether the mascot speaks out loud.
 *
 * **Off by default, and that is not a detail.** This app is used in lecture
 * halls and libraries. A mascot that greets you audibly the first time you open
 * it is a good way to get someone thrown out of a lecture, and they would have
 * had no chance to prevent it. Opt-in means the only person who ever hears him
 * is someone who decided they wanted to.
 */
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await load();
      if (active) {
        if (stored !== null) {
          setEnabledState(stored);
        }
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    void save(next);
  }, []);

  const value = useMemo(
    () => ({ enabled, setEnabled, ready }),
    [enabled, ready, setEnabled],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    // Speech is optional decoration; a screen rendered outside the provider
    // should stay silent rather than crash.
    return { enabled: false, setEnabled: () => {}, ready: true };
  }
  return context;
}
