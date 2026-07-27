import { tokenStore } from './tokens';
import type { AuthResponse } from './types';

/**
 * The single HTTP client for the app.
 *
 * Everything goes through the gateway on :8080. Screens never call a
 * microservice port directly — the gateway is what validates the token and
 * injects the trusted identity header downstream.
 */

const RAW_BASE_URL = process.env.EXPO_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';
export const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isOffline(): boolean {
    return this.status === 0;
  }

  /**
   * The plan's allowance is used up. Distinct from a plain 403: the action is
   * permitted, it just needs a paid tier — so the app offers an upgrade rather
   * than saying no.
   */
  get isQuotaExceeded(): boolean {
    return this.status === 402;
  }
}

/** Called when the session cannot be recovered, so the app can sign out. */
type SessionExpiredHandler = () => void;

let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

/**
 * In-flight refresh, shared across callers.
 *
 * Without this, a screen firing four requests at once on a stale token would
 * kick off four refreshes; three of them would present a token the server has
 * already rotated away, and the user would be logged out mid-session.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const session = await tokenStore.load();
      if (!session) {
        return null;
      }

      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const refreshed = (await response.json()) as AuthResponse;
      await tokenStore.save({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user: refreshed.user,
      });
      return refreshed.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header (signup, signin, refresh). */
  anonymous?: boolean;
  signal?: AbortSignal;
  /** Internal: prevents a refresh loop. */
  isRetry?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let fieldErrors: Record<string, string> | undefined;

  try {
    const body = await response.json();
    if (typeof body?.message === 'string') {
      message = body.message;
    }
    if (body?.fieldErrors && typeof body.fieldErrors === 'object') {
      fieldErrors = body.fieldErrors;
    }
  } catch {
    // Non-JSON error body (a gateway 502 page, say). Keep the default message.
  }

  return new ApiError(response.status, message, fieldErrors);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, signal, isRetry = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!anonymous) {
    const session = await tokenStore.load();
    if (session) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }
    // fetch only rejects on a transport failure, so this is genuinely "no
    // connection" rather than a bad response.
    throw new ApiError(
      0,
      "Can't reach Cleveft. Check your connection and that the gateway is running.",
    );
  }

  // One retry after a refresh. If that still 401s, the session is truly gone.
  if (response.status === 401 && !anonymous && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { ...options, isRetry: true });
    }
    await tokenStore.clear();
    onSessionExpired();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Multipart upload, used for lecture audio.
 *
 * Built by hand rather than through {@link request} because the body must stay
 * a FormData: letting fetch set its own multipart boundary is the only reliable
 * way to upload a file from React Native.
 */
export async function upload<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal; isRetry?: boolean } = {},
): Promise<T> {
  const session = await tokenStore.load();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (session) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw error;
    }

    /*
     * The real reason, not just "check your connection".
     *
     * Everything that goes wrong before a response arrives lands here, and the
     * causes are not all network problems: Expo's FormData throws
     * "Unsupported FormDataPart implementation" for a part it cannot read, and
     * expo-file-system throws if the URI does not resolve. Collapsing all of
     * that into one friendly sentence cost an evening of guessing, because the
     * message pointed at the one thing that was fine.
     */
    const detail = (error as Error)?.message ?? String(error);
    console.warn(`[upload] ${path} failed before any response:`, error);

    throw new ApiError(0, `Upload failed: ${detail}`);
  }

  if (response.status === 401 && !options.isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return upload<T>(path, formData, { ...options, isRetry: true });
    }
    await tokenStore.clear();
    onSessionExpired();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
}
