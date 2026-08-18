/**
 * Continue Where You Left Off + Daily Goal helpers for the student dashboard.
 * Derived from QuizAttempt / QuestionResponse — no extra progress tables.
 */

export type ContinueLearningPayload = {
  paperId: string;
  paperCode: string;
  paperTitle: string;
  status:
    | "unfinished"
    | "continue_next"
    | "all_complete"
    | "ready_to_start"
    | "no_syllabus";
  lastCompleted: {
    categoryId: string;
    categoryTitle: string;
    subCategoryId: string;
    subCategoryTitle: string;
  } | null;
  upNext: {
    categoryId: string;
    categoryTitle: string;
    subCategoryId: string;
    subCategoryTitle: string;
  } | null;
  href: string | null;
  progressPercent: number;
  chaptersCompleted: number;
  chaptersTotal: number;
};

export type DailyGoalPayload = {
  dateKey: string;
  timezone: string;
  questions: { current: number; target: number };
  weakTopic: { current: number; target: number };
  quizScore: { current: number; target: number; threshold: number };
  goalsCompleted: number;
  goalsTotal: number;
  overallPercent: number;
  completed: boolean;
};

type SyllabusChapter = {
  categoryId: string;
  categoryTitle: string;
  categoryOrder: number;
  subCategoryId: string;
  subCategoryTitle: string;
  subCategoryOrder: number;
};

type AnsweredResponse = {
  isCorrect: boolean;
  selectedOptionId: string | null;
  selectedOptionIds: string[];
  answeredAt: Date | null;
  subCategory: {
    id: string;
    title: string;
    category: { id: string; title: string; paperId: string; order: number };
    order: number;
  } | null;
};

type PracticeAttemptLike = {
  id: string;
  paperId: string;
  status: string;
  mockExamId: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  scorePercent: number | null;
  responses: AnsweredResponse[];
};

const QUESTIONS_TARGET = 10;
const WEAK_TOPIC_TARGET = 1;
const QUIZ_SCORE_THRESHOLD = 80;
const GOALS_TOTAL = 3;

function responseWasAnswered(resp: {
  selectedOptionId: string | null;
  selectedOptionIds: string[];
}): boolean {
  return Boolean(resp.selectedOptionId) || resp.selectedOptionIds.length > 0;
}

/** Local calendar date key (YYYY-MM-DD) — avoids UTC day-shift for UK evenings. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local calendar-day bounds (matches partner dashboard day handling). */
export function getLocalDayBounds(now = new Date()): {
  start: Date;
  end: Date;
  dateKey: string;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end, dateKey: toLocalDateKey(start) };
}

export function buildSyllabus(
  paper: {
    categories: Array<{
      id: string;
      title: string;
      order: number;
      subCategories: Array<{ id: string; title: string; order: number }>;
    }>;
  }
): SyllabusChapter[] {
  const chapters: SyllabusChapter[] = [];
  const categories = [...paper.categories].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title)
  );
  for (const category of categories) {
    const subs = [...category.subCategories].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title)
    );
    for (const sub of subs) {
      chapters.push({
        categoryId: category.id,
        categoryTitle: category.title,
        categoryOrder: category.order,
        subCategoryId: sub.id,
        subCategoryTitle: sub.title,
        subCategoryOrder: sub.order,
      });
    }
  }
  return chapters;
}

function practiceHref(
  paperId: string,
  categoryId: string,
  subCategoryId: string
): string {
  const params = new URLSearchParams({
    paperId,
    categoryId,
    subCategoryId,
  });
  return `/dashboard/quiz?${params.toString()}`;
}

function chapterRef(ch: SyllabusChapter) {
  return {
    categoryId: ch.categoryId,
    categoryTitle: ch.categoryTitle,
    subCategoryId: ch.subCategoryId,
    subCategoryTitle: ch.subCategoryTitle,
  };
}

/**
 * Resolve subcategory for an IN_PROGRESS attempt from its question links
 * (responses are created at start even before answers).
 */
function resolveAttemptChapter(
  attempt: PracticeAttemptLike,
  syllabusById: Map<string, SyllabusChapter>
): SyllabusChapter | null {
  for (const resp of attempt.responses) {
    const sc = resp.subCategory;
    if (!sc) continue;
    const fromSyllabus = syllabusById.get(sc.id);
    if (fromSyllabus) return fromSyllabus;
    return {
      categoryId: sc.category.id,
      categoryTitle: sc.category.title,
      categoryOrder: sc.category.order,
      subCategoryId: sc.id,
      subCategoryTitle: sc.title,
      subCategoryOrder: sc.order,
    };
  }
  return null;
}

export function computeContinueLearning(input: {
  paperId: string;
  paperCode: string;
  paperTitle: string;
  syllabus: SyllabusChapter[];
  submittedPracticeAttempts: PracticeAttemptLike[];
  inProgressPracticeAttempts: PracticeAttemptLike[];
}): ContinueLearningPayload {
  const { paperId, paperCode, paperTitle, syllabus } = input;
  const syllabusById = new Map(syllabus.map((c) => [c.subCategoryId, c]));
  const chaptersTotal = syllabus.length;

  if (chaptersTotal === 0) {
    return {
      paperId,
      paperCode,
      paperTitle,
      status: "no_syllabus",
      lastCompleted: null,
      upNext: null,
      href: null,
      progressPercent: 0,
      chaptersCompleted: 0,
      chaptersTotal: 0,
    };
  }

  // 1) Most recent unfinished practice session for this paper
  const unfinished = [...input.inProgressPracticeAttempts]
    .filter((a) => a.paperId === paperId && !a.mockExamId && a.status === "IN_PROGRESS")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  if (unfinished) {
    const chapter = resolveAttemptChapter(unfinished, syllabusById);
    if (chapter) {
      const idx = syllabus.findIndex((c) => c.subCategoryId === chapter.subCategoryId);
      const lastCompleted = idx > 0 ? chapterRef(syllabus[idx - 1]) : null;
      const completedIds = collectCompletedSubCategoryIds(
        input.submittedPracticeAttempts,
        paperId
      );
      return {
        paperId,
        paperCode,
        paperTitle,
        status: "unfinished",
        lastCompleted,
        upNext: chapterRef(chapter),
        href: practiceHref(paperId, chapter.categoryId, chapter.subCategoryId),
        progressPercent: Math.round((completedIds.size / chaptersTotal) * 100),
        chaptersCompleted: completedIds.size,
        chaptersTotal,
      };
    }
  }

  // 2) Last completed (by most recent activity), then walk syllabus for next incomplete
  const completedMeta = collectCompletedWithLatest(
    input.submittedPracticeAttempts,
    paperId
  );
  const completedIds = new Set(completedMeta.keys());
  const chaptersCompleted = [...completedIds].filter((id) =>
    syllabusById.has(id)
  ).length;
  const progressPercent =
    chaptersTotal > 0 ? Math.round((chaptersCompleted / chaptersTotal) * 100) : 0;

  if (completedIds.size === 0) {
    const first = syllabus[0];
    return {
      paperId,
      paperCode,
      paperTitle,
      status: "ready_to_start",
      lastCompleted: null,
      upNext: chapterRef(first),
      href: practiceHref(paperId, first.categoryId, first.subCategoryId),
      progressPercent: 0,
      chaptersCompleted: 0,
      chaptersTotal,
    };
  }

  let lastCompletedChapter: SyllabusChapter | null = null;
  let lastCompletedAt = 0;
  for (const ch of syllabus) {
    const at = completedMeta.get(ch.subCategoryId);
    if (at != null && at >= lastCompletedAt) {
      lastCompletedAt = at;
      lastCompletedChapter = ch;
    }
  }

  if (!lastCompletedChapter) {
    const first = syllabus[0];
    return {
      paperId,
      paperCode,
      paperTitle,
      status: "ready_to_start",
      lastCompleted: null,
      upNext: chapterRef(first),
      href: practiceHref(paperId, first.categoryId, first.subCategoryId),
      progressPercent,
      chaptersCompleted,
      chaptersTotal,
    };
  }

  const lastIdx = syllabus.findIndex(
    (c) => c.subCategoryId === lastCompletedChapter!.subCategoryId
  );
  let upNext: SyllabusChapter | null = null;
  for (let i = lastIdx + 1; i < syllabus.length; i++) {
    if (!completedIds.has(syllabus[i].subCategoryId)) {
      upNext = syllabus[i];
      break;
    }
  }
  // If everything after last-completed is done, find any earlier incomplete
  if (!upNext) {
    for (const ch of syllabus) {
      if (!completedIds.has(ch.subCategoryId)) {
        upNext = ch;
        break;
      }
    }
  }

  if (!upNext) {
    return {
      paperId,
      paperCode,
      paperTitle,
      status: "all_complete",
      lastCompleted: chapterRef(lastCompletedChapter),
      upNext: null,
      href: null,
      progressPercent: 100,
      chaptersCompleted,
      chaptersTotal,
    };
  }

  return {
    paperId,
    paperCode,
    paperTitle,
    status: "continue_next",
    lastCompleted: chapterRef(lastCompletedChapter),
    upNext: chapterRef(upNext),
    href: practiceHref(paperId, upNext.categoryId, upNext.subCategoryId),
    progressPercent,
    chaptersCompleted,
    chaptersTotal,
  };
}

function collectCompletedSubCategoryIds(
  attempts: PracticeAttemptLike[],
  paperId: string
): Set<string> {
  return new Set(collectCompletedWithLatest(attempts, paperId).keys());
}

function collectCompletedWithLatest(
  attempts: PracticeAttemptLike[],
  paperId: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const attempt of attempts) {
    if (attempt.paperId !== paperId || attempt.mockExamId || attempt.status !== "SUBMITTED") {
      continue;
    }
    const at = attempt.submittedAt?.getTime() ?? 0;
    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp) || !resp.subCategory) continue;
      if (resp.subCategory.category.paperId !== paperId) continue;
      const prev = map.get(resp.subCategory.id) ?? 0;
      if (at >= prev) map.set(resp.subCategory.id, at);
    }
  }
  return map;
}

export function computeDailyGoal(input: {
  allSubmittedPracticeAttempts: PracticeAttemptLike[];
  dayStart: Date;
  dayEnd: Date;
  dateKey: string;
  timezoneLabel?: string;
}): DailyGoalPayload {
  const { dayStart, dayEnd, dateKey } = input;
  const attempts = input.allSubmittedPracticeAttempts.filter(
    (a) => !a.mockExamId && a.status === "SUBMITTED" && a.submittedAt
  );

  // Lifetime accuracy per subcategory (answered questions only)
  const lifetime: Record<string, { correct: number; total: number }> = {};
  for (const attempt of attempts) {
    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp) || !resp.subCategory) continue;
      const id = resp.subCategory.id;
      if (!lifetime[id]) lifetime[id] = { correct: 0, total: 0 };
      lifetime[id].total++;
      if (resp.isCorrect) lifetime[id].correct++;
    }
  }

  const weakIds = new Set<string>();
  for (const [id, stats] of Object.entries(lifetime)) {
    if (stats.total === 0) continue;
    const accuracy = (stats.correct / stats.total) * 100;
    if (accuracy < 60) weakIds.add(id);
  }

  let todayAnswered = 0;
  const weakReviewedToday = new Set<string>();
  let scoredQuizToday = false;

  for (const attempt of attempts) {
    const submittedAt = attempt.submittedAt!;
    if (submittedAt < dayStart || submittedAt > dayEnd) continue;

    if (attempt.scorePercent != null && attempt.scorePercent >= QUIZ_SCORE_THRESHOLD) {
      scoredQuizToday = true;
    }

    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp) || !resp.subCategory) continue;
      todayAnswered++;
      if (weakIds.has(resp.subCategory.id)) weakReviewedToday.add(resp.subCategory.id);
    }
  }

  const questionsCurrent = Math.min(todayAnswered, QUESTIONS_TARGET);
  const weakCurrent = Math.min(weakReviewedToday.size, WEAK_TOPIC_TARGET);
  const quizCurrent = scoredQuizToday ? 1 : 0;

  const questionsDone = questionsCurrent >= QUESTIONS_TARGET;
  const weakDone = weakCurrent >= WEAK_TOPIC_TARGET;
  const quizDone = quizCurrent >= 1;
  const goalsCompleted = [questionsDone, weakDone, quizDone].filter(Boolean).length;
  const overallPercent = Math.round((goalsCompleted / GOALS_TOTAL) * 100);

  return {
    dateKey,
    timezone: input.timezoneLabel ?? "local",
    questions: { current: questionsCurrent, target: QUESTIONS_TARGET },
    weakTopic: { current: weakCurrent, target: WEAK_TOPIC_TARGET },
    quizScore: { current: quizCurrent, target: 1, threshold: QUIZ_SCORE_THRESHOLD },
    goalsCompleted,
    goalsTotal: GOALS_TOTAL,
    overallPercent,
    completed: goalsCompleted >= GOALS_TOTAL,
  };
}
