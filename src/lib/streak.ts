/**
 * Study streaks, derived rather than stored.
 *
 * There is no `streaks` table and no new endpoint. A day counts as studied if
 * the student did something the app already records — recorded a lecture,
 * asked a question, or took a quiz — so the streak is computed from timestamps
 * that already exist. That means it is retroactively correct the day it ships
 * (nobody starts at zero for work they already did), it cannot drift out of
 * sync with reality, and it survives a reinstall.
 *
 * What deliberately does NOT count: opening the app. A streak that rewards
 * launching rather than studying trains the habit of launching.
 */

export interface StreakSummary {
  /** Consecutive studied days ending today or yesterday. */
  current: number;
  /** Best run ever. Kept visible so a broken streak still leaves something. */
  longest: number;
  /** Has the student done something today? */
  activeToday: boolean;
  /**
   * True when a streak is running but today is not yet studied — the only
   * moment the card has any reason to ask for attention.
   */
  atRisk: boolean;
  /** Oldest-to-newest, ending today. */
  lastSevenDays: { key: string; date: Date; active: boolean; isToday: boolean }[];
  /** Total distinct days studied, all time. */
  totalDays: number;
}

/** Local-time day key. UTC would roll the streak over mid-evening in Ghana. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

export function computeStreak(timestamps: (string | null | undefined)[], now = new Date()): StreakSummary {
  const days = new Set<string>();
  timestamps.forEach((raw) => {
    if (!raw) {
      return;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      days.add(dayKey(parsed));
    }
  });

  const today = dayKey(now);
  const yesterday = dayKey(addDays(now, -1));
  const activeToday = days.has(today);

  // Counting back from yesterday when today is empty is what stops the streak
  // collapsing the moment midnight passes. The student still has all of today
  // to keep it; showing it as already lost at 00:01 would be a lie.
  let cursor = activeToday ? new Date(now) : days.has(yesterday) ? addDays(now, -1) : null;
  let current = 0;
  while (cursor && days.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run, walking the sorted set once.
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  sorted.forEach((key) => {
    if (previous && dayKey(addDays(new Date(`${previous}T12:00:00`), 1)) === key) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = key;
  });

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    const key = dayKey(date);
    return { key, date, active: days.has(key), isToday: key === today };
  });

  return {
    current,
    longest: Math.max(longest, current),
    activeToday,
    atRisk: current > 0 && !activeToday,
    lastSevenDays,
    totalDays: days.size,
  };
}

export interface Milestone {
  days: number;
  title: string;
  blurb: string;
  icon: 'flame-outline' | 'ribbon-outline' | 'medal-outline' | 'trophy-outline';
}

/**
 * Deliberately shallow. Milestones past a month stop being motivating and
 * start being a reason to give up after one missed day.
 */
export const MILESTONES: Milestone[] = [
  { days: 3, title: 'Warming up', blurb: 'Three days in a row', icon: 'flame-outline' },
  { days: 7, title: 'A full week', blurb: 'Seven days without a gap', icon: 'ribbon-outline' },
  { days: 14, title: 'Fortnight', blurb: 'Two solid weeks', icon: 'medal-outline' },
  { days: 30, title: 'A month deep', blurb: 'Thirty days of showing up', icon: 'trophy-outline' },
];

export function nextMilestone(current: number): Milestone | null {
  return MILESTONES.find((milestone) => milestone.days > current) ?? null;
}
