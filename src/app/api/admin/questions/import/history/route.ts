import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContentEditorApi } from "@/lib/admin-auth";
import {
  countDuplicatesFromErrorReport,
  resolveBatchExternalIds,
} from "@/services/question-import";

export async function GET() {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batches = await prisma.questionImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      validRows: true,
      invalidRows: true,
      createdCount: true,
      updatedCount: true,
      failedCount: true,
      skippedCount: true,
      duplicateInFileCount: true,
      accessLevelDefault: true,
      createMissingTaxonomy: true,
      createdAt: true,
      completedAt: true,
      previewPayload: true,
      errorReport: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Aggregate active state for completed imports that still have questions
  const externalIdSets = batches.map((b) => {
    const payload =
      b.previewPayload && typeof b.previewPayload === "object"
        ? (b.previewPayload as Record<string, unknown>)
        : null;
    return {
      id: b.id,
      externalIds: resolveBatchExternalIds(payload, "all"),
      payload,
    };
  });

  const allExternalIds = [
    ...new Set(externalIdSets.flatMap((s) => s.externalIds)),
  ];

  const activeByExternalId = new Map<string, boolean>();
  if (allExternalIds.length > 0) {
    const questions = await prisma.question.findMany({
      where: {
        externalQuestionId: { in: allExternalIds },
        purpose: "PRACTICE",
      },
      select: { externalQuestionId: true, isActive: true },
    });
    for (const q of questions) {
      if (q.externalQuestionId) {
        activeByExternalId.set(q.externalQuestionId, q.isActive);
      }
    }
  }

  return NextResponse.json({
    imports: batches.map((b) => {
      const set = externalIdSets.find((s) => s.id === b.id);
      const payload = set?.payload ?? null;
      const fromReport = countDuplicatesFromErrorReport(b.errorReport);

      const payloadDupExisting =
        payload && typeof payload.duplicateExistingCount === "number"
          ? payload.duplicateExistingCount
          : null;
      const payloadDupInFile =
        payload && typeof payload.duplicateInFileCount === "number"
          ? payload.duplicateInFileCount
          : null;

      const errObj =
        b.errorReport &&
        typeof b.errorReport === "object" &&
        !Array.isArray(b.errorReport)
          ? (b.errorReport as Record<string, unknown>)
          : null;

      const duplicateInFile = Math.max(
        fromReport.duplicateInFile,
        payloadDupInFile ?? 0,
        typeof errObj?.duplicateInFileCount === "number"
          ? errObj.duplicateInFileCount
          : 0,
        b.duplicateInFileCount
      );

      const duplicateExisting = Math.max(
        fromReport.duplicateExisting,
        payloadDupExisting ?? 0,
        typeof errObj?.duplicateExistingCount === "number"
          ? errObj.duplicateExistingCount
          : 0
      );

      const externalIds = set?.externalIds ?? [];
      let activeCount = 0;
      let inactiveCount = 0;
      let foundCount = 0;
      for (const extId of externalIds) {
        if (!activeByExternalId.has(extId)) continue;
        foundCount += 1;
        if (activeByExternalId.get(extId)) activeCount += 1;
        else inactiveCount += 1;
      }

      const storedActive =
        payload && typeof payload.questionsActive === "boolean"
          ? payload.questionsActive
          : null;

      let questionsActive: boolean | null = storedActive;
      if (foundCount > 0) {
        if (inactiveCount === 0) questionsActive = true;
        else if (activeCount === 0) questionsActive = false;
        else questionsActive = null; // mixed
      } else if (b.status !== "COMPLETED") {
        questionsActive = null;
      }

      return {
        id: b.id,
        fileName: b.fileName,
        status: b.status,
        totalRows: b.totalRows,
        validRows: b.validRows,
        invalidRows: b.invalidRows,
        createdCount: b.createdCount,
        updatedCount: b.updatedCount,
        failedCount: b.failedCount,
        skippedCount: b.skippedCount,
        duplicateInFileCount: duplicateInFile,
        duplicateExistingCount: duplicateExisting,
        duplicateCount: duplicateInFile + duplicateExisting,
        questionCount: foundCount,
        activeQuestionCount: activeCount,
        questionsActive,
        accessLevelDefault: b.accessLevelDefault,
        createMissingTaxonomy: b.createMissingTaxonomy,
        createdAt: b.createdAt.toISOString(),
        completedAt: b.completedAt?.toISOString() ?? null,
        uploadedBy: b.uploadedBy,
      };
    }),
  });
}
