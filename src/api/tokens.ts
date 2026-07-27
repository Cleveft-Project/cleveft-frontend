import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { User } from './types';

/**
 * Token persistence.
 *
 * Tokens go in the device keychain / keystore via expo-secure-store, not in
 * plain storage — an access token is a bearer credential for this student's
 * entire lecture library.
 *
 * SecureStore has no web implementation, so on web this degrades to
 * sessionStorage: tokens live for the tab's lifetime and never touch disk.
 * That is a deliberate trade for the Expo web dev target, not a pattern to
 * carry into a production web build.
 */

const ACCESS_TOKEN_KEY = 'cleveft.accessToken';
const REFRESH_TOKEN_KEY = 'cleveft.refreshToken';
const USER_KEY = 'cleveft.user';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const tokenStore = {
  async save(session: StoredSession): Promise<void> {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, session.accessToken),
      setItem(REFRESH_TOKEN_KEY, session.refreshToken),
      setItem(USER_KEY, JSON.stringify(session.user)),
    ]);
  },

  async load(): Promise<StoredSession | null> {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      getItem(ACCESS_TOKEN_KEY),
      getItem(REFRESH_TOKEN_KEY),
      getItem(USER_KEY),
    ]);

    if (!accessToken || !refreshToken || !rawUser) {
      return null;
    }

    try {
      return { accessToken, refreshToken, user: JSON.parse(rawUser) as User };
    } catch {
      // A corrupt record is worse than none — clear it so the app can recover
      // instead of failing to boot on every launch.
      await tokenStore.clear();
      return null;
    }
  },

  async updateAccessToken(accessToken: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  async updateUser(user: User): Promise<void> {
    await setItem(USER_KEY, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await Promise.all([
      removeItem(ACCESS_TOKEN_KEY),
      removeItem(REFRESH_TOKEN_KEY),
      removeItem(USER_KEY),
    ]);
  },
};
