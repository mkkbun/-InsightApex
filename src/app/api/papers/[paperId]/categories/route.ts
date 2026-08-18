import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasPaperPracticeAccess } from "@/services/access-control";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute(
  "GET /api/papers/:id/categories",
  async (_req: Request, { params }: { params: { paperId: string } }) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canPractice = await hasPaperPracticeAccess(user.id, params.paperId);
  if (!canPractice) {
    return NextResponse.json(
      { error: "No practice questions available for this paper.", code: "ACCESS_DENIED", upgradeUrl: "/dashboard/pricing" },
      { status: 403 }
    );
  }

  const categories = await prisma.category.findMany({
    where: { paperId: params.paperId, isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          subCategories: { where: { isActive: true } },
        },
      },
    },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      subCategoryCount: c._count.subCategories,
    }))
  );
});
