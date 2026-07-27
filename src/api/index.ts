import { Platform } from 'react-native';

import { buildAudioPart, buildFilePart } from './audio-upload';
import { request, upload } from './client';
import type {
  AnswerResponse,
  AttemptResult,
  AuthResponse,
  BillingPeriod,
  ChatMessage,
  ConversationSummary,
  ExamSummary,
  LearningPath,
  Lecture,
  LectureJobStatus,
  LectureExamPrep,
  LectureSummary,
  LibraryStats,
  Peer,
  PeerSearchResult,
  Plan,
  PlanUsage,
  Quiz,
  Readiness,
  SharedThread,
  User,
  Visibility,
} from './types';

/**
 * Every backend call the app makes, grouped by the service that answers it.
 * Screens import from here and never build URLs themselves.
 */

export const authApi = {
  signUp(input: {
    fullName: string;
    email: string;
    password: string;
    university?: string;
    programme?: string;
  }) {
    return request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: input,
      anonymous: true,
    });
  },

  signIn(input: { email: string; password: string }) {
    return request<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: input,
      anonymous: true,
    });
  },

  logout(refreshToken: string) {
    return request<void>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      anonymous: true,
    });
  },

  me() {
    return request<User>('/api/auth/me');
  },

  updateProfile(input: { fullName?: string; university?: string; programme?: string }) {
    return request<User>('/api/auth/me', { method: 'PATCH', body: input });
  },

  /**
   * Moves the account between tiers and returns the updated user.
   *
   * There is no payment provider wired up yet — the backend records the tier
   * change directly. When one is added, this call is what its webhook triggers.
   */
  changePlan(plan: Plan, billingPeriod: BillingPeriod = 'MONTHLY') {
    return request<User>('/api/auth/me/plan', {
      method: 'POST',
      body: { plan, billingPeriod },
    });
  },
};

export const lecturesApi = {
  list() {
    return request<LectureSummary[]>('/api/v1/transcriptions');
  },

  stats() {
    return request<LibraryStats>('/api/v1/transcriptions/stats');
  },

  /** Recordings used this period against the caller's plan allowance. */
  usage() {
    return request<PlanUsage>('/api/v1/transcriptions/usage');
  },

  get(lectureId: string) {
    return request<Lecture>(`/api/v1/transcriptions/${lectureId}`);
  },

  status(lectureId: string) {
    return request<LectureJobStatus>(`/api/v1/transcriptions/${lectureId}/status`);
  },

  /**
   * Uploads a recording. Returns immediately with the lecture in PENDING —
   * poll {@link status} for progress.
   */
  async upload(input: {
    uri: string;
    /** Name without an extension; the real one is derived from the audio type. */
    baseName: string;
    /** Used on native, and as a fallback when the browser reports no blob type. */
    mimeType: string;
    title: string;
    courseCode?: string;
    durationSeconds?: number;
  }) {
    const audio = await buildAudioPart(input.uri, input.baseName, input.mimeType);

    const form = new FormData();
    // The part name must be exactly "file" — it is what the transcription
    // service's @RequestPart("file") binds to.
    if (Platform.OS === 'web') {
      form.append('file', audio.part, audio.fileName);
    } else {
      form.append('file', audio.part);
    }

    const params = new URLSearchParams({ title: input.title });
    if (input.courseCode) {
      params.append('courseCode', input.courseCode);
    }
    if (input.durationSeconds != null) {
      params.append('durationSeconds', String(Math.round(input.durationSeconds)));
    }

    return upload<Lecture>(`/api/v1/transcriptions?${params.toString()}`, form);
  },

  /**
   * Imports a PDF as a lecture.
   *
   * Returns immediately with the lecture in PENDING, exactly like an audio
   * upload — poll {@link status} for progress. No duration is sent because a
   * document has no length in seconds.
   */
  async importDocument(input: {
    uri: string;
    name: string;
    mimeType: string;
    title?: string;
    courseCode?: string;
  }) {
    // Built through the shared helper rather than by hand. Appending a plain
    // {uri, name, type} descriptor is the obvious thing and is wrong on both
    // platforms under Expo SDK 56 — see the note in audio-upload.ts.
    const file = await buildFilePart(input.uri, input.name, input.mimeType);

    const form = new FormData();
    if (Platform.OS === 'web') {
      form.append('file', file.part, file.fileName);
    } else {
      form.append('file', file.part);
    }

    const params = new URLSearchParams();
    if (input.title) {
      params.append('title', input.title);
    }
    if (input.courseCode) {
      params.append('courseCode', input.courseCode);
    }

    const query = params.toString();
    return upload<Lecture>(
      `/api/v1/transcriptions/documents${query ? `?${query}` : ''}`,
      form,
    );
  },

  /**
   * Re-runs the pipeline using the audio retained from the original upload.
   * Only valid for a lecture that isn't currently processing.
   */
  retry(lectureId: string) {
    return request<Lecture>(`/api/v1/transcriptions/${lectureId}/retry`, { method: 'POST' });
  },

  update(lectureId: string, input: { title?: string; courseCode?: string; fullTranscript?: string }) {
    return request<Lecture>(`/api/v1/transcriptions/${lectureId}`, {
      method: 'PATCH',
      body: input,
    });
  },

  remove(lectureId: string) {
    return request<void>(`/api/v1/transcriptions/${lectureId}`, { method: 'DELETE' });
  },
};

export const chatApi = {
  ask(input: { question: string; conversationId?: string; lectureId?: string }) {
    return request<AnswerResponse>('/api/v1/query', { method: 'POST', body: input });
  },

  conversations() {
    return request<ConversationSummary[]>('/api/v1/conversations');
  },

  messages(conversationId: string) {
    return request<ChatMessage[]>(`/api/v1/conversations/${conversationId}/messages`);
  },

  deleteConversation(conversationId: string) {
    return request<void>(`/api/v1/conversations/${conversationId}`, { method: 'DELETE' });
  },
};

export const examPrepApi = {
  /**
   * Generate a quiz on one lecture, or across a whole course.
   *
   * Exactly one of `lectureId` / `courseCode` must be given — the server
   * rejects both or neither rather than guessing which the student meant.
   */
  generateQuiz(input: {
    lectureId?: string;
    courseCode?: string;
    questionCount?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    focusOnWeakAreas?: boolean;
  }) {
    return request<Quiz>('/api/v1/examprep/quizzes', { method: 'POST', body: input });
  },

  listQuizzes(lectureId?: string) {
    const suffix = lectureId ? `?lectureId=${lectureId}` : '';
    return request<Quiz[]>(`/api/v1/examprep/quizzes${suffix}`);
  },

  getQuiz(quizId: string) {
    return request<Quiz>(`/api/v1/examprep/quizzes/${quizId}`);
  },

  submitAttempt(quizId: string, answers: { questionId: string; selectedIndex: number | null }[]) {
    return request<AttemptResult>(`/api/v1/examprep/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: { answers },
    });
  },

  attempts() {
    return request<AttemptResult[]>('/api/v1/examprep/attempts');
  },

  readiness() {
    return request<Readiness>('/api/v1/examprep/readiness');
  },

  /** Readiness, weak areas and blind spots for one lecture. */
  lectureReadiness(lectureId: string) {
    return request<LectureExamPrep>(`/api/v1/examprep/readiness/lectures/${lectureId}`);
  },

  summary(lectureId: string, refresh = false) {
    return request<ExamSummary>(
      `/api/v1/examprep/summaries/${lectureId}${refresh ? '?refresh=true' : ''}`,
    );
  },

  deleteQuiz(quizId: string) {
    return request<void>(`/api/v1/examprep/quizzes/${quizId}`, { method: 'DELETE' });
  },
};

export const collabApi = {
  peers() {
    return request<Peer[]>('/api/v1/collab/peers');
  },

  searchPeers(term: string) {
    return request<PeerSearchResult[]>(
      `/api/v1/collab/peers/search?q=${encodeURIComponent(term)}`,
    );
  },

  incomingRequests() {
    return request<Peer[]>('/api/v1/collab/peers/requests/incoming');
  },

  outgoingRequests() {
    return request<Peer[]>('/api/v1/collab/peers/requests/outgoing');
  },

  requestPeer(addresseeId: string) {
    return request<Peer>('/api/v1/collab/peers/requests', {
      method: 'POST',
      body: { addresseeId },
    });
  },

  acceptRequest(linkId: string) {
    return request<Peer>(`/api/v1/collab/peers/requests/${linkId}/accept`, { method: 'POST' });
  },

  declineRequest(linkId: string) {
    return request<Peer>(`/api/v1/collab/peers/requests/${linkId}/decline`, { method: 'POST' });
  },

  removePeer(linkId: string) {
    return request<void>(`/api/v1/collab/peers/${linkId}`, { method: 'DELETE' });
  },

  myPaths() {
    return request<LearningPath[]>('/api/v1/collab/paths');
  },

  discoverPaths() {
    return request<LearningPath[]>('/api/v1/collab/paths/discover');
  },

  adoptedPaths() {
    return request<LearningPath[]>('/api/v1/collab/paths/adopted');
  },

  getPath(pathId: string) {
    return request<LearningPath>(`/api/v1/collab/paths/${pathId}`);
  },

  createPath(input: {
    title: string;
    description?: string;
    courseCode?: string;
    visibility?: Visibility;
    steps: { question: string; answerDigest?: string; lectureId?: string; note?: string }[];
  }) {
    return request<LearningPath>('/api/v1/collab/paths', { method: 'POST', body: input });
  },

  adoptPath(pathId: string) {
    return request<LearningPath>(`/api/v1/collab/paths/${pathId}/adopt`, { method: 'POST' });
  },

  updateProgress(pathId: string, progressStep: number) {
    return request<LearningPath>(`/api/v1/collab/paths/${pathId}/progress`, {
      method: 'PATCH',
      body: { progressStep },
    });
  },

  deletePath(pathId: string) {
    return request<void>(`/api/v1/collab/paths/${pathId}`, { method: 'DELETE' });
  },

  shareThread(input: {
    question: string;
    answer: string;
    lectureId?: string;
    lectureTitle?: string;
    citations?: Record<string, unknown>[];
    visibility?: Visibility;
  }) {
    return request<SharedThread>('/api/v1/collab/threads', { method: 'POST', body: input });
  },

  myThreads() {
    return request<SharedThread[]>('/api/v1/collab/threads');
  },

  feed() {
    return request<SharedThread[]>('/api/v1/collab/threads/feed');
  },

  deleteThread(threadId: string) {
    return request<void>(`/api/v1/collab/threads/${threadId}`, { method: 'DELETE' });
  },
};

export { ApiError, BASE_URL, setSessionExpiredHandler } from './client';
export * from './types';
