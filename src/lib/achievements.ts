import type { LectureSummary, Readiness } from '@/api/types';

/**
 * What a student has earned, and what they are close to earning.
 *
 * <p>Every achievement is derived from data Cleveft already holds — lectures,
 * quiz results, the streak, peers. Nothing is stored server-side and nothing is
 * awarded by a background job: the set is recomputed from current facts each
 * time it is read. That means it can never drift out of step with reality, and
 * a student who deletes a lecture sees the count go down, which is the honest
 * behaviour even if it stings.
 *
 * <p>The locked ones carry progress deliberately. A profile showing two earned
 * badges looks like an empty room; the same profile showing "7 of 10 lectures"
 * reads as a place someone is getting somewhere.
 */

export type Rarity = 'everyday' | 'notable' | 'landmark';

export type Category = 'study' | 'quiz' | 'streak' | 'mastery' | 'social';

export interface Achievement {
  id: string;
  title: string;
  /** What earns it, in the second person. */
  detail: string;
  category: Category;
  rarity: Rarity;
  /** How far along, 0–1. */
  progress: number;
  earned: boolean;
  /** "7 / 10", shown under the bar. Omitted for one-shot achievements. */
  tally?: string;
}

/** Everything the set is computed from. */
export interface AchievementInput {
  lectures: LectureSummary[];
  readiness: Readiness | null;
  streakDays: number;
  peerCount: number;
}

/**
 * A counting achievement.
 *
 * <p>Progress is capped at 1 rather than allowed to exceed it, so a student with
 * 80 lectures does not see "800%" on the ten-lecture badge.
 */
function counted(
  id: string,
  title: string,
  detail: string,
  category: Category,
  rarity: Rarity,
  have: number,
  need: number,
): Achievement {
  const progress = need <= 0 ? 1 : Math.min(1, have / need);
  return {
    id,
    title,
    detail,
    category,
    rarity,
    progress,
    earned: have >= need,
    tally: `${Math.min(have, need)} / ${need}`,
  };
}

/** A one-shot achievement: you have done the thing or you have not. */
function done(
  id: string,
  title: string,
  detail: string,
  category: Category,
  rarity: Rarity,
  earned: boolean,
): Achievement {
  return { id, title, detail, category, rarity, progress: earned ? 1 : 0, earned };
}

export function buildAchievements(input: AchievementInput): Achievement[] {
  const { lectures, readiness, streakDays, peerCount } = input;

  const recordings = lectures.filter((l) => l.source === 'RECORDING').length;
  const imports = lectures.filter((l) => l.source !== 'RECORDING').length;
  const total = lectures.length;

  // Recorded time, in hours. Imports have no duration and are excluded rather
  // than counted as zero-length, which would make the average meaningless.
  const hours =
    lectures.reduce((sum, l) => sum + (l.durationSeconds ?? 0), 0) / 3600;

  const quizzes = readiness?.quizzesTaken ?? 0;
  const understood = readiness?.strongAreas?.length ?? 0;
  const score = readiness?.readinessPercent ?? 0;

  return [
    /* Study */
    done('first-lecture', 'First steps', 'Record or import your first lecture',
      'study', 'everyday', total >= 1),
    counted('ten-lectures', 'Building a library', 'Collect ten lectures',
      'study', 'notable', total, 10),
    counted('fifty-lectures', 'Full semester', 'Collect fifty lectures',
      'study', 'landmark', total, 50),
    done('first-import', 'Come prepared', 'Import a PDF or a video',
      'study', 'everyday', imports >= 1),
    counted('ten-hours', 'Ten hours in', 'Record ten hours of lectures',
      'study', 'notable', Math.floor(hours), 10),

    /* Quiz */
    done('first-quiz', 'Tested', 'Take your first quiz',
      'quiz', 'everyday', quizzes >= 1),
    counted('twenty-quizzes', 'Well drilled', 'Take twenty quizzes',
      'quiz', 'notable', quizzes, 20),
    done('perfect-quiz', 'Flawless', 'Score full marks on a quiz',
      'quiz', 'landmark', (readiness?.trend ?? []).some((point) => point.percentage === 100)),

    /* Streak */
    counted('streak-3', 'Getting going', 'Study three days running',
      'streak', 'everyday', streakDays, 3),
    counted('streak-7', 'A proper habit', 'Study seven days running',
      'streak', 'notable', streakDays, 7),
    counted('streak-30', 'Unbroken', 'Study thirty days running',
      'streak', 'landmark', streakDays, 30),

    /* Mastery */
    counted('ten-topics', 'It is sticking', 'Understand ten topics',
      'mastery', 'notable', understood, 10),
    counted('ready-80', 'Exam ready', 'Reach eighty percent readiness',
      'mastery', 'landmark', score, 80),

    /* Social */
    done('first-peer', 'Not alone', 'Connect with a coursemate',
      'social', 'everyday', peerCount >= 1),
    counted('five-peers', 'Study circle', 'Connect with five coursemates',
      'social', 'notable', peerCount, 5),
  ];
}

/** Counts per category, for the filter chips. */
export function countByCategory(all: Achievement[]) {
  const counts: Record<Category, number> = {
    study: 0, quiz: 0, streak: 0, mastery: 0, social: 0,
  };
  all.forEach((item) => {
    counts[item.category]++;
  });
  return counts;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  study: 'Study',
  quiz: 'Quiz',
  streak: 'Streak',
  mastery: 'Mastery',
  social: 'Social',
};

/**
 * Deliberately not Common / Rare / Epic.
 *
 * <p>That ladder is the loot table from every game of the last twenty years, and
 * borrowing it wholesale makes an academic app look like it was assembled from
 * parts. These say the same thing in the register of study rather than of
 * dungeons.
 */
export const RARITY_LABELS: Record<Rarity, string> = {
  everyday: 'Everyday',
  notable: 'Notable',
  landmark: 'Landmark',
};
