/**
 * How a quiz is named in the UI.
 *
 * The exam-prep service stores a title chosen when the quiz was generated, from
 * whatever the lecture was called at that moment. It owns a different schema
 * and never hears about a rename, so that stored title goes stale the first
 * time a student renames the lecture — and stays wrong forever.
 *
 * Deriving the name at render time removes the problem rather than papering
 * over it: there is no second copy to drift. The stored title is only a
 * fallback for when the lecture cannot be resolved (deleted, or the list has
 * not loaded yet).
 *
 * Two quizzes from one lecture therefore read identically. That is expected —
 * the difficulty and date shown alongside are what tell them apart.
 */
export function quizDisplayTitle(
  lectureTitle: string | null | undefined,
  storedTitle: string | null | undefined,
): string {
  if (lectureTitle && lectureTitle.trim()) {
    return `${lectureTitle.trim()} — practice quiz`;
  }
  return storedTitle?.trim() || 'Practice quiz';
}

/**
 * Short date for the quiz card, e.g. "24 Jul".
 *
 * Deliberately not the year: every quiz a student is looking at is from this
 * academic year, so the year is noise that pushes the useful part off the pill.
 */
export function quizDateLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
