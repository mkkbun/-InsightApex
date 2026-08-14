/**
 * Delete questions that came from an Excel import batch (wrong file / bad import).
 */

import { prisma } from "@/lib/prisma";
import { resolveBatchExternalIds } from "./batch-external-ids";

export type DeleteImportMode = "created" | "all";

export type DeleteImportResult = {
  batchId: string;
  deletedCount: number;
  deletedExternalIds: string[];
  mode: DeleteImportMode;
  status: "CANCELLED";
};

export async function deleteImportBatchQuestions(params: {
  batchId: string;
  mode: DeleteImportMode;
}): Promise<DeleteImportResult> {
  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
  });

  if (!batch) {
    throw new Error("Import batch not found");
  }

  if (batch.status !== "COMPLETED") {
    throw new Error("Only completed imports can be deleted.");
  }

  const payload =
    batch.previewPayload && typeof batch.previewPayload === "object"
      ? (batch.previewPayload as Record<string, unknown>)
      : null;

  const externalIds = resolveBatchExternalIds(payload, params.mode);
  if (externalIds.length === 0) {
    throw new Error(
      "No Excel question IDs were recorded for this import. Delete questions individually from Practice Questions."
    );
  }

  const questions = await prisma.question.findMany({
    where: {
      externalQuestionId: { in: externalIds },
      purpose: "PRACTICE",
    },
    select: { id: true, externalQuestionId: true },
  });

  const questionIds = questions.map((q) => q.id);
  const deletedExternalIds = questions
    .map((q) => q.externalQuestionId)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    if (questionIds.length > 0) {
      await tx.questionResponse.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      await tx.mockExamQuestion.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      await tx.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }

    const prev = payload ?? {};
    await tx.questionImportBatch.update({
      where: { id: params.batchId },
      data: {
        status: "CANCELLED",
        previewPayload: {
          ...prev,
          deletedAt: new Date().toISOString(),
          deleteMode: params.mode,
          deletedExternalIds,
          deletedCount: questionIds.length,
          questionsActive: false,
        } as object,
        errorReport: {
          note: `Import deleted (${params.mode}). Removed ${questionIds.length} question(s).`,
          deletedExternalIds,
          // Preserve duplicate counts from before delete for history display
          duplicateInFileCount:
            typeof prev.duplicateInFileCount === "number"
              ? prev.duplicateInFileCount
              : batch.duplicateInFileCount,
          duplicateExistingCount:
            typeof prev.duplicateExistingCount === "number"
              ? prev.duplicateExistingCount
              : 0,
        } as object,
      },
    });
  });

  return {
    batchId: params.batchId,
    deletedCount: questionIds.length,
    deletedExternalIds,
    mode: params.mode,
    status: "CANCELLED",
  };
}
