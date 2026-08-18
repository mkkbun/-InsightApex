import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getQuestionCounts, hasGlobalPremiumAccess, hasPremiumQuestionAccess } from "@/services/access-control";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute(
  "GET /api/categories/:id/subcategories",
  async (_req: Request, { params }: { params: { categoryId: string } }) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    select: { id: true, paperId: true, isActive: true },
  });

  if (!category || !category.isActive) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const hasPremium =
    (await hasGlobalPremiumAccess(user.id)) ||
    (await hasPremiumQuestionAccess(user.id, category.paperId));

  const subCategories = await prisma.subCategory.findMany({
    where: { categoryId: params.categoryId, isActive: true },
    orderBy: { order: "asc" },
  });

  const results = await Promise.all(
    subCategories.map(async (s) => {
      const counts = await getQuestionCounts({ subCategoryId: s.id }, hasPremium);
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        ...counts,
        questionCount: counts.accessibleQuestionCount,
      };
    })
  );

  return NextResponse.json(results);
});
