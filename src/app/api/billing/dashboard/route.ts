import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getActiveSubscription } from "@/services/subscription";
import { timedRoute } from "@/lib/perf-timing";

export const GET = timedRoute("GET /api/billing/dashboard", async () => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [subscription, purchases, payments] = await Promise.all([
    getActiveSubscription(user.id),
    prisma.purchase.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: {
        paper: { select: { id: true, code: true, title: true } },
        mockExam: { select: { id: true, title: true } },
        product: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        purchase: { select: { type: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    }),
  ]);

  const freePlan = await prisma.plan.findFirst({ where: { accessType: "FREE" } });

  const ownedProductIds = [
    ...new Set(purchases.map((p) => p.productId).filter((id): id is string => Boolean(id))),
  ];
  const ownedPaperIds = [
    ...new Set(purchases.map((p) => p.paperId).filter((id): id is string => Boolean(id))),
  ];
  const ownedMockExamIds = [
    ...new Set(purchases.map((p) => p.mockExamId).filter((id): id is string => Boolean(id))),
  ];

  const isPremiumStatus =
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING");
  const canCancel = Boolean(
    isPremiumStatus && subscription.stripeSubscriptionId && !subscription.cancelAtPeriodEnd
  );
  const canResume = Boolean(
    isPremiumStatus && subscription.stripeSubscriptionId && subscription.cancelAtPeriodEnd
  );

  return NextResponse.json({
    currentPlan: subscription?.plan ?? freePlan ?? null,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          accessType: subscription.accessType,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          endsAt: subscription.endsAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          cancelledAt: subscription.cancelledAt,
          canCancel,
          canResume,
        }
      : null,
    ownedProductIds,
    ownedPaperIds,
    ownedMockExamIds,
    purchasedPapers: purchases.filter((p) => p.paperId).map((p) => ({
      id: p.id,
      productId: p.productId,
      paper: p.paper,
      purchasedAt: p.createdAt,
      amountCents: p.amountCents,
      currency: p.currency,
    })),
    purchasedMockExams: purchases.filter((p) => p.mockExamId).map((p) => ({
      id: p.id,
      productId: p.productId,
      mockExam: p.mockExam,
      purchasedAt: p.createdAt,
      amountCents: p.amountCents,
      currency: p.currency,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      description: p.subscription?.plan?.name ?? p.purchase?.type ?? "Payment",
    })),
  });
});
