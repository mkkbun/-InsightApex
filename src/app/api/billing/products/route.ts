import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/billing/products", async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true, type: { in: ["PAPER", "MOCK_EXAM"] } },
    orderBy: { name: "asc" },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      mockExam: { select: { id: true, title: true, paperId: true } },
    },
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      type: p.type,
      accessType: p.accessType,
      priceCents: p.priceCents,
      currency: p.currency,
      isPremium: p.isPremium,
      paperId: p.paperId,
      mockExamId: p.mockExamId,
      paper: p.paper,
      mockExam: p.mockExam,
      hasStripePrice: Boolean(p.providerPriceId),
    }))
  );
});
