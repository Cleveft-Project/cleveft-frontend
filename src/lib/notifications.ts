import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { authApi } from '@/api';

/**
 * Push notifications: permission, registration, and what a tap opens.
 *
 * <p><b>expo-notifications is loaded lazily, and that is not an optimisation.</b>
 * Remote push was removed from Expo Go on Android in SDK 53, and the module
 * throws while it is being <em>evaluated</em> rather than when a function is
 * called. A top-level import therefore crashes the whole app on launch in Expo
 * Go — not the notification feature, the app — because the import chain reaches
 * it from the root layout.
 *
 * <p>Deferring the require to first use means Expo Go never evaluates the module
 * and the app runs normally with notifications quietly absent, while a
 * development or preview build gets the real thing. That matters because Expo Go
 * is where the app is developed and the APK is what ships; both have to work.
 *
 * <p>Every function here is safe to call when notifications cannot work — Expo
 * Go, a simulator, a denied permission, a build with no EAS project. They return
 * quietly instead of throwing, because none of this is worth interrupting a
 * student who is trying to record a lecture.
 */

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go reports itself as {@code storeClient}. Checked before the require
 * rather than catching the failure afterwards, because the module has side
 * effects during evaluation and a partially-evaluated one is worse than one that
 * was never touched.
 */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** undefined = not tried yet, null = tried and unavailable. */
let cached: NotificationsModule | null | undefined;

function notifications(): NotificationsModule | null {
  if (cached !== undefined) {
    return cached;
  }
  if (IS_EXPO_GO) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether push can work at all in this build. */
export function isSupported(): boolean {
  return notifications() !== null;
}

/**
 * How a notification behaves while the app is open, and the Android channel.
 *
 * <p>Called once from the provider rather than run as a module side effect —
 * side effects at import time are exactly what made this module unsafe to load.
 *
 * <p>Foreground notifications show but stay silent: a sound for something the
 * student is already looking at is noise.
 */
export async function configure() {
  const N = notifications();
  if (!N) {
    return;
  }

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // Android silently drops heads-up display and sound for a notification with
    // no channel, which looks exactly like the push having failed. The name is
    // what the student sees in system settings, so it is written for them.
    await N.setNotificationChannelAsync('default', {
      name: 'Lectures and reminders',
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#00FF87',
    });
  } catch {
    // A channel that cannot be created is not a reason to fail a launch.
  }
}

/** Whether the OS currently allows notifications. Null if it cannot be asked. */
export async function permissionGranted(): Promise<boolean | null> {
  const N = notifications();
  if (!N) {
    return null;
  }
  try {
    const { status } = await N.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return null;
  }
}

/**
 * Asks the OS, once.
 *
 * <p>Deliberately not called on launch. A permission prompt shown before the app
 * has done anything is a prompt with no reason attached, most people decline it,
 * and on iOS that answer can only be changed in system settings afterwards.
 * Asking after a first lecture finishes attaches the request to the thing it is
 * for.
 *
 * @returns whether notifications are now allowed
 */
export async function requestPermission(): Promise<boolean> {
  const N = notifications();
  if (!N || !Device.isDevice) {
    // Simulators have no push service to register with.
    return false;
  }

  try {
    const existing = await N.getPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }
    // Never ask twice. On iOS a second request does not show a dialog at all, it
    // just returns the previous answer, so re-prompting costs a moment and
    // teaches nothing.
    if (!existing.canAskAgain) {
      return false;
    }

    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function currentToken(): Promise<string | null> {
  const N = notifications();
  if (!N) {
    return null;
  }

  const id = projectId();
  if (!id) {
    // Required by Expo's push service outside a classic Expo Go session. Worth a
    // clear log rather than a silent null: the fix is one command (`eas init`)
    // and nothing about the symptom points at it.
    console.warn(
      'No EAS project id, so this device cannot receive push notifications. Run `eas init`.',
    );
    return null;
  }

  try {
    const { data } = await N.getExpoPushTokenAsync({ projectId: id });
    return data;
  } catch (error) {
    console.warn('Could not read this device push token', error);
    return null;
  }
}

/**
 * Tells the server which phone this is.
 *
 * <p>Called on every sign-in and whenever the OS issues a new token, which it
 * may do at any time. The server treats a known token as a refresh, so calling
 * this more often than necessary is harmless.
 *
 * <p>The timezone rides along because this is the one call the device reliably
 * makes, and the device is the only thing that knows it.
 */
export async function registerDevice(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  if ((await permissionGranted()) !== true) {
    return null;
  }

  const token = await currentToken();
  if (!token) {
    return null;
  }

  try {
    await authApi.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return token;
  } catch (error) {
    console.warn('Could not register this device for notifications', error);
    return null;
  }
}

/**
 * Stops pushes to this phone.
 *
 * <p>Called on sign-out, scoped to the one device — so signing out on a borrowed
 * handset does not silence the student's own, and more importantly so the next
 * person to sign in here does not receive the previous one's lectures.
 */
export async function unregisterDevice() {
  try {
    const token = await currentToken();
    if (token) {
      await authApi.unregisterDevice(token);
    }
  } catch {
    // Sign-out must never fail because of this. The server prunes tokens the
    // push service reports as dead anyway, so the worst case resolves itself.
  }
}

/** A tapped notification, while the app was running or backgrounded. */
export function onResponse(handler: (data: Record<string, unknown>) => void): () => void {
  const N = notifications();
  if (!N) {
    return () => {};
  }
  const subscription = N.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => subscription.remove();
}

/** The tap that launched the app from cold, if there was one. */
export async function lastResponseData(): Promise<Record<string, unknown> | null> {
  const N = notifications();
  if (!N) {
    return null;
  }
  try {
    const response = await N.getLastNotificationResponseAsync();
    return response
      ? ((response.notification.request.content.data ?? {}) as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Where a tapped notification should land.
 *
 * <p>Every push carries the screen it belongs to. One that opens the home screen
 * and leaves the student to find what it was about has wasted the single moment
 * it had their attention.
 */
export function routeFor(data: Record<string, unknown> | undefined): string | null {
  if (!data) {
    return null;
  }

  switch (data.screen) {
    case 'transcript':
      return data.lectureId ? `/transcript?lectureId=${data.lectureId}` : null;
    // Paths and peer requests both live inside the collab tab rather than on
    // screens of their own, so both land there.
    case 'path':
    case 'circle':
      return '/(tabs)/collab';
    case 'exams':
      return '/(tabs)/examprep';
    case 'home':
      return '/(tabs)/home';
    default:
      return null;
  }
}
