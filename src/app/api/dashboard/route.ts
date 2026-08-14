import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getQuestionCounts,
  hasGlobalPremiumAccess,
  hasPremiumQuestionAccess,
} from "@/services/access-control";

type SubCategoryStatus = "Weak" | "Average" | "Strong";

function getSubCategoryStatus(accuracy: number): SubCategoryStatus {
  if (accuracy < 60) return "Weak";
  if (accuracy < 80) return "Average";
  return "Strong";
}

function computeStudyStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set(dates.map((d) => d.toISOString().slice(0, 10)));

  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  const todayStr = checkDate.toISOString().slice(0, 10);
  if (!uniqueDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (uniqueDays.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function buildStudyActivityHeatmap(
  dates: Date[],
  weeks = 13
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const cells: { date: string; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

function percentChange(current: number, previous: number): number | null {
  if (current === 0 && previous === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function splitAttemptsByPeriod<T extends { submittedAt: Date | null }>(attempts: T[]) {
  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const recent: T[] = [];
  const previous: T[] = [];

  for (const a of attempts) {
    if (!a.submittedAt) continue;
    const age = now - a.submittedAt.getTime();
    if (age <= ms30) recent.push(a);
    else if (age <= ms30 * 2) previous.push(a);
  }
  return { recent, previous };
}

export async function GET(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const studentName = user.name ?? "Student";
  const isPremiumSubscriber = await hasGlobalPremiumAccess(userId);

  const paperExamDates = await prisma.studentPaperExamDate.findMany({
    where: { userId },
    select: { paperId: true, examDate: true },
  });
  const examDatesByPaperId: Record<string, string> = {};
  for (const row of paperExamDates) {
    examDatesByPaperId[row.paperId] = row.examDate.toISOString().slice(0, 10);
  }

  const url = new URL(req.url);
  const requestedPaperId = url.searchParams.get("paperId")?.trim() || null;

  const papers = await prisma.paper.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      partId: true,
      categories: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          paperId: true,
          subCategories: {
            where: { isActive: true },
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  const paperAccess = await Promise.all(
    papers.map(async (p) => {
      const hasPremiumAccess =
        isPremiumSubscriber || (await hasPremiumQuestionAccess(userId, p.id));
      const counts = await getQuestionCounts(
        { subCategory: { category: { paperId: p.id } } },
        hasPremiumAccess
      );
      return {
        id: p.id,
        code: p.code,
        title: p.title,
        hasPremiumAccess,
        hasFreeTrialQuestions: counts.freeQuestionCount > 0,
        accessibleQuestionCount: counts.accessibleQuestionCount,
      };
    })
  );

  const hasAnyPremiumAccess =
    isPremiumSubscriber || paperAccess.some((p) => p.hasPremiumAccess);

  const filterPapers = paperAccess
    .filter((p) => {
      if (hasAnyPremiumAccess) {
        return p.hasPremiumAccess && p.accessibleQuestionCount > 0;
      }
      return p.hasFreeTrialQuestions && p.accessibleQuestionCount > 0;
    })
    .map((p) => ({ id: p.id, code: p.code, title: p.title }));

  const allowedPaperIds = new Set(filterPapers.map((p) => p.id));

  let selectedPaperId: string | null = null;
  if (requestedPaperId) {
    if (!allowedPaperIds.has(requestedPaperId)) {
      return NextResponse.json(
        { error: "Paper not available for your account." },
        { status: 403 }
      );
    }
    selectedPaperId = requestedPaperId;
  } else if (filterPapers[0]) {
    // Always scope insights to one paper — no "All Papers" mode.
    selectedPaperId = filterPapers[0].id;
  }

  // All submitted attempts (for carousel coverage across papers).
  const allAttempts = await prisma.quizAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      responses: {
        include: {
          question: {
            include: {
              subCategory: {
                select: {
                  id: true,
                  title: true,
                  category: { select: { id: true, title: true, paperId: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Scoped attempts for progress insights (always a single selected paper).
  const scopedAttempts = selectedPaperId
    ? allAttempts.filter((a) => a.paperId === selectedPaperId)
    : [];

  // Practice analytics only — mock exam attempts are tracked separately.
  const attempts = scopedAttempts.filter((a) => !a.mockExamId);

  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.scorePercent ?? 0);
  const averageScore =
    totalAttempts > 0 ? scores.reduce((sum, s) => sum + s, 0) / totalAttempts : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0;

  const practiceAttempts = attempts;
  const mockAttempts = scopedAttempts.filter((a) => Boolean(a.mockExamId));

  function attemptScoreSummary(list: typeof attempts) {
    if (list.length === 0) {
      return { latestScore: null as number | null, bestScore: null as number | null, count: 0 };
    }
    const latest = list[0]; // already ordered by submittedAt desc
    const best = Math.max(...list.map((a) => a.scorePercent ?? 0));
    return {
      latestScore: Math.round(latest.scorePercent ?? 0),
      bestScore: Math.round(best),
      count: list.length,
    };
  }

  const practiceScoreSummary = attemptScoreSummary(practiceAttempts);
  const mockScoreSummary = attemptScoreSummary(mockAttempts);

  // Streak + heatmap track every practice day (all papers), even when answer
  // detail rows were removed — attempt summaries still have submittedAt.
  const allPracticeSubmittedDates = allAttempts
    .filter((a) => !a.mockExamId)
    .map((a) => a.submittedAt)
    .filter((d): d is Date => d !== null);

  const studyStreak = computeStudyStreak(allPracticeSubmittedDates);
  const studyActivity = buildStudyActivityHeatmap(allPracticeSubmittedDates, 13);

  function responseWasAnswered(resp: {
    selectedOptionId: string | null;
    selectedOptionIds: string[];
  }) {
    return Boolean(resp.selectedOptionId) || resp.selectedOptionIds.length > 0;
  }

  const subCategoryStats: Record<
    string,
    {
      id: string;
      title: string;
      categoryId: string;
      categoryTitle: string;
      paperId: string;
      correct: number;
      total: number;
    }
  > = {};

  for (const attempt of attempts) {
    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp)) continue;

      const sc = resp.question.subCategory;
      if (!sc) continue;
      if (selectedPaperId && sc.category.paperId !== selectedPaperId) continue;
      if (!selectedPaperId && !allowedPaperIds.has(sc.category.paperId)) continue;

      if (!subCategoryStats[sc.id]) {
        subCategoryStats[sc.id] = {
          id: sc.id,
          title: sc.title,
          categoryId: sc.category.id,
          categoryTitle: sc.category.title,
          paperId: sc.category.paperId,
          correct: 0,
          total: 0,
        };
      }
      subCategoryStats[sc.id].total++;
      if (resp.isCorrect) subCategoryStats[sc.id].correct++;
    }
  }

  let subCategoryDetails = Object.values(subCategoryStats)
    .filter((sc) => sc.total > 0)
    .map((sc) => {
      const accuracy = Math.round((sc.correct / sc.total) * 100);
      return {
        id: sc.id,
        title: sc.title,
        categoryId: sc.categoryId,
        categoryTitle: sc.categoryTitle,
        paperId: sc.paperId,
        accuracy,
        status: getSubCategoryStatus(accuracy),
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const selectedPaperEarly = selectedPaperId
    ? filterPapers.find((p) => p.id === selectedPaperId) ?? null
    : null;

  // When topic-level answers were deleted but attempt scores remain, still
  // surface overall paper performance in strong/weak cards.
  if (subCategoryDetails.length === 0 && totalAttempts > 0 && selectedPaperEarly) {
    const overallAccuracy = Math.round(averageScore);
    subCategoryDetails = [
      {
        id: `paper-overall-${selectedPaperEarly.id}`,
        title: "Overall practice",
        categoryId: selectedPaperEarly.id,
        categoryTitle: `${selectedPaperEarly.code} – ${selectedPaperEarly.title}`,
        paperId: selectedPaperEarly.id,
        accuracy: overallAccuracy,
        status: getSubCategoryStatus(overallAccuracy),
      },
    ];
  }

  const weakSubCategories = subCategoryDetails
    .filter((sc) => sc.status === "Weak")
    .slice(0, 5);

  function buildPaperProgress(paperIds: Set<string>, sourceAttempts: typeof allAttempts) {
    return papers
      .filter((p) => paperIds.has(p.id))
      .map((p) => {
        const access = paperAccess.find((a) => a.id === p.id)!;
        const paperAttempts = sourceAttempts.filter((a) => a.paperId === p.id);
        const attemptedSubCats = new Set<string>();
        let lastDate: Date | null = null;

        for (const attempt of paperAttempts) {
          if (attempt.submittedAt && (!lastDate || attempt.submittedAt > lastDate)) {
            lastDate = attempt.submittedAt;
          }
          for (const resp of attempt.responses) {
            if (!responseWasAnswered(resp) || !resp.question.subCategoryId) continue;
            attemptedSubCats.add(resp.question.subCategoryId);
          }
        }

        const totalSubCategories = p.categories.reduce(
          (sum, c) => sum + c.subCategories.length,
          0
        );
        const subCategoriesAttempted = attemptedSubCats.size;
        const progressPercent =
          totalSubCategories > 0
            ? Math.round((subCategoriesAttempted / totalSubCategories) * 100)
            : 0;

        const paperAverageScore =
          paperAttempts.length > 0
            ? Math.round(
                paperAttempts.reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) /
                  paperAttempts.length
              )
            : null;

        const lastAttempt = paperAttempts[0];
        let continueCategoryId: string | null = null;
        let continueSubCategoryId: string | null = null;
        if (lastAttempt) {
          const lastAnswered = lastAttempt.responses.find((r) => responseWasAnswered(r));
          if (lastAnswered?.question.subCategory) {
            continueSubCategoryId = lastAnswered.question.subCategory.id;
            continueCategoryId = lastAnswered.question.subCategory.category.id;
          }
        }

        return {
          id: p.id,
          code: p.code,
          title: p.title,
          partId: p.partId,
          lastPracticeDate: lastDate?.toISOString() ?? null,
          progressPercent,
          subCategoriesAttempted,
          totalSubCategories,
          averageScore: paperAverageScore,
          continueCategoryId,
          continueSubCategoryId,
          hasPremiumAccess: access.hasPremiumAccess,
          hasFreeTrialQuestions: access.hasFreeTrialQuestions,
          accessibleQuestionCount: access.accessibleQuestionCount,
        };
      });
  }

  const paperProgress = buildPaperProgress(
    selectedPaperId ? new Set([selectedPaperId]) : allowedPaperIds,
    attempts
  );

  const carouselPapers = buildPaperProgress(allowedPaperIds, allAttempts).sort(
    (a, b) => b.progressPercent - a.progressPercent
  );

  let recommendedPractice = weakSubCategories
    .filter((sc) => !sc.id.startsWith("paper-overall-"))
    .slice(0, 3)
    .map((sc) => ({
      subCategoryId: sc.id,
      paperId: sc.paperId,
      categoryId: sc.categoryId,
      categoryTitle: sc.categoryTitle,
      subCategoryTitle: sc.title,
      reason: `Your accuracy is ${sc.accuracy}% — focus here to reach the 60% pass threshold.`,
    }));

  const attemptedSubCategoryIds = new Set<string>();
  for (const attempt of attempts) {
    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp) || !resp.question.subCategory) continue;
      attemptedSubCategoryIds.add(resp.question.subCategory.id);
    }
  }

  // If topic answers are missing, still recommend real subcategories to practise.
  if (recommendedPractice.length === 0 && selectedPaperId) {
    const paper = papers.find((p) => p.id === selectedPaperId);
    if (paper) {
      const candidates = paper.categories.flatMap((category) =>
        category.subCategories.map((sc) => ({
          subCategoryId: sc.id,
          paperId: paper.id,
          categoryId: category.id,
          categoryTitle: category.title,
          subCategoryTitle: sc.title,
          attempted: attemptedSubCategoryIds.has(sc.id),
        }))
      );

      recommendedPractice = candidates
        .sort((a, b) => Number(a.attempted) - Number(b.attempted))
        .slice(0, 3)
        .map(({ attempted, ...item }) => ({
          ...item,
          reason: attempted
            ? "Keep practising this topic to improve your paper score."
            : "You haven’t practised this topic yet — a good place to continue.",
        }));
    }
  }

  const recentActivity = attempts.slice(0, 10).map((a) => {
    const subCategoryLabels = [
      ...new Set(
        a.responses
          .filter((r) => responseWasAnswered(r) && r.question.subCategory)
          .map(
            (r) =>
              `${r.question.subCategory!.category.title} / ${r.question.subCategory!.title}`
          )
      ),
    ];
    return {
      id: a.id,
      paper: `${a.paper.code} – ${a.paper.title}`,
      subCategory: subCategoryLabels[0] ?? null,
      score: a.scorePercent,
      passed: a.passed,
      date: a.submittedAt,
    };
  });

  const scoreHistoryCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const scoreHistory = attempts
    .filter((a) => a.submittedAt && a.submittedAt.getTime() >= scoreHistoryCutoff)
    .slice()
    .reverse()
    .map((a) => ({
      date: a.submittedAt?.toISOString().slice(0, 10) ?? "",
      score: Math.round(a.scorePercent ?? 0),
      paper: a.paper.code,
    }));

  const { recent, previous } = splitAttemptsByPeriod(attempts);
  const recentAvg =
    recent.length > 0
      ? recent.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / recent.length
      : 0;
  const prevAvg =
    previous.length > 0
      ? previous.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / previous.length
      : 0;

  const trends = {
    attempts: percentChange(recent.length, previous.length),
    averageScore: percentChange(Math.round(recentAvg), Math.round(prevAvg)),
    completedQuizzes: percentChange(recent.length, previous.length),
  };

  const coveredTopics = paperProgress.reduce((sum, p) => sum + p.subCategoriesAttempted, 0);
  const totalTopics = paperProgress.reduce((sum, p) => sum + p.totalSubCategories, 0);
  const coveragePercent =
    totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

  const selectedPaper = selectedPaperId
    ? filterPapers.find((p) => p.id === selectedPaperId) ?? null
    : null;

  type CategoryCoverageStatus = "finished" | "on_the_way" | "not_started";

  const papersForCategories = selectedPaperId
    ? papers.filter((p) => p.id === selectedPaperId)
    : papers.filter((p) => allowedPaperIds.has(p.id));

  const categoryCoverage = papersForCategories.flatMap((paper) =>
    paper.categories.map((category) => {
      const total = category.subCategories.length;
      const attempted = category.subCategories.filter((sc) =>
        attemptedSubCategoryIds.has(sc.id)
      ).length;
      const percent = total > 0 ? Math.round((attempted / total) * 100) : 0;

      let status: CategoryCoverageStatus = "not_started";
      if (total > 0 && attempted >= total) status = "finished";
      else if (attempted > 0) status = "on_the_way";

      return {
        id: category.id,
        title: category.title,
        paperId: paper.id,
        paperCode: paper.code,
        paperTitle: paper.title,
        totalSubCategories: total,
        attemptedSubCategories: attempted,
        percent,
        status,
      };
    })
  );

  const finishedCount = categoryCoverage.filter((c) => c.status === "finished").length;
  const onTheWayCount = categoryCoverage.filter((c) => c.status === "on_the_way").length;
  const notStartedCount = categoryCoverage.filter((c) => c.status === "not_started").length;

  const targetExamDate = selectedPaperId
    ? examDatesByPaperId[selectedPaperId] ?? null
    : null;

  return NextResponse.json({
    studentName,
    targetExamDate,
    examDatesByPaperId,
    selectedPaperId,
    selectedPaper,
    filterPapers,
    totalAttempts,
    completedQuizzes: totalAttempts,
    averageScore: Math.round(averageScore),
    bestScore: Math.round(bestScore),
    weakSubCategoryCount: weakSubCategories.length,
    studyStreak,
    studyActivity,
    weakSubCategories: weakSubCategories.map(
      (sc) => `${sc.categoryTitle} / ${sc.title}`
    ),
    subCategoryDetails,
    coverage: {
      percent: coveragePercent,
      coveredTopics,
      totalTopics,
      label: selectedPaper
        ? `Topics practised in ${selectedPaper.code}`
        : "Topics you've practised across all papers",
    },
    categoryCoverage: {
      finished: categoryCoverage.filter((c) => c.status === "finished"),
      onTheWay: categoryCoverage.filter((c) => c.status === "on_the_way"),
      notStarted: categoryCoverage.filter((c) => c.status === "not_started"),
      counts: {
        finished: finishedCount,
        onTheWay: onTheWayCount,
        notStarted: notStartedCount,
        total: categoryCoverage.length,
      },
    },
    paperProgress,
    carouselPapers,
    isPremiumSubscriber,
    recommendedPractice,
    recentActivity,
    scoreHistory,
    trends,
    attemptScores: {
      practice: practiceScoreSummary,
      mock: mockScoreSummary,
    },
  });
}
