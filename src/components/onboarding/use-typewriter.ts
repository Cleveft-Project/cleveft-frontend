import { useEffect, useRef, useState } from 'react';

/**
 * Types a string out one character at a time, then reports that it finished.
 *
 * <p>Typing is the reason the first onboarding page reads as alive while the
 * others read as illustrations: a thing being written implies something is
 * happening now, where a thing already written is just a picture of a result.
 *
 * <p>Timers are held in a ref and cleared on unmount, because these components
 * are mounted and unmounted every time the student swipes between pages — a
 * stray interval would keep setting state on a screen that has gone.
 *
 * @param text      what to type
 * @param speed     milliseconds per character
 * @param delay     how long to wait before the first character
 * @param active    false pauses at empty, so a page can hold until it is shown
 */
export function useTypewriter(
  text: string,
  { speed = 32, delay = 0, active = true }: { speed?: number; delay?: number; active?: boolean } = {},
) {
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setTyped('');
    setDone(false);

    if (!active || !text) {
      return undefined;
    }

    for (let i = 1; i <= text.length; i++) {
      timers.current.push(setTimeout(() => setTyped(text.slice(0, i)), delay + i * speed));
    }
    timers.current.push(setTimeout(() => setDone(true), delay + text.length * speed));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [active, delay, speed, text]);

  return { typed, done, typing: !done && typed.length > 0 };
}
