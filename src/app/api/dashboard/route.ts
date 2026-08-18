import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { timeAsync, timedRoute } from "@/lib/perf-timing";
import { buildAccessibleCount } from "@/lib/question-access";
import { hasGlobalPremiumAccess } from "@/services/access-control";
import {
  buildSyllabus,
  computeContinueLearning,
  computeDailyGoal,
  getLocalDayBounds,
  toLocalDateKey,
} from "@/services/dashboard/continue-and-daily-goal";
import {
  buildStudyActivityHeatmap,
  computeStudyStreak,
} from "@/services/dashboard/study-streak";

type SubCategoryStatus = "Weak" | "Average" | "Strong";

function getSubCategoryStatus(accuracy: number): SubCategoryStatus {
  if (accuracy < 60) return "Weak";
  if (accuracy < 80) return "Average";
  return "Strong";
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

export const GET = timedRoute("GET /api/dashboard", async (req: Request) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const studentName = user.name ?? "Student";

  const url = new URL(req.url);
  const requestedPaperId = url.searchParams.get("paperId")?.trim() || null;

  const [isPremiumSubscriber, paperExamDates, papers] = await timeAsync(
    "dashboard parallel: sub+examDates+papers",
    () =>
      Promise.all([
        hasGlobalPremiumAccess(userId),
        prisma.studentPaperExamDate.findMany({
          where: { userId },
          select: { paperId: true, examDate: true },
        }),
        prisma.paper.findMany({
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
                order: true,
                subCategories: {
                  where: { isActive: true },
                  orderBy: [{ order: "asc" }, { title: "asc" }],
                  select: {
                    id: true,
                    title: true,
                    order: true,
                    _count: {
                      select: {
                        questions: {
                          where: { isActive: true, purpose: "PRACTICE" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ])
  );

  const examDatesByPaperId: Record<string, string> = {};
  for (const row of paperExamDates) {
    examDatesByPaperId[row.paperId] = row.examDate.toISOString().slice(0, 10);
  }

  const paperAccess = await timeAsync(
    `dashboard paperAccess loop (${papers.length} papers)`,
    async () => {
      const now = new Date();
      const [accessRows, purchaseRows, questionRows] = await Promise.all([
        isPremiumSubscriber
          ? Promise.resolve([] as { paperId: string | null }[])
          : prisma.userAccess.findMany({
              where: {
                userId,
                status: "ACTIVE",
                paperId: { not: null },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
              },
              select: { paperId: true },
            }),
        isPremiumSubscriber
          ? Promise.resolve([] as { paperId: string | null }[])
          : prisma.purchase.findMany({
              where: { userId, status: "COMPLETED", paperId: { not: null } },
              select: { paperId: true },
            }),
        prisma.question.findMany({
          where: {
            isActive: true,
            purpose: "PRACTICE",
            subCategoryId: { not: null },
          },
          select: {
            accessLevel: true,
            subCategory: { select: { category: { select: { paperId: true } } } },
          },
        }),
      ]);

      const premiumPaperIds = new Set<string>();
      for (const row of accessRows) {
        if (row.paperId) premiumPaperIds.add(row.paperId);
      }
      for (const row of purchaseRows) {
        if (row.paperId) premiumPaperIds.add(row.paperId);
      }

      const countsByPaper = new Map<
        string,
        { freeQuestionCount: number; premiumQuestionCount: number; totalQuestionCount: number }
      >();
      for (const row of questionRows) {
        const paperId = row.subCategory?.category.paperId;
        if (!paperId) continue;
        let counts = countsByPaper.get(paperId);
        if (!counts) {
          counts = { freeQuestionCount: 0, premiumQuestionCount: 0, totalQuestionCount: 0 };
          countsByPaper.set(paperId, counts);
        }
        counts.totalQuestionCount += 1;
        if (row.accessLevel === "FREE_TRIAL") counts.freeQuestionCount += 1;
        else if (row.accessLevel === "PREMIUM") counts.premiumQuestionCount += 1;
      }

      return papers.map((p) => {
        const hasPremiumAccess = isPremiumSubscriber || premiumPaperIds.has(p.id);
        const counts = countsByPaper.get(p.id) ?? {
          freeQuestionCount: 0,
          premiumQuestionCount: 0,
          totalQuestionCount: 0,
        };
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          hasPremiumAccess,
          hasFreeTrialQuestions: counts.freeQuestionCount > 0,
          accessibleQuestionCount: buildAccessibleCount(
            {
              freeQuestionCount: counts.freeQuestionCount,
              totalQuestionCount: counts.totalQuestionCount,
            },
            hasPremiumAccess
          ),
        };
      });
    }
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

  const submittedAttemptInclude = {
    paper: { select: { id: true, code: true, title: true } },
    responses: {
      include: {
        question: {
          include: {
            subCategory: {
              select: {
                id: true,
                title: true,
                order: true,
                category: {
                  select: { id: true, title: true, paperId: true, order: true },
                },
              },
            },
          },
        },
      },
    },
  } as const;

  const otherAttemptsLeanSelect = {
    id: true,
    paperId: true,
    scorePercent: true,
    submittedAt: true,
    mockExamId: true,
    responses: {
      select: {
        isCorrect: true,
        selectedOptionId: true,
        selectedOptionIds: true,
        answeredAt: true,
        question: {
          select: {
            subCategoryId: true,
            // Tiny nested ids only — carousel continue* fields need categoryId.
            subCategory: { select: { id: true, category: { select: { id: true } } } },
          },
        },
      },
    },
  } as const;

  // Selected-paper submitted attempts (full nested include) + other papers
  // (lean) + unfinished practice. Same stage label as before for timings.
  const [selectedPaperAttempts, otherAttemptsLean, inProgressAttempts] = await timeAsync(
    "dashboard attempts+inProgress",
    () =>
      Promise.all([
        selectedPaperId
          ? prisma.quizAttempt.findMany({
              where: { userId, status: "SUBMITTED", paperId: selectedPaperId },
              include: submittedAttemptInclude,
              orderBy: { submittedAt: "desc" },
            })
          : Promise.resolve([]),
        prisma.quizAttempt.findMany({
          where: {
            userId,
            status: "SUBMITTED",
            ...(selectedPaperId ? { paperId: { not: selectedPaperId } } : {}),
          },
          select: otherAttemptsLeanSelect,
          orderBy: { submittedAt: "desc" },
        }),
        prisma.quizAttempt.findMany({
          where: {
            userId,
            status: "IN_PROGRESS",
            mockExamId: null,
            ...(selectedPaperId ? { paperId: selectedPaperId } : {}),
          },
          include: {
            responses: {
              include: {
                question: {
                  include: {
                    subCategory: {
                      select: {
                        id: true,
                        title: true,
                        order: true,
                        category: {
                          select: { id: true, title: true, paperId: true, order: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { startedAt: "desc" },
          take: 20,
        }),
      ])
  );

  const allSubmittedAttempts = [...selectedPaperAttempts, ...otherAttemptsLean];

  // Scoped attempts for progress insights (always a single selected paper).
  const scopedAttempts = selectedPaperAttempts;

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
  const allPracticeSubmittedDates = allSubmittedAttempts
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
        correctCount: sc.correct,
        totalAnswered: sc.total,
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
        correctCount: 0,
        totalAnswered: 0,
      },
    ];
  }

  function levelLabelFromStatus(
    status: ReturnType<typeof getSubCategoryStatus>
  ): "Weak" | "Developing" | "Strong" {
    if (status === "Weak") return "Weak";
    if (status === "Average") return "Developing";
    return "Strong";
  }

  function splitCoveragePercents(weakN: number, developingN: number, strongN: number) {
    const total = weakN + developingN + strongN;
    if (total === 0) return { weakPercent: 0, developingPercent: 0, strongPercent: 0 };
    const raw = [
      (weakN / total) * 100,
      (developingN / total) * 100,
      (strongN / total) * 100,
    ];
    const floors = raw.map((v) => Math.floor(v));
    let rem = 100 - floors.reduce((a, b) => a + b, 0);
    const order = raw
      .map((v, i) => ({ i, frac: v - floors[i] }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < rem; k++) floors[order[k % order.length].i] += 1;
    return {
      weakPercent: floors[0],
      developingPercent: floors[1],
      strongPercent: floors[2],
    };
  }

  const knowledgeItems = subCategoryDetails.map((sc) => ({
    ...sc,
    levelLabel: levelLabelFromStatus(sc.status),
  }));
  const knowledgeWeak = knowledgeItems.filter((i) => i.status === "Weak");
  const knowledgeDeveloping = knowledgeItems.filter((i) => i.status === "Average");
  const knowledgeStrong = knowledgeItems.filter((i) => i.status === "Strong");
  const knowledgePercents = splitCoveragePercents(
    knowledgeWeak.length,
    knowledgeDeveloping.length,
    knowledgeStrong.length
  );
  const knowledgeCoverage = {
    ...knowledgePercents,
    assessedCount: knowledgeItems.length,
    weak: knowledgeWeak,
    developing: knowledgeDeveloping,
    strong: knowledgeStrong,
    thresholds: {
      weakBelow: 60,
      developingMin: 60,
      developingMax: 79,
      strongAtOrAbove: 80,
    },
  };

  const weakSubCategories = subCategoryDetails
    .filter((sc) => sc.status === "Weak")
    .slice(0, 5);

  type PaperProgressAttempt = {
    paperId: string;
    submittedAt: Date | null;
    scorePercent: number | null;
    responses: Array<{
      selectedOptionId: string | null;
      selectedOptionIds: string[];
      question: {
        subCategoryId?: string | null;
        subCategory?: { id: string; category: { id: string } } | null;
      };
    }>;
  };

  function buildPaperProgress(paperIds: Set<string>, sourceAttempts: PaperProgressAttempt[]) {
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
            const subId = resp.question.subCategory?.id ?? resp.question.subCategoryId;
            if (!responseWasAnswered(resp) || !subId) continue;
            attemptedSubCats.add(subId);
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
          const sc = lastAnswered?.question.subCategory;
          if (sc) {
            continueSubCategoryId = sc.id;
            continueCategoryId = sc.category.id;
          } else if (lastAnswered?.question.subCategoryId) {
            continueSubCategoryId = lastAnswered.question.subCategoryId;
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

  const carouselPapers = buildPaperProgress(allowedPaperIds, allSubmittedAttempts).sort(
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

  // Unpractised chapters for Daily Goal “New Chapters” → New Practice list.
  const newPractice: {
    subCategoryId: string;
    paperId: string;
    categoryId: string;
    categoryTitle: string;
    subCategoryTitle: string;
    reason: string;
  }[] = [];
  if (selectedPaperId) {
    const paper = papers.find((p) => p.id === selectedPaperId);
    if (paper) {
      for (const category of paper.categories) {
        for (const sc of category.subCategories) {
          if (attemptedSubCategoryIds.has(sc.id)) continue;
          newPractice.push({
            subCategoryId: sc.id,
            paperId: paper.id,
            categoryId: category.id,
            categoryTitle: category.title,
            subCategoryTitle: sc.title,
            reason: "Not practised yet — counts toward today’s New Chapters goal.",
          });
        }
      }
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

  // Per local calendar day: aggregate answered/correct counts by SubCategory
  // (weighted across multiple practice attempts the same day).
  type DaySubAgg = {
    id: string;
    name: string;
    correct: number;
    answered: number;
  };
  const subcategoriesByLocalDate = new Map<string, Map<string, DaySubAgg>>();

  for (const attempt of attempts) {
    if (!attempt.submittedAt || attempt.submittedAt.getTime() < scoreHistoryCutoff) continue;
    const dateKey = toLocalDateKey(attempt.submittedAt);
    let dayMap = subcategoriesByLocalDate.get(dateKey);
    if (!dayMap) {
      dayMap = new Map();
      subcategoriesByLocalDate.set(dateKey, dayMap);
    }

    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp)) continue;
      const sc = resp.question.subCategory;
      if (!sc) continue;
      // Paper isolation: only SubCategories belonging to the attempt's paper.
      if (sc.category.paperId !== attempt.paperId) continue;

      let row = dayMap.get(sc.id);
      if (!row) {
        row = { id: sc.id, name: sc.title, correct: 0, answered: 0 };
        dayMap.set(sc.id, row);
      }
      row.answered++;
      if (resp.isCorrect) row.correct++;
    }
  }

  function subcategoriesForDate(dateKey: string) {
    const dayMap = subcategoriesByLocalDate.get(dateKey);
    if (!dayMap) return [];
    return [...dayMap.values()]
      .filter((row) => row.answered > 0)
      .map((row) => ({
        id: row.id,
        name: row.name,
        correct: row.correct,
        answered: row.answered,
        score: Math.round((row.correct / row.answered) * 100),
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  const scoreHistory = attempts
    .filter((a) => a.submittedAt && a.submittedAt.getTime() >= scoreHistoryCutoff)
    .slice()
    .reverse()
    .map((a) => {
      const date = toLocalDateKey(a.submittedAt!);
      return {
        date,
        score: Math.round(a.scorePercent ?? 0),
        paper: a.paper.code,
        subcategories: subcategoriesForDate(date),
      };
    });

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

  const answeredQuestionIdsBySub = new Map<string, Set<string>>();
  for (const attempt of attempts) {
    for (const resp of attempt.responses) {
      if (!responseWasAnswered(resp) || !resp.question.subCategory) continue;
      const scId = resp.question.subCategory.id;
      let ids = answeredQuestionIdsBySub.get(scId);
      if (!ids) {
        ids = new Set();
        answeredQuestionIdsBySub.set(scId, ids);
      }
      ids.add(resp.question.id);
    }
  }

  function splitThreePercents(a: number, b: number, c: number) {
    const total = a + b + c;
    if (total === 0) return { a: 0, b: 0, c: 0 };
    const raw = [(a / total) * 100, (b / total) * 100, (c / total) * 100];
    const floors = raw.map((v) => Math.floor(v));
    let rem = 100 - floors.reduce((s, n) => s + n, 0);
    const order = raw
      .map((v, i) => ({ i, frac: v - floors[i] }))
      .sort((x, y) => y.frac - x.frac);
    for (let k = 0; k < rem; k++) floors[order[k % order.length].i] += 1;
    return { a: floors[0], b: floors[1], c: floors[2] };
  }

  type CoverageTopicRow = {
    id: string;
    title: string;
    categoryId: string;
    categoryTitle: string;
    paperId: string;
    uniqueAnswered: number;
    totalQuestions: number;
  };

  const coverageTopics = {
    completed: [] as CoverageTopicRow[],
    partial: [] as CoverageTopicRow[],
    notStarted: [] as CoverageTopicRow[],
  };

  const papersForCoverage = selectedPaperId
    ? papers.filter((p) => p.id === selectedPaperId)
    : papers.filter((p) => allowedPaperIds.has(p.id));

  for (const paper of papersForCoverage) {
    for (const category of paper.categories) {
      for (const sc of category.subCategories) {
        const totalQuestions = sc._count.questions;
        const uniqueAnswered = answeredQuestionIdsBySub.get(sc.id)?.size ?? 0;
        const topic = {
          id: sc.id,
          title: sc.title,
          categoryId: category.id,
          categoryTitle: category.title,
          paperId: paper.id,
          uniqueAnswered,
          totalQuestions,
        };
        if (uniqueAnswered <= 0) coverageTopics.notStarted.push(topic);
        else if (totalQuestions > 0 && uniqueAnswered >= totalQuestions) {
          coverageTopics.completed.push(topic);
        } else {
          coverageTopics.partial.push(topic);
        }
      }
    }
  }

  const completedCount = coverageTopics.completed.length;
  const partialCount = coverageTopics.partial.length;
  const notStartedCount = coverageTopics.notStarted.length;
  const topicStatusPercents = splitThreePercents(
    completedCount,
    partialCount,
    notStartedCount
  );

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
  const categoryNotStartedCount = categoryCoverage.filter((c) => c.status === "not_started").length;

  const targetExamDate = selectedPaperId
    ? examDatesByPaperId[selectedPaperId] ?? null
    : null;

  function mapAttemptForLearning(
    attempt: (typeof selectedPaperAttempts)[number] | (typeof inProgressAttempts)[number]
  ) {
    return {
      id: attempt.id,
      paperId: attempt.paperId,
      status: attempt.status,
      mockExamId: attempt.mockExamId,
      startedAt: attempt.startedAt,
      submittedAt: "submittedAt" in attempt ? attempt.submittedAt : null,
      scorePercent: "scorePercent" in attempt ? attempt.scorePercent : null,
      responses: attempt.responses.map((resp) => ({
        isCorrect: resp.isCorrect,
        selectedOptionId: resp.selectedOptionId,
        selectedOptionIds: resp.selectedOptionIds,
        answeredAt: resp.answeredAt,
        subCategory: resp.question.subCategory
          ? {
              id: resp.question.subCategory.id,
              title: resp.question.subCategory.title,
              order: resp.question.subCategory.order,
              category: {
                id: resp.question.subCategory.category.id,
                title: resp.question.subCategory.category.title,
                paperId: resp.question.subCategory.category.paperId,
                order: resp.question.subCategory.category.order,
              },
            }
          : null,
      })),
    };
  }

  function mapLeanForDailyGoal(attempt: (typeof otherAttemptsLean)[number]) {
    return {
      id: attempt.id,
      paperId: attempt.paperId,
      status: "SUBMITTED" as const,
      mockExamId: attempt.mockExamId,
      startedAt: attempt.submittedAt ?? new Date(0),
      submittedAt: attempt.submittedAt,
      scorePercent: attempt.scorePercent,
      responses: attempt.responses.map((resp) => ({
        isCorrect: resp.isCorrect,
        selectedOptionId: resp.selectedOptionId,
        selectedOptionIds: resp.selectedOptionIds,
        answeredAt: resp.answeredAt,
        subCategory: resp.question.subCategoryId
          ? {
              id: resp.question.subCategoryId,
              title: "",
              order: 0,
              category: { id: "", title: "", paperId: attempt.paperId, order: 0 },
            }
          : null,
      })),
    };
  }

  const submittedPracticeMapped = [
    ...selectedPaperAttempts.filter((a) => !a.mockExamId).map(mapAttemptForLearning),
    ...otherAttemptsLean.filter((a) => !a.mockExamId).map(mapLeanForDailyGoal),
  ];
  const inProgressMapped = inProgressAttempts.map(mapAttemptForLearning);

  let continueLearning = null;
  if (selectedPaperId && selectedPaper) {
    const paperFull = papers.find((p) => p.id === selectedPaperId);
    if (paperFull) {
      continueLearning = computeContinueLearning({
        paperId: selectedPaper.id,
        paperCode: selectedPaper.code,
        paperTitle: selectedPaper.title,
        syllabus: buildSyllabus(paperFull),
        submittedPracticeAttempts: submittedPracticeMapped,
        inProgressPracticeAttempts: inProgressMapped,
      });
    }
  }

  const dayBounds = getLocalDayBounds();
  const dailyGoal = computeDailyGoal({
    allSubmittedPracticeAttempts: submittedPracticeMapped,
    dayStart: dayBounds.start,
    dayEnd: dayBounds.end,
    dateKey: dayBounds.dateKey,
    timezoneLabel: "local",
  });

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
        ? `Syllabus coverage for ${selectedPaper.code}`
        : "Topics you've practised across all papers",
      completedCount,
      partialCount,
      notStartedCount,
      completedPercent: topicStatusPercents.a,
      partialPercent: topicStatusPercents.b,
      notStartedPercent: topicStatusPercents.c,
      topics: coverageTopics,
    },
    knowledgeCoverage,
    categoryCoverage: {
      finished: categoryCoverage.filter((c) => c.status === "finished"),
      onTheWay: categoryCoverage.filter((c) => c.status === "on_the_way"),
      notStarted: categoryCoverage.filter((c) => c.status === "not_started"),
      counts: {
        finished: finishedCount,
        onTheWay: onTheWayCount,
        notStarted: categoryNotStartedCount,
        total: categoryCoverage.length,
      },
    },
    paperProgress,
    carouselPapers,
    isPremiumSubscriber,
    recommendedPractice,
    newPractice,
    recentActivity,
    scoreHistory,
    trends,
    attemptScores: {
      practice: practiceScoreSummary,
      mock: mockScoreSummary,
    },
    continueLearning,
    dailyGoal,
  });
});
