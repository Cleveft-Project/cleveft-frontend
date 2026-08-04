/**
 * Wire types. These mirror the DTOs the Spring services return — if a field is
 * optional here it is because the backend can genuinely omit it.
 */

// ---------------------------------------------------------------- auth

/** The two self-serve tiers. Institutional/Teams/API are sold, not bought in-app. */
export type Plan = 'FREE' | 'PRO';

export type BillingPeriod = 'MONTHLY' | 'SEMESTER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  university?: string | null;
  programme?: string | null;
  /** Normalised course codes, e.g. ["CSM266", "PHY150"]. */
  courses?: string[];
  plan: Plan;
  /** Null on Free, and null on a Pro subscription that does not expire. */
  planRenewsAt?: string | null;
  /** Recordings a month. Null means unlimited. */
  monthlyRecordingLimit?: number | null;
  createdAt: string;
}

/** Recordings used against the plan allowance this period. */
export interface PlanUsage {
  plan: Plan;
  used: number;
  /** Null when the tier is unlimited. */
  limit?: number | null;
  remaining?: number | null;
  periodResetsAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// -------------------------------------------------------- transcription

export type LectureStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Where a lecture's words came from.
 *
 * Only describes how the transcript was obtained. Everything after that —
 * notes, chunks, quizzes, chat citations — is identical whichever this is.
 */
export type LectureSource = 'RECORDING' | 'PDF' | 'YOUTUBE';

export interface LectureSummary {
  id: string;
  title: string;
  courseCode?: string | null;
  durationSeconds?: number | null;
  status: LectureStatus;
  statusDetail?: string | null;
  source: LectureSource;
  /**
   * The lecture this was imported to help explain, or null if it stands alone.
   * Supporting material is excluded from exam readiness.
   */
  relatedLectureId?: string | null;
  totalChunks: number;
  /** Key-concept terms, shown as pills on the lecture card. */
  topics: string[];
  /** Canonical topic tags; shares a vocabulary with exam-prep mastery. */
  topicTags: string[];
  preview?: string | null;
  createdAt: string;
}

export interface LectureChunk {
  id: string;
  lectureId: string;
  chunkIndex: number;
  content: string;
  startTime?: number | null;
  endTime?: number | null;
  topicTag?: string | null;
}

export interface NoteSection {
  heading?: string;
  summary?: string;
  points?: string[];
}

export interface KeyConcept {
  term?: string;
  kind?: string;
  detail?: string;
}

export interface Lecture {
  id: string;
  title: string;
  courseCode?: string | null;
  language?: string | null;
  durationSeconds?: number | null;
  status: LectureStatus;
  statusDetail?: string | null;
  source: LectureSource;
  sourceUrl?: string | null;
  /** The lecture this was imported to help explain, or null. */
  relatedLectureId?: string | null;
  fullTranscript?: string | null;
  structuredNotes?: NoteSection[] | null;
  keyConcepts?: KeyConcept[] | null;
  totalChunks: number;
  chunks: LectureChunk[];
  createdAt: string;
  updatedAt: string;
}

export interface LectureJobStatus {
  id: string;
  status: LectureStatus;
  statusDetail?: string | null;
  progressPercent: number;
  terminal: boolean;
}

export interface LibraryStats {
  totalLectures: number;
  completedLectures: number;
  processingLectures: number;
  totalChunks: number;
}

// ---------------------------------------------------------------- chat

export interface Citation {
  index: number;
  lectureId: string;
  lectureTitle: string;
  chunkId: string;
  chunkIndex: number;
  startTime?: number | null;
  endTime?: number | null;
  snippet: string;
  similarity?: number | null;
}

export interface AnswerResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  grounded: boolean;
  citations: Citation[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  lectureId?: string | null;
  title?: string | null;
  /** Held above the date groups in history. */
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

// ------------------------------------------------------------ exam prep

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Which lecture this question came from. Matters for a course-wide quiz. */
  lectureId?: string | null;
  /** Only present after an attempt has been submitted. */
  correctIndex?: number | null;
  explanation?: string | null;
  topicTag?: string | null;
}

export interface Quiz {
  id: string;
  /** Null for a course-wide quiz. */
  lectureId?: string | null;
  /** Set instead of lectureId when the quiz spans a whole course. */
  courseCode?: string | null;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface GradedAnswer {
  questionId: string;
  selectedIndex?: number | null;
  correctIndex?: number | null;
  correct: boolean;
  topicTag?: string | null;
  explanation?: string | null;
  /** The lecture this question came from — mastery is credited to it. */
  lectureId?: string | null;
}

export interface AttemptResult {
  attemptId: string;
  quizId: string;
  lectureId?: string | null;
  courseCode?: string | null;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: GradedAnswer[];
  /** Topics this attempt got at least one question wrong on. */
  weakTopics: string[];
  /** Topics every question was answered correctly on. */
  strongTopics: string[];
  completedAt: string;
}

export interface TopicMastery {
  topic: string;
  masteryPercent: number;
  attempts: number;
  queryCount: number;
  lastQueried?: string | null;
}

/**
 * Readiness for one course.
 *
 * A student sits a separate exam per course, so this — not the blended overall
 * figure — is the number that tells them what to revise.
 */
/**
 * Readiness for one lecture — the level a quiz is actually taken at, and so
 * the only level where the score is measured rather than derived.
 */
export interface LectureReadiness {
  lectureId: string;
  title: string;
  readinessPercent: number;
  /** False when never quizzed. The percent is then 0 only for want of data. */
  assessed: boolean;
  topicsAssessed: number;
  quizzesTaken: number;
  weakAreas: TopicMastery[];
}

/**
 * Everything exam-prep knows about one lecture — what the lecture screen's
 * Exam prep tab renders. Scoped to the lecture so that screen never depends on
 * the rest of the library.
 */
export interface LectureExamPrep {
  lectureId: string;
  title: string;
  courseCode?: string | null;
  readinessPercent: number;
  verdict: string;
  assessed: boolean;
  topicsAssessed: number;
  quizzesTaken: number;
  weakAreas: TopicMastery[];
  strongAreas: TopicMastery[];
  /** Topics this lecture teaches that have never been tested or asked about. */
  blindSpots: string[];
  trend: { at: string; percentage: number }[];
}

export interface CourseReadiness {
  /** Normalised grouping key. Null for lectures with no course code. */
  courseCode?: string | null;
  /** The student's own spelling, for display. */
  courseLabel: string;
  readinessPercent: number;
  verdict: string;
  /** False when no lecture in this course has been quizzed yet. */
  assessed: boolean;
  lectureCount: number;
  topicsAssessed: number;
  quizzesTaken: number;
  weakAreas: TopicMastery[];
  strongAreas: TopicMastery[];
  /** The lectures making up this course, assessed first and weakest first. */
  lectures: LectureReadiness[];
}

export interface Readiness {
  readinessPercent: number;
  verdict: string;
  topicsAssessed: number;
  quizzesTaken: number;
  weakAreas: TopicMastery[];
  strongAreas: TopicMastery[];
  blindSpots: string[];
  trend: { at: string; percentage: number }[];
  /** Per-course breakdown, weakest course first. */
  courses: CourseReadiness[];
}

/**
 * One question asked on a topic, with the answer that was given.
 *
 * Assembled server-side from the attempt (what was chosen) and the quiz (what
 * was asked) — neither holds both.
 */
export interface TopicAnswer {
  questionId: string;
  prompt: string;
  options: string[];
  /** Null when the question was left unanswered. */
  selectedIndex?: number | null;
  correctIndex?: number | null;
  correct: boolean;
  explanation?: string | null;
  lectureId?: string | null;
  quizTitle?: string | null;
  answeredAt: string;
}

export interface ExamSummary {
  id: string;
  lectureId: string;
  summaryText?: string | null;
  keyConcepts?: { term?: string; detail?: string }[] | null;
  likelyExamTopics?: { topic?: string; reason?: string; likelihood?: string }[] | null;
  createdAt: string;
}

// -------------------------------------------------------------- collab

export type PeerStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
export type Visibility = 'PRIVATE' | 'PEERS' | 'PUBLIC';

export interface Peer {
  linkId: string;
  userId: string;
  fullName: string;
  email?: string | null;
  university?: string | null;
  programme?: string | null;
  status: PeerStatus;
  direction: 'INCOMING' | 'OUTGOING';
  since: string;
}

/**
 * Someone else's public profile, as the auth service exposes it.
 *
 * Course codes are public here on purpose — they are what lets one student see
 * another is in the same class. Nothing about anyone's recordings or results is
 * included.
 */
export interface PeerSummary {
  id: string;
  fullName: string;
  email?: string | null;
  university?: string | null;
  programme?: string | null;
  courses: string[];
}

/** One student's week on a course leaderboard. */
export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  rank: number;
  points: number;
  lectures: number;
  quizzes: number;
  questions: number;
  /** Pin and highlight this row. */
  isMe: boolean;
}

export interface Leaderboard {
  courseCode: string;
  weekStart: string;
  /** When the board clears. Shown as a countdown. */
  resetsAt: string;
  /** The cohort's middle score, so a middling rank can be read honestly. */
  median: number;
  entries: LeaderboardEntry[];
}

export interface PeerSearchResult {
  userId: string;
  fullName: string;
  email?: string | null;
  university?: string | null;
  programme?: string | null;
  relationship: PeerStatus | 'NONE';
  linkId?: string | null;
}

export interface PathStep {
  id: string;
  stepIndex: number;
  question: string;
  answerDigest?: string | null;
  lectureId?: string | null;
  note?: string | null;
}

export interface LearningPath {
  id: string;
  ownerId: string;
  ownerName?: string | null;
  title: string;
  description?: string | null;
  courseCode?: string | null;
  visibility: Visibility;
  adoptCount: number;
  stepCount: number;
  ownedByMe: boolean;
  adoptedByMe: boolean;
  myProgress?: number | null;
  steps: PathStep[];
  createdAt: string;
  updatedAt: string;
}

export interface SharedThread {
  id: string;
  ownerId: string;
  ownerName?: string | null;
  lectureId?: string | null;
  lectureTitle?: string | null;
  question: string;
  answer: string;
  citations: Record<string, unknown>[];
  visibility: Visibility;
  ownedByMe: boolean;
  createdAt: string;
}
