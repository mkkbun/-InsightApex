import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { logAdminAudit } from "@/services/admin/audit-log";
import {
  deleteImportBatchQuestions,
  setImportBatchQuestionsActive,
  type DeleteImportMode,
} from "@/services/question-import";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: { batchId: string } };

const patchSchema = z.object({
  questionsActive: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
    select: { id: true, fileName: true, status: true, uploadedById: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  if (batch.uploadedById !== user.id && user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Body must include questionsActive: true | false" },
      { status: 400 }
    );
  }

  try {
    const result = await setImportBatchQuestionsActive({
      batchId: params.batchId,
      questionsActive: body.questionsActive,
    });

    await logAdminAudit({
      userId: user.id,
      action: ADMIN_AUDIT_ACTIONS.QUESTION_IMPORT_ACTIVE,
      target: batch.fileName,
      targetType: "question_import_batch",
      targetId: batch.id,
      metadata: {
        questionsActive: result.questionsActive,
        updatedCount: result.updatedCount,
      },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ result });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to update import questions";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode: DeleteImportMode = modeParam === "all" ? "all" : "created";

  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
    select: { id: true, fileName: true, status: true, uploadedById: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  if (batch.uploadedById !== user.id && user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await deleteImportBatchQuestions({
      batchId: params.batchId,
      mode,
    });

    await logAdminAudit({
      userId: user.id,
      action: ADMIN_AUDIT_ACTIONS.QUESTION_IMPORT_DELETED,
      target: batch.fileName,
      targetType: "question_import_batch",
      targetId: batch.id,
      metadata: {
        mode: result.mode,
        deletedCount: result.deletedCount,
        deletedExternalIds: result.deletedExternalIds,
      },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete import";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
