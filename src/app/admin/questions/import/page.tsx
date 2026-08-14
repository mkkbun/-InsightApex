"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type PreviewRow = {
  rowNumber: number;
  sheetName: string;
  externalQuestionId: string;
  paperCode: string;
  categoryTitle: string;
  subCategoryTitle: string;
  questionType: string;
  reviewStatus: string;
  status: "valid" | "invalid" | "duplicate_in_file" | "duplicate_existing";
  action: "CREATE" | "SKIP" | null;
  errorMessage: string | null;
};

type PreviewSummary = {
  fileName: string;
  sheetsDetected: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newQuestions: number;
  existingToUpdate: number;
  duplicateRows: number;
  duplicateExistingRows: number;
  hasDuplicates: boolean;
  rows: PreviewRow[];
};

type ConfirmResult = {
  batchId: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
  status: "COMPLETED" | "FAILED";
};

type Step = "upload" | "preview" | "result";

export default function QuestionImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [accessLevel, setAccessLevel] = useState<"FREE_TRIAL" | "PREMIUM">("PREMIUM");
  const [createMissingTaxonomy, setCreateMissingTaxonomy] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    if (showInvalidOnly) {
      return preview.rows.filter((r) => r.status !== "valid");
    }
    return preview.rows;
  }, [preview, showInvalidOnly]);

  async function runPreview() {
    if (!file) {
      setError("Choose an .xlsx file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "options",
        JSON.stringify({
          accessLevelDefault: accessLevel,
          createMissingTaxonomy,
        })
      );
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to parse workbook");
      setBatchId(json.batchId);
      setPreview(json.preview);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!batchId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/questions/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          accessLevelDefault: accessLevel,
          createMissingTaxonomy,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.result) setResult(json.result);
        throw new Error(json.error ?? "Import failed");
      }
      setResult(json.result);
      if (json.preview) setPreview(json.preview);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      if (result || batchId) setStep("result");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setBatchId(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowInvalidOnly(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import Excel"
        description="Upload an FA Question Bank–style .xlsx workbook. Excel Question IDs must be unique — duplicates in the file or IDs that already exist in the system are rejected and nothing is imported."
        action={{
          label: "Import history",
          href: "/admin/questions/import/history",
        }}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/questions" className="text-brand-600 hover:underline">
          ← Practice Questions
        </Link>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">1. Upload workbook</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Excel file (.xlsx only)
              </label>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {file && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Access level for imported questions
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="access"
                    checked={accessLevel === "PREMIUM"}
                    onChange={() => setAccessLevel("PREMIUM")}
                  />
                  All as PREMIUM (default)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="access"
                    checked={accessLevel === "FREE_TRIAL"}
                    onChange={() => setAccessLevel("FREE_TRIAL")}
                  />
                  All as FREE_TRIAL
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                If the file has an Access Level column, that value overrides this default per row.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={createMissingTaxonomy}
                onChange={(e) => setCreateMissingTaxonomy(e.target.checked)}
              />
              <span>
                Create missing Categories / Sub Categories from Topic ID and Sub-Topic ID when
                confirming import (never creates duplicates when IDs already match).
              </span>
            </label>

            <Button onClick={() => void runPreview()} disabled={busy || !file}>
              {busy ? "Parsing…" : "Parse & preview"}
            </Button>
          </CardBody>
        </Card>
      )}

      {step === "preview" && preview && (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">2. Preview & validation</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="File" value={preview.fileName} />
                <Stat label="Sheets" value={String(preview.sheetsDetected.length)} />
                <Stat label="Total rows" value={String(preview.totalRows)} />
                <Stat label="Valid rows" value={String(preview.validRows)} />
                <Stat label="Invalid rows" value={String(preview.invalidRows)} />
                <Stat label="New questions" value={String(preview.newQuestions)} />
                <Stat
                  label="Duplicates (total)"
                  value={String(
                    (preview.duplicateRows ?? 0) + (preview.duplicateExistingRows ?? 0)
                  )}
                />
                <Stat label="Duplicates in file" value={String(preview.duplicateRows)} />
                <Stat
                  label="Already in system"
                  value={String(preview.duplicateExistingRows ?? 0)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Sheets: {preview.sheetsDetected.join(", ") || "—"}
              </p>

              {preview.hasDuplicates && (
                <Alert tone="error">
                  This file is duplicated. One or more Question IDs are repeated in the Excel file or
                  already exist in InsightApex ({preview.duplicateRows} in-file ·{" "}
                  {preview.duplicateExistingRows ?? 0} already in system). Fix the file and upload
                  again — import is blocked while duplicates remain.
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showInvalidOnly}
                    onChange={(e) => setShowInvalidOnly(e.target.checked)}
                  />
                  Show invalid / duplicates only
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createMissingTaxonomy}
                    onChange={(e) => setCreateMissingTaxonomy(e.target.checked)}
                  />
                  Create missing taxonomy on confirm
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void confirmImport()}
                  disabled={busy || preview.validRows === 0 || preview.hasDuplicates}
                >
                  {busy
                    ? "Importing…"
                    : preview.hasDuplicates
                      ? "Import blocked — file is duplicated"
                      : `Confirm import (${preview.validRows} valid)`}
                </Button>
                <Button variant="outline" onClick={reset} disabled={busy}>
                  Cancel
                </Button>
                {batchId && (
                  <a
                    className="inline-flex items-center text-sm font-medium text-brand-600 hover:underline"
                    href={`/api/admin/questions/import/history/${batchId}/errors?format=csv`}
                  >
                    Download error report (CSV)
                  </a>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="overflow-x-auto p-0">
              {visibleRows.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No rows to show" />
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableHeader>Row</TableHeader>
                    <TableHeader>Question ID</TableHeader>
                    <TableHeader>Paper</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Sub Category</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Review</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Error</TableHeader>
                  </TableHead>
                  <TableBody>
                    {visibleRows.map((r) => (
                      <TableRow key={`${r.sheetName}-${r.rowNumber}`}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="font-medium">{r.externalQuestionId}</TableCell>
                        <TableCell>{r.paperCode}</TableCell>
                        <TableCell>{r.categoryTitle}</TableCell>
                        <TableCell>{r.subCategoryTitle}</TableCell>
                        <TableCell>{r.questionType}</TableCell>
                        <TableCell>{r.reviewStatus}</TableCell>
                        <TableCell>
                          <Badge
                            tone={
                              r.status === "valid"
                                ? "success"
                                : r.status === "duplicate_in_file" ||
                                    r.status === "duplicate_existing"
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {r.status === "valid"
                              ? r.action ?? "valid"
                              : r.status === "duplicate_existing"
                                ? "DUPLICATE · already exists"
                                : r.status === "duplicate_in_file"
                                  ? "DUPLICATE · in file"
                                  : r.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-red-600">
                          {r.errorMessage ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {step === "result" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">3. Import result</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {busy && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {result && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Created" value={String(result.created)} />
                  <Stat label="Updated" value={String(result.updated)} />
                  <Stat label="Skipped" value={String(result.skipped)} />
                  <Stat label="Failed" value={String(result.failed)} />
                  <Stat label="Total processed" value={String(result.totalProcessed)} />
                </div>
                <Badge tone={result.status === "COMPLETED" ? "success" : "danger"}>
                  {result.status}
                </Badge>
                <div className="flex flex-wrap gap-3">
                  <a
                    className="text-sm font-medium text-brand-600 hover:underline"
                    href={`/api/admin/questions/import/history/${result.batchId}/errors?format=csv`}
                  >
                    Download error report (CSV)
                  </a>
                  <Link
                    href="/admin/questions/import/history"
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    View import history
                  </Link>
                  <Button variant="outline" onClick={reset}>
                    Import another file
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
