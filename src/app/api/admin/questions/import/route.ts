import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { logAdminAudit } from "@/services/admin/audit-log";
import {
  assertSafeUpload,
  parseQuestionWorkbook,
  validateImportRows,
  accessLevelSchema,
  type RawImportRow,
  type ValidatedImportRow,
} from "@/services/question-import";

export const runtime = "nodejs";

const optionsSchema = z.object({
  accessLevelDefault: accessLevelSchema.default("PREMIUM"),
  createMissingTaxonomy: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 });
    }

    assertSafeUpload({ name: file.name, type: file.type, size: file.size });

    const optionsRaw = form.get("options");
    let options = optionsSchema.parse({});
    if (typeof optionsRaw === "string" && optionsRaw.trim()) {
      options = optionsSchema.parse(JSON.parse(optionsRaw));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseQuestionWorkbook(buffer);

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No question rows found. Ensure the workbook has headers including ID, Subject, and Question.",
        },
        { status: 400 }
      );
    }

    const { summary, validRows } = await validateImportRows({
      fileName: file.name,
      sheetsDetected: parsed.sheetsDetected,
      rows: parsed.rows,
      defaultAccessLevel: options.accessLevelDefault,
      createMissingTaxonomy: options.createMissingTaxonomy,
    });

    const batch = await prisma.questionImportBatch.create({
      data: {
        fileName: file.name,
        uploadedById: user.id,
        status: "PREVIEW",
        sheetsDetected: parsed.sheetsDetected,
        totalRows: summary.totalRows,
        validRows: summary.validRows,
        invalidRows: summary.invalidRows,
        newCount: summary.newQuestions,
        updateCount: summary.existingToUpdate,
        duplicateInFileCount: summary.duplicateRows,
        skippedCount: summary.duplicateRows + summary.duplicateExistingRows,
        accessLevelDefault: options.accessLevelDefault,
        createMissingTaxonomy: options.createMissingTaxonomy,
        previewPayload: {
          rawRows: parsed.rows,
          validRows,
          duplicateInFileCount: summary.duplicateRows,
          duplicateExistingCount: summary.duplicateExistingRows,
        } as object,
        errorReport: summary.rows as object,
      },
    });

    await logAdminAudit({
      userId: user.id,
      action: ADMIN_AUDIT_ACTIONS.QUESTION_IMPORT_PREVIEW,
      target: file.name,
      targetType: "question_import_batch",
      targetId: batch.id,
      metadata: {
        totalRows: summary.totalRows,
        validRows: summary.validRows,
        invalidRows: summary.invalidRows,
      },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({
      batchId: batch.id,
      preview: summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to parse workbook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export type StoredPreviewPayload = {
  rawRows: RawImportRow[];
  validRows: ValidatedImportRow[];
};
