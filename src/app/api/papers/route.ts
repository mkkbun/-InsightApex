import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getQuestionCounts,
  hasGlobalPremiumAccess,
  hasPaperAccess,
  hasPremiumQuestionAccess,
} from "@/services/access-control";
import { timeAsync, timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/papers", async (req: Request) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const partId = url.searchParams.get("partId");

  const isPremiumSubscriber = await hasGlobalPremiumAccess(user.id);

  const papers = await prisma.paper.findMany({
    where: {
      isActive: true,
      ...(partId ? { partId } : {}),
    },
    orderBy: [{ part: { order: "asc" } }, { code: "asc" }],
    include: {
      part: { select: { id: true, code: true, title: true, order: true } },
    },
  });

  const accessResults = await timeAsync(
    `papers access+counts (${papers.length} papers)`,
    () =>
      Promise.all(
        papers.map(async (p) => {
      const hasPremium = isPremiumSubscriber || (await hasPremiumQuestionAccess(user.id, p.id));
      const hasAccess = await hasPaperAccess(user.id, p.id);
      const counts = await getQuestionCounts(
        { subCategory: { category: { paperId: p.id } } },
        hasPremium
      );
      const categoryCount = await prisma.category.count({
        where: { paperId: p.id, isActive: true },
      });

      return {
        paper: p,
        hasAccess,
        hasPremiumQuestionAccess: hasPremium,
        categoryCount,
        ...counts,
      };
        })
      )
  );

  return NextResponse.json(
    accessResults.map(
      ({
        paper: p,
        hasAccess,
        hasPremiumQuestionAccess: premiumAccess,
        categoryCount,
        freeQuestionCount,
        premiumQuestionCount,
        totalQuestionCount,
        accessibleQuestionCount,
      }) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        description: p.description,
        partId: p.partId,
        part: p.part,
        accessLevel: p.accessLevel,
        isPremium: p.isPremium,
        isPremiumSubscriber,
        hasAccess,
        hasPremiumQuestionAccess: premiumAccess,
        // Paywall lock only — empty papers are unavailable, not "locked behind premium"
        isLocked: totalQuestionCount > 0 && accessibleQuestionCount === 0,
        hasNoPracticeQuestions: totalQuestionCount === 0,
        hasFreeTrialQuestions: freeQuestionCount > 0,
        categoryCount,
        freeQuestionCount,
        premiumQuestionCount,
        totalQuestionCount,
        accessibleQuestionCount,
      })
    )
  );
});
