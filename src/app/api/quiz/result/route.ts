import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/quiz/result", async (req: Request) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attemptId");
  if (!attemptId) return NextResponse.json({ error: "attemptId required" }, { status: 400 });

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paper: { select: { code: true, title: true } },
      responses: {
        include: {
          question: {
            include: {
              subCategory: {
                select: {
                  id: true,
                  title: true,
                  category: { select: { id: true, title: true } },
                },
              },
              options: { orderBy: { order: "asc" } },
            },
          },
          selectedOption: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subCategoryMap: Record<
    string,
    { categoryTitle: string; subCategoryTitle: string; correct: number; total: number }
  > = {};

  for (const r of attempt.responses) {
    const sc = r.question.subCategory;
    if (!sc) continue;
    const key = sc.id;
    if (!subCategoryMap[key]) {
      subCategoryMap[key] = {
        categoryTitle: sc.category.title,
        subCategoryTitle: sc.title,
        correct: 0,
        total: 0,
      };
    }
    subCategoryMap[key].total++;
    if (r.isCorrect) subCategoryMap[key].correct++;
  }

  const subCategoryBreakdown = Object.entries(subCategoryMap).map(([subCategoryId, t]) => ({
    subCategoryId,
    categoryTitle: t.categoryTitle,
    subCategoryTitle: t.subCategoryTitle,
    total: t.total,
    correct: t.correct,
    percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
  }));

  const weakSubCategories = subCategoryBreakdown
    .filter((t) => t.percent < 60)
    .map((t) => `${t.categoryTitle} / ${t.subCategoryTitle}`);

  return NextResponse.json({
    attemptId: attempt.id,
    paper: `${attempt.paper.code} – ${attempt.paper.title}`,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    scorePercent: Math.round(attempt.scorePercent ?? 0),
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    durationSec: attempt.durationSec,
    subCategoryBreakdown,
    weakSubCategories,
    review: attempt.responses.map((r) => {
      const correctOptions = r.question.options.filter((o) => o.isCorrect);
      const selectedTexts =
        r.selectedOptionIds.length > 0
          ? r.question.options
              .filter((option) => r.selectedOptionIds.includes(option.id))
              .map((option) => option.text)
          : r.selectedOption?.text
            ? [r.selectedOption.text]
            : [];

      return {
        questionId: r.questionId,
        questionText: r.question.text,
        questionType: r.question.questionType,
        imageUrl: r.question.imageUrl,
        categoryTitle: r.question.subCategory?.category.title ?? "Mock exam",
        subCategoryTitle: r.question.subCategory?.title ?? "Mock exam",
        difficulty: r.question.difficulty,
        selectedOptionId: r.selectedOptionId,
        selectedOptionIds: r.selectedOptionIds,
        selectedOptionText: selectedTexts.join(", ") || null,
        correctOptionId: correctOptions[0]?.id ?? null,
        correctOptionText: correctOptions.map((option) => option.text).join(", ") || null,
        isCorrect: r.isCorrect,
        explanation: r.question.explanation,
        explanationMy: r.question.explanationMy,
        options: r.question.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      };
    }),
  });
});
