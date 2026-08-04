import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  configure,
  isSupported,
  lastResponseData,
  onResponse,
  permissionGranted,
  registerDevice,
  requestPermission,
  routeFor,
} from '@/lib/notifications';
import { useAuth } from '@/state/auth-context';

interface NotificationsValue {
  /**
   * Whether the OS currently allows notifications.
   *
   * <p>Null means the question does not apply — Expo Go, or a simulator. The
   * settings screen distinguishes this from false, because "your phone is
   * blocking these" is wrong and confusing when the real answer is "this build
   * cannot do push at all".
   */
  granted: boolean | null;

  /** Whether push works in this build at all. False in Expo Go. */
  supported: boolean;

  /**
   * Asks for permission, and registers the device if it is given.
   *
   * <p>Call at a moment where the reason is obvious — a first lecture finishing,
   * not app launch. Returns whether notifications ended up allowed.
   */
  askPermission: () => Promise<boolean>;

  /** Re-reads the OS setting, for returning from system settings. */
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

/**
 * Push notifications, wired to the session.
 *
 * <p>Two responsibilities: keeping the server's idea of this device in step with
 * who is signed in, and turning a tapped notification into a screen.
 *
 * <p>Everything touching expo-notifications goes through {@code @/lib/
 * notifications}, which loads that module lazily. Nothing here imports it, and
 * nothing here should — a top-level import anywhere in this chain crashes the
 * app on launch in Expo Go, where the module throws during evaluation.
 *
 * <p>Deliberately does not ask for permission. Launch is the worst moment to
 * ask: the request arrives with no reason attached, most people decline, and on
 * iOS that answer can only be changed in system settings afterwards.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [granted, setGranted] = useState<boolean | null>(null);
  const supported = isSupported();

  /*
   * A notification tapped from a killed app arrives before the router can
   * navigate. It is held here and replayed once there is somewhere to go —
   * otherwise the most valuable tap there is, the one that reopened the app,
   * silently lands on the home screen.
   */
  const pending = useRef<string | null>(null);

  useEffect(() => {
    void configure();
    void permissionGranted().then(setGranted);
  }, []);

  // Re-registered on every sign-in. The token is per device but the row is per
  // student, so signing in on a phone has to claim it from whoever had it last.
  useEffect(() => {
    if (isAuthenticated) {
      void registerDevice();
    }
  }, [isAuthenticated]);

  const navigate = useCallback(
    (data: Record<string, unknown> | null | undefined) => {
      const route = routeFor(data ?? undefined);
      if (!route) {
        return;
      }
      if (!isAuthenticated) {
        // Signed out — hold it rather than bouncing off the auth gate.
        pending.current = route;
        return;
      }
      router.push(route as never);
    },
    [isAuthenticated, router],
  );

  // A tap while the app was running or backgrounded. Returns a no-op unsubscribe
  // where push is unavailable, so this needs no guard of its own.
  useEffect(() => onResponse(navigate), [navigate]);

  // A tap that launched the app from cold.
  useEffect(() => {
    let cancelled = false;
    void lastResponseData().then((data) => {
      if (!cancelled && data) {
        navigate(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Replays a tap that arrived before the student was signed in.
  useEffect(() => {
    if (isAuthenticated && pending.current) {
      const route = pending.current;
      pending.current = null;
      router.push(route as never);
    }
  }, [isAuthenticated, router]);

  const askPermission = useCallback(async () => {
    const allowed = await requestPermission();
    setGranted(allowed);

    if (allowed) {
      await registerDevice();
    }
    return allowed;
  }, []);

  const refresh = useCallback(async () => {
    setGranted(await permissionGranted());
  }, []);

  return (
    <NotificationsContext.Provider value={{ granted, supported, askPermission, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }
  return value;
}
