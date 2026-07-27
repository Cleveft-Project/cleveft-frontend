import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

/**
 * Loads data on mount and exposes a reload for pull-to-refresh.
 *
 * A reload keeps the previous data on screen and flips {@code isRefreshing}
 * instead of {@code isLoading}, so refreshing a list never blanks it out.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: enabled,
    isRefreshing: false,
    error: null,
  });

  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    setState((previous) => ({
      ...previous,
      isLoading: mode === 'initial',
      isRefreshing: mode === 'refresh',
      error: null,
    }));

    try {
      const data = await loaderRef.current();
      if (mounted.current) {
        setState({ data, isLoading: false, isRefreshing: false, error: null });
      }
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      // A 401 is already being handled globally (the session is cleared and the
      // guard redirects), so surfacing it here would flash an error mid-exit.
      if (error instanceof ApiError && error.isAuthError) {
        setState((previous) => ({ ...previous, isLoading: false, isRefreshing: false }));
        return;
      }
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Something went wrong.',
      }));
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void run('initial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const reload = useCallback(() => run('refresh'), [run]);

  const setData = useCallback((updater: (previous: T | null) => T | null) => {
    setState((previous) => ({ ...previous, data: updater(previous.data) }));
  }, []);

  return { ...state, reload, setData };
}
