import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasGlobalPremiumAccess, hasMockExamAccess } from "@/services/access-control";
import { timeAsync, timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/mock-exams/papers", async (req: Request) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partId = new URL(req.url).searchParams.get("partId");
  if (!partId) {
    return NextResponse.json({ error: "partId is required" }, { status: 400 });
  }

  const isPremiumSubscriber = await hasGlobalPremiumAccess(user.id);

  const papers = await prisma.paper.findMany({
    where: {
      isActive: true,
      partId,
      mockExams: {
        some: { isActive: true, status: "PUBLISHED" },
      },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      mockExams: {
        where: { isActive: true, status: "PUBLISHED" },
        select: { id: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
      },
    },
  });

  const results = await timeAsync(
    `mock-exams/papers access (${papers.length} papers)`,
    () =>
      Promise.all(
        papers.map(async (paper) => {
      const accessFlags = await Promise.all(
        paper.mockExams.map((exam) => hasMockExamAccess(user.id, exam.id))
      );
      const unlockedCount = accessFlags.filter(Boolean).length;
      const lockedCount = paper.mockExams.length - unlockedCount;
      const hasAnyAccess = unlockedCount > 0;

      return {
        id: paper.id,
        code: paper.code,
        title: paper.title,
        description: paper.description,
        mockExamCount: paper.mockExams.length,
        unlockedCount,
        lockedCount,
        isPremiumSubscriber,
        hasAnyAccess,
        isLocked: !hasAnyAccess,
      };
        })
      )
  );

  return NextResponse.json(results);
});
