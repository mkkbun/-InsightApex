import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { logAdminAudit } from "@/services/admin/audit-log";
import {
  accessLevelSchema,
  runQuestionImport,
  validateImportRows,
  type RawImportRow,
  type ValidatedImportRow,
} from "@/services/question-import";

export const runtime = "nodejs";

const bodySchema = z.object({
  batchId: z.string().min(1),
  accessLevelDefault: accessLevelSchema.default("PREMIUM"),
  createMissingTaxonomy: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const batch = await prisma.questionImportBatch.findUnique({
      where: { id: body.batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
    }
    if (batch.status !== "PREVIEW") {
      return NextResponse.json(
        { error: "This import batch was already processed." },
        { status: 409 }
      );
    }
    if (batch.uploadedById !== user.id && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = batch.previewPayload as {
      rawRows?: RawImportRow[];
      validRows?: ValidatedImportRow[];
    } | null;

    const rawRows = payload?.rawRows ?? [];
    if (!rawRows.length) {
      return NextResponse.json(
        { error: "Preview data expired or missing. Please upload the file again." },
        { status: 400 }
      );
    }

    const { summary, validRows } = await validateImportRows({
      fileName: batch.fileName,
      sheetsDetected: batch.sheetsDetected,
      rows: rawRows,
      defaultAccessLevel: body.accessLevelDefault,
      createMissingTaxonomy: body.createMissingTaxonomy,
    });

    if (summary.hasDuplicates) {
      return NextResponse.json(
        {
          error:
            "This file is duplicated. One or more Question IDs are repeated in the Excel file " +
            "or already exist in InsightApex. Remove those rows (or use new Question IDs) and upload again. " +
            `In-file duplicates: ${summary.duplicateRows}; already exist: ${summary.duplicateExistingRows}.`,
          preview: summary,
        },
        { status: 400 }
      );
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows to import. Fix validation errors and upload again.",
          preview: summary,
        },
        { status: 400 }
      );
    }

    await prisma.questionImportBatch.update({
      where: { id: batch.id },
      data: {
        accessLevelDefault: body.accessLevelDefault,
        createMissingTaxonomy: body.createMissingTaxonomy,
        validRows: summary.validRows,
        invalidRows: summary.invalidRows,
        newCount: summary.newQuestions,
        updateCount: summary.existingToUpdate,
        errorReport: summary.rows as object,
        previewPayload: {
          rawRows,
          validRows,
          duplicateInFileCount: summary.duplicateRows,
          duplicateExistingCount: summary.duplicateExistingRows,
        } as object,
      },
    });

    const result = await runQuestionImport({
      batchId: batch.id,
      uploadedById: user.id,
      rows: validRows,
      accessLevelDefault: body.accessLevelDefault,
      createMissingTaxonomy: body.createMissingTaxonomy,
    });

    await logAdminAudit({
      userId: user.id,
      action: ADMIN_AUDIT_ACTIONS.QUESTION_IMPORT_CONFIRM,
      target: batch.fileName,
      targetType: "question_import_batch",
      targetId: batch.id,
      metadata: { ...result },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    if (result.status === "FAILED") {
      return NextResponse.json(
        {
          error: "Import failed and was rolled back. See the error report.",
          result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ result, preview: summary });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Import confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
