/**
 * TEMPORARY — standalone Prisma timing for the navigation bottleneck report.
 * Does not log emails, names, tokens, or SQL parameter values.
 *
 *   npx tsx scripts/perf-investigate.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

function hostFromDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const normalized = raw.replace(/^postgresql:/, "http:");
    return new URL(normalized).host;
  } catch {
    return "(unparseable)";
  }
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  console.log(`${ms.toFixed(1).padStart(8)}ms  ${label}`);
  return result;
}

async function main() {
  const host = hostFromDatabaseUrl();
  const isNeon = host.includes("neon.tech");
  const isPooler = host.includes("-pooler.");
  console.log("=== InsightApex DB probe ===");
  console.log(`host: ${host}`);
  console.log(`provider: ${isNeon ? "Neon" : "other PostgreSQL"}`);
  console.log(`pooler: ${isPooler ? "yes" : "no"}`);
  console.log("");

  console.log("--- connection / cold vs warm ---");
  await timed("SELECT 1 (1st / possibly cold)", () =>
    prisma.$queryRaw`SELECT 1`
  );
  await timed("SELECT 1 (2nd / warm)", () => prisma.$queryRaw`SELECT 1`);
  await timed("user.count() (1st)", () => prisma.user.count());
  await timed("user.count() (2nd)", () => prisma.user.count());
  console.log("");

  console.log("--- table sizes ---");
  const counts = await timed("count major tables", async () => {
    const [
      users,
      attempts,
      responses,
      questions,
      papers,
      categories,
      subCategories,
      mockExams,
      userAccess,
      subscriptions,
      purchases,
      profiles,
      examDates,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.quizAttempt.count(),
      prisma.questionResponse.count(),
      prisma.question.count(),
      prisma.paper.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.subCategory.count({ where: { isActive: true } }),
      prisma.mockExam.count({ where: { isActive: true, status: "PUBLISHED" } }),
      prisma.userAccess.count(),
      prisma.subscription.count(),
      prisma.purchase.count(),
      prisma.studentProfile.count(),
      prisma.studentPaperExamDate.count(),
    ]);
    return {
      users,
      attempts,
      responses,
      questions,
      papers,
      categories,
      subCategories,
      mockExams,
      userAccess,
      subscriptions,
      purchases,
      profiles,
      examDates,
    };
  });
  for (const [k, v] of Object.entries(counts)) {
    console.log(`         ${String(v).padStart(6)}  ${k}`);
  }
  console.log("");

  const heavy = await prisma.quizAttempt.groupBy({
    by: ["userId"],
    where: { status: "SUBMITTED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  const userId = heavy[0]?.userId;
  const attemptCount = heavy[0]?._count.id ?? 0;
  if (!userId) {
    console.log("No submitted attempts found — skipping user-scoped queries.");
    return;
  }
  console.log(`--- heaviest student (id omitted) ---`);
  console.log(`submitted attempts: ${attemptCount}`);
  const responseCount = await prisma.questionResponse.count({
    where: { attempt: { userId } },
  });
  console.log(`question responses: ${responseCount}`);
  console.log("");

  console.log("--- dashboard-equivalent queries (sequential, like the API) ---");
  await timed("hasActiveSubscription", () =>
    prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    })
  );
  await timed("studentPaperExamDate.findMany", () =>
    prisma.studentPaperExamDate.findMany({
      where: { userId },
      select: { paperId: true, examDate: true },
    })
  );
  const papers = await timed("paper.findMany + nested cats/subs", () =>
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
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    })
  );

  console.log(`papers returned: ${papers.length}`);
  await timed(`paperAccess loop (${papers.length} papers × counts)`, async () => {
    for (const p of papers) {
      await prisma.question.count({
        where: {
          isActive: true,
          purpose: "PRACTICE",
          accessLevel: "FREE_TRIAL",
          subCategory: { category: { paperId: p.id } },
        },
      });
      await prisma.question.count({
        where: {
          isActive: true,
          purpose: "PRACTICE",
          accessLevel: "PREMIUM",
          subCategory: { category: { paperId: p.id } },
        },
      });
      await prisma.question.count({
        where: {
          isActive: true,
          purpose: "PRACTICE",
          subCategory: { category: { paperId: p.id } },
        },
      });
    }
  });
  await timed(`paperAccess loop PARALLEL (${papers.length} papers × 3 counts)`, async () => {
    await Promise.all(
      papers.map(async (p) => {
        const where = {
          isActive: true,
          purpose: "PRACTICE" as const,
          subCategory: { category: { paperId: p.id } },
        };
        await Promise.all([
          prisma.question.count({ where: { ...where, accessLevel: "FREE_TRIAL" } }),
          prisma.question.count({ where: { ...where, accessLevel: "PREMIUM" } }),
          prisma.question.count({ where }),
        ]);
      })
    );
  });

  await timed("quizAttempt.findMany SUBMITTED + responses+question+subcat", () =>
    prisma.quizAttempt.findMany({
      where: { userId, status: "SUBMITTED" },
      include: {
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
      },
      orderBy: { submittedAt: "desc" },
    })
  );

  await timed("quizAttempt.findMany SUBMITTED select-only (no responses)", () =>
    prisma.quizAttempt.findMany({
      where: { userId, status: "SUBMITTED" },
      select: {
        id: true,
        paperId: true,
        mockExamId: true,
        submittedAt: true,
        scorePercent: true,
        passed: true,
        paper: { select: { id: true, code: true, title: true } },
      },
      orderBy: { submittedAt: "desc" },
    })
  );

  await timed("quizAttempt IN_PROGRESS + responses (take 20)", () =>
    prisma.quizAttempt.findMany({
      where: { userId, status: "IN_PROGRESS", mockExamId: null },
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
    })
  );

  await timed("streak quizAttempt submittedAt-only", () =>
    prisma.quizAttempt.findMany({
      where: { userId, status: "SUBMITTED", mockExamId: null },
      select: { submittedAt: true },
      orderBy: { submittedAt: "desc" },
    })
  );

  const selectedPaperId = papers[0]?.id ?? null;
  console.log("");
  console.log("--- dashboard AFTER (batched paperAccess + split attempts) ---");
  await timed("AFTER paperAccess batched (grants + question rows)", async () => {
    const now = new Date();
    await Promise.all([
      prisma.userAccess.findMany({
        where: {
          userId,
          status: "ACTIVE",
          paperId: { not: null },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        select: { paperId: true },
      }),
      prisma.purchase.findMany({
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
  });
  await timed(
    "AFTER attempts+inProgress (selected full + others lean + inProgress)",
    async () => {
      await Promise.all([
        selectedPaperId
          ? prisma.quizAttempt.findMany({
              where: { userId, status: "SUBMITTED", paperId: selectedPaperId },
              include: {
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
                              select: {
                                id: true,
                                title: true,
                                paperId: true,
                                order: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { submittedAt: "desc" },
            })
          : Promise.resolve([]),
        prisma.quizAttempt.findMany({
          where: {
            userId,
            status: "SUBMITTED",
            ...(selectedPaperId ? { paperId: { not: selectedPaperId } } : {}),
          },
          select: {
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
                    subCategory: {
                      select: { id: true, category: { select: { id: true } } },
                    },
                  },
                },
              },
            },
          },
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
                          select: {
                            id: true,
                            title: true,
                            paperId: true,
                            order: true,
                          },
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
      ]);
    }
  );

  console.log("");
  console.log("--- billing / profile / access ---");
  await timed("subscription.findFirst + plan", () =>
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
    })
  );
  await timed("purchase.findMany COMPLETED + paper/mock/product", () =>
    prisma.purchase.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: {
        paper: { select: { id: true, code: true, title: true } },
        mockExam: { select: { id: true, title: true } },
        product: { select: { id: true, name: true, type: true } },
      },
    })
  );
  await timed("payment.findMany take 20", () =>
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        purchase: { select: { type: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    })
  );
  await timed("plan.findFirst FREE", () =>
    prisma.plan.findFirst({ where: { accessType: "FREE" } })
  );
  await timed("studentProfile.findUnique", () =>
    prisma.studentProfile.findUnique({ where: { userId } })
  );
  await timed("userAccess.findFirst global sub", () =>
    prisma.userAccess.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        subscriptionId: { not: null },
        paperId: null,
        mockExamId: null,
      },
    })
  );
  await timed("platformSettings.findUnique", () =>
    prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: { maintenanceMode: true, maintenanceAdminAccess: true },
    })
  );

  console.log("");
  console.log("--- practice / mock-exam navigation APIs ---");
  await timed("part.findMany + paper count", () =>
    prisma.part.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      include: {
        _count: { select: { papers: { where: { isActive: true } } } },
      },
    })
  );

  const samplePart = await prisma.part.findFirst({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  if (samplePart) {
    const partPapers = await timed(`paper.findMany for part ${samplePart.code}`, () =>
      prisma.paper.findMany({
        where: { isActive: true, partId: samplePart.id },
        orderBy: [{ part: { order: "asc" } }, { code: "asc" }],
        include: { part: { select: { id: true, code: true, title: true, order: true } } },
      })
    );
    await timed(
      `/api/papers N+1 access+counts (${partPapers.length} papers, sequential inner)`,
      async () => {
        for (const p of partPapers) {
          await prisma.paper.findUnique({
            where: { id: p.id },
            select: { accessLevel: true, isPremium: true, isActive: true },
          });
          await prisma.userAccess.findFirst({
            where: { userId, status: "ACTIVE", paperId: p.id },
          });
          await prisma.purchase.findFirst({
            where: { userId, status: "COMPLETED", paperId: p.id },
          });
          const where = {
            isActive: true,
            purpose: "PRACTICE" as const,
            subCategory: { category: { paperId: p.id } },
          };
          await prisma.question.count({ where: { ...where, accessLevel: "FREE_TRIAL" } });
          await prisma.question.count({ where: { ...where, accessLevel: "PREMIUM" } });
          await prisma.question.count({ where });
          await prisma.category.count({ where: { paperId: p.id, isActive: true } });
        }
      }
    );
  }

  const mockPapers = await timed("mock-exams/papers paper.findMany + exams", () =>
    prisma.paper.findMany({
      where: {
        isActive: true,
        mockExams: { some: { isActive: true, status: "PUBLISHED" } },
      },
      select: {
        id: true,
        code: true,
        mockExams: {
          where: { isActive: true, status: "PUBLISHED" },
          select: { id: true },
        },
      },
    })
  );
  const mockExamIds = mockPapers.flatMap((p) => p.mockExams.map((e) => e.id));
  await timed(`hasMockExamAccess N+1 (${mockExamIds.length} exams)`, async () => {
    for (const mockExamId of mockExamIds) {
      await prisma.mockExam.findUnique({
        where: { id: mockExamId },
        select: {
          paperId: true,
          isActive: true,
          status: true,
          accessLevel: true,
          isPremium: true,
        },
      });
      await prisma.subscription.findFirst({
        where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
      });
      await prisma.userAccess.findFirst({
        where: { userId, status: "ACTIVE", mockExamId },
      });
      await prisma.purchase.findFirst({
        where: { userId, status: "COMPLETED", mockExamId },
      });
    }
  });

  const latestAttempt = await prisma.quizAttempt.findFirst({
    where: { userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    select: { id: true },
  });
  if (latestAttempt) {
    await timed("quiz/result attempt+responses+options", () =>
      prisma.quizAttempt.findUnique({
        where: { id: latestAttempt.id },
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
      })
    );
  }

  console.log("");
  console.log("--- idle gap then first query (simulate Neon resume) ---");
  console.log("waiting 3s...");
  await new Promise((r) => setTimeout(r, 3000));
  await timed("user.count() after 3s idle", () => prisma.user.count());
  await timed("user.count() immediate after idle", () => prisma.user.count());

  console.log("");
  console.log("=== done ===");
}

main()
  .catch((err) => {
    console.error("perf-investigate failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
