import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authApi, setSessionExpiredHandler } from '@/api';
import { tokenStore } from '@/api/tokens';
import type { User } from '@/api/types';
import { unregisterDevice } from '@/lib/notifications';

interface AuthState {
  user: User | null;
  /** True until the stored session has been read from the keychain. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn(email: string, password: string): Promise<void>;
  signUp(input: {
    fullName: string;
    email: string;
    password: string;
    university?: string;
    programme?: string;
  }): Promise<void>;
  signOut(): Promise<void>;
  updateUser(user: User): void;
  refreshUser(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Guards against setting state after unmount during the async bootstrap.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const clearSession = useCallback(async () => {
    await tokenStore.clear();
    if (mounted.current) {
      setUser(null);
    }
  }, []);

  // The API client cannot navigate, so it tells us when a refresh has failed
  // and this provider drops the user — the route guard does the rest.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await tokenStore.load();
        if (!session) {
          return;
        }

        // Trust the cached user for an instant boot, then reconcile with the
        // server. Blocking the splash screen on a network round trip would
        // make every cold start feel broken on a slow connection.
        if (mounted.current) {
          setUser(session.user);
        }

        try {
          const fresh = await authApi.me();
          await tokenStore.updateUser(fresh);
          if (mounted.current) {
            setUser(fresh);
          }
        } catch {
          // Offline, or the token is dead. The client already handles a dead
          // token by clearing the session; offline should keep the cached user.
        }
      } finally {
        if (mounted.current) {
          setIsBootstrapping(false);
        }
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.signIn({ email: email.trim(), password });
    await tokenStore.save({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
    setUser(response.user);
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (input) => {
    const response = await authApi.signUp({ ...input, email: input.email.trim() });
    await tokenStore.save({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    const session = await tokenStore.load();

    // Before the tokens go, while the call can still authenticate. This matters
    // most on a shared or borrowed phone: leaving the device registered would
    // send this student's lectures to whoever signs in next.
    await unregisterDevice();

    // Revoke server-side first, but never let a failed call strand the user in
    // a signed-in shell they asked to leave.
    if (session) {
      try {
        await authApi.logout(session.refreshToken);
      } catch {
        // Ignored on purpose.
      }
    }
    await clearSession();
  }, [clearSession]);

  const updateUser = useCallback((next: User) => {
    setUser(next);
    void tokenStore.updateUser(next);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await authApi.me();
    await tokenStore.updateUser(fresh);
    setUser(fresh);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signOut,
      updateUser,
      refreshUser,
    }),
    [user, isBootstrapping, signIn, signUp, signOut, updateUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
