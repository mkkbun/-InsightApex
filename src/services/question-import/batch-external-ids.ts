/**
 * Resolve Excel Question IDs linked to an import batch (from preview payload).
 */

import type { ValidatedImportRow } from "./types";

export type ImportExternalIdMode = "created" | "all";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function resolveBatchExternalIds(
  payload: Record<string, unknown> | null,
  mode: ImportExternalIdMode = "all"
): string[] {
  if (!payload) return [];

  const created = asStringArray(payload.createdExternalIds);
  const updated = asStringArray(payload.updatedExternalIds);

  if (created.length || updated.length) {
    if (mode === "created") return [...new Set(created)];
    return [...new Set([...created, ...updated])];
  }

  // Fallback for older batches: use validated preview rows
  const validRows = Array.isArray(payload.validRows)
    ? (payload.validRows as ValidatedImportRow[])
    : [];
  const fromPreview = validRows
    .map((row) => row.externalQuestionId)
    .filter((id): id is string => Boolean(id));

  if (mode === "created") {
    return [
      ...new Set(
        validRows
          .filter((row) => row.action === "CREATE" || !row.existingQuestionId)
          .map((row) => row.externalQuestionId)
          .filter(Boolean)
      ),
    ];
  }

  return [...new Set(fromPreview)];
}

/** Count duplicate rows from the batch error / preview report. */
export function countDuplicatesFromErrorReport(errorReport: unknown): {
  duplicateInFile: number;
  duplicateExisting: number;
} {
  if (!Array.isArray(errorReport)) {
    return { duplicateInFile: 0, duplicateExisting: 0 };
  }

  let duplicateInFile = 0;
  let duplicateExisting = 0;
  for (const row of errorReport) {
    if (!row || typeof row !== "object") continue;
    const status = (row as { status?: string }).status;
    if (status === "duplicate_in_file") duplicateInFile += 1;
    if (status === "duplicate_existing") duplicateExisting += 1;
  }
  return { duplicateInFile, duplicateExisting };
}
