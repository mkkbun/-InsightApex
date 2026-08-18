import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  buildStudyActivityHeatmap,
  computeStudyStreak,
} from "@/services/dashboard/study-streak";
import { timedRoute } from "@/lib/perf-timing";

/**
 * Lean nav chip data — submittedAt only (no QuestionResponse payload).
 * Used by DashboardShell so the full /api/dashboard is not duplicated.
 */
export const GET = timedRoute("GET /api/dashboard/streak", async () => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.quizAttempt.findMany({
    where: { userId: user.id, status: "SUBMITTED", mockExamId: null },
    select: { submittedAt: true },
    orderBy: { submittedAt: "desc" },
  });

  const dates = rows
    .map((r) => r.submittedAt)
    .filter((d): d is Date => d !== null);

  return NextResponse.json({
    studyStreak: computeStudyStreak(dates),
    studyActivity: buildStudyActivityHeatmap(dates, 13),
  });
});
