import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasMockExamAccess } from "@/services/access-control";
import { timeAsync, timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/mock-exams", async (req: Request) => {
  const user = await requireAuthApi();
  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");

  const mockExams = await prisma.mockExam.findMany({
    where: {
      isActive: true,
      status: "PUBLISHED",
      ...(paperId ? { paperId } : {}),
    },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  const results = user
    ? await timeAsync(`mock-exams hasAccess (${mockExams.length} exams)`, () =>
        Promise.all(
          mockExams.map(async (m) => ({
            exam: m,
            hasAccess: await hasMockExamAccess(user.id, m.id),
          }))
        )
      )
    : mockExams.map((m) => ({ exam: m, hasAccess: m.accessLevel === "FREE" && !m.isPremium }));

  return NextResponse.json({
    mockExams: results.map(({ exam: m, hasAccess }) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      paperId: m.paperId,
      paperCode: m.paper.code,
      paperTitle: m.paper.title,
      questionCount: m._count.questions,
      durationMinutes: m.durationMinutes,
      passMarkPercent: m.passMarkPercent,
      accessLevel: m.accessLevel,
      isPremium: m.isPremium,
      hasAccess,
      isLocked: !hasAccess,
      order: m.order,
    })),
  });
});
