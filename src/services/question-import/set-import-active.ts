/**
 * Soft-activate or deactivate all PRACTICE questions from a completed import batch.
 * Uses Question.isActive (does not delete data).
 */

import { prisma } from "@/lib/prisma";
import { resolveBatchExternalIds } from "./batch-external-ids";

export type SetImportActiveResult = {
  batchId: string;
  questionsActive: boolean;
  updatedCount: number;
  externalIds: string[];
};

export async function setImportBatchQuestionsActive(params: {
  batchId: string;
  questionsActive: boolean;
}): Promise<SetImportActiveResult> {
  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
  });

  if (!batch) {
    throw new Error("Import batch not found");
  }

  if (batch.status !== "COMPLETED") {
    throw new Error("Only completed imports can be activated or deactivated.");
  }

  const payload =
    batch.previewPayload && typeof batch.previewPayload === "object"
      ? (batch.previewPayload as Record<string, unknown>)
      : null;

  const externalIds = resolveBatchExternalIds(payload, "all");
  if (externalIds.length === 0) {
    throw new Error(
      "No Excel question IDs were recorded for this import. Manage questions individually from Practice Questions."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.question.updateMany({
      where: {
        externalQuestionId: { in: externalIds },
        purpose: "PRACTICE",
      },
      data: {
        isActive: params.questionsActive,
      },
    });

    const prev = payload ?? {};
    await tx.questionImportBatch.update({
      where: { id: params.batchId },
      data: {
        previewPayload: {
          ...prev,
          questionsActive: params.questionsActive,
          questionsActiveUpdatedAt: new Date().toISOString(),
        } as object,
      },
    });

    return updated.count;
  });

  return {
    batchId: params.batchId,
    questionsActive: params.questionsActive,
    updatedCount: result,
    externalIds,
  };
}
