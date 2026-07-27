import type { LectureSummary } from '@/api/types';

/**
 * Course-code handling, mirroring CourseCodes.java on the exam-prep service.
 *
 * A course code is free text typed while a lecture is starting, so the same
 * course arrives as "EE355", "ee 355" and "EE-355". Grouping on the raw string
 * splits one course into three, and a per-course readiness score computed over
 * a third of the data is worse than none — it looks authoritative and is wrong.
 *
 * The two sides must agree on what counts as the same course, which is why the
 * rule is duplicated rather than inferred: strip everything that is not a
 * letter or digit, upper-case the rest.
 */

export function normaliseCourseCode(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const stripped = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return stripped || null;
}

export interface CourseOption {
  /** Grouping key. */
  code: string;
  /** The student's own spelling, as first entered. */
  label: string;
  lectureCount: number;
}

/**
 * The courses a student already has lectures for, most-used first.
 *
 * Derived from their own lectures rather than a managed course list: it needs
 * no new table, it is correct the moment they record anything, and a course
 * they stop using quietly falls off instead of lingering in a settings screen
 * they will never revisit.
 */
export function coursesFromLectures(lectures: LectureSummary[]): CourseOption[] {
  const byCode = new Map<string, CourseOption>();

  lectures.forEach((lecture) => {
    const code = normaliseCourseCode(lecture.courseCode);
    if (!code) {
      return;
    }
    const existing = byCode.get(code);
    if (existing) {
      existing.lectureCount += 1;
    } else {
      byCode.set(code, {
        code,
        // First spelling seen wins, so the chip does not flicker between
        // "EE 355" and "ee355" depending on listing order.
        label: (lecture.courseCode ?? '').trim().replace(/\s+/g, ' '),
        lectureCount: 1,
      });
    }
  });

  return [...byCode.values()].sort((a, b) => b.lectureCount - a.lectureCount);
}

/** Groups lectures under their course, ungrouped last. */
export function groupLecturesByCourse(
  lectures: LectureSummary[],
): { code: string | null; label: string; lectures: LectureSummary[] }[] {
  const groups = new Map<string, { code: string | null; label: string; lectures: LectureSummary[] }>();

  lectures.forEach((lecture) => {
    const code = normaliseCourseCode(lecture.courseCode);
    const key = code ?? '__UNGROUPED__';
    const existing = groups.get(key);
    if (existing) {
      existing.lectures.push(lecture);
    } else {
      groups.set(key, {
        code,
        label: code ? (lecture.courseCode ?? '').trim().replace(/\s+/g, ' ') : 'No course set',
        lectures: [lecture],
      });
    }
  });

  return [...groups.values()].sort((a, b) => {
    // Ungrouped last: it is a prompt to tidy up, not a course.
    if (!a.code) return 1;
    if (!b.code) return -1;
    return a.label.localeCompare(b.label);
  });
}
