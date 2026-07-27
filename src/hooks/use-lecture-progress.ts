import { useEffect, useRef, useState } from 'react';

import { lecturesApi } from '@/api';
import type { LectureJobStatus } from '@/api/types';

const POLL_INTERVAL_MS = 3000;

/**
 * Polls a lecture's processing status until it reaches a terminal state.
 *
 * Transcription is a background job with no push channel, so the client has to
 * ask. Polling stops the moment the job finishes or fails, and on unmount, so a
 * screen left open does not keep hitting the gateway forever.
 */
export function useLectureProgress(lectureId: string | null | undefined, active: boolean) {
  const [status, setStatus] = useState<LectureJobStatus | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lectureId || !active) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const next = await lecturesApi.status(lectureId);
        if (cancelled) {
          return;
        }
        setStatus(next);

        if (!next.terminal) {
          timer.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // Transient failure — try again rather than abandoning the job the
        // student is watching.
        if (!cancelled) {
          timer.current = setTimeout(poll, POLL_INTERVAL_MS * 2);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [lectureId, active]);

  return status;
}
