import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { timedRoute } from "@/lib/perf-timing";

const updateSchema = z.object({
  paperId: z.string().min(1, "Select a paper first"),
  targetExamDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    z.null(),
  ]),
});

/** Store calendar dates at UTC noon to avoid timezone day-shift. */
function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function serializeExamDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

async function examDateForPaper(userId: string, paperId: string) {
  const row = await prisma.studentPaperExamDate.findUnique({
    where: { userId_paperId: { userId, paperId } },
    select: { examDate: true },
  });

  return serializeExamDate(row?.examDate ?? null);
}

export const GET = timedRoute("GET /api/profile", async (req: Request) => {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paperId = new URL(req.url).searchParams.get("paperId")?.trim() || null;
  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  try {
    const paper = await prisma.paper.findFirst({
      where: { id: paperId, isActive: true },
      select: { id: true },
    });
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    return NextResponse.json({
      paperId,
      targetExamDate: await examDateForPaper(user.id, paperId),
    });
  } catch (error) {
    console.error("[api/profile GET]", error);
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
});

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { paperId, targetExamDate } = parsed.data;
    const paper = await prisma.paper.findFirst({
      where: { id: paperId, isActive: true },
      select: { id: true },
    });
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    if (targetExamDate) {
      await prisma.studentPaperExamDate.upsert({
        where: { userId_paperId: { userId: user.id, paperId } },
        create: {
          userId: user.id,
          paperId,
          examDate: parseDateOnly(targetExamDate),
        },
        update: {
          examDate: parseDateOnly(targetExamDate),
        },
      });
    } else {
      await prisma.studentPaperExamDate.deleteMany({
        where: { userId: user.id, paperId },
      });
    }

    return NextResponse.json({
      paperId,
      targetExamDate,
    });
  } catch (error) {
    console.error("[api/profile POST]", error);
    return NextResponse.json({ error: "Could not save exam day." }, { status: 500 });
  }
}
