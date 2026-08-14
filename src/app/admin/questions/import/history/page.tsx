"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

type ImportRow = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  duplicateInFileCount: number;
  duplicateExistingCount: number;
  duplicateCount: number;
  questionCount: number;
  activeQuestionCount: number;
  questionsActive: boolean | null;
  createdAt: string;
  completedAt: string | null;
  uploadedBy: { id: string; name: string; email: string };
};

export default function QuestionImportHistoryPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/questions/import/history");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load history");
      setRows(json.imports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleToggleActive(row: ImportRow, nextActive: boolean) {
    if (row.status !== "COMPLETED") return;

    const label = nextActive ? "activate" : "deactivate";
    const ok = window.confirm(
      `${nextActive ? "Activate" : "Deactivate"} all questions from import "${row.fileName}"?\n\n` +
        `This sets Practice Questions from this file to ${nextActive ? "Active" : "Inactive"} ` +
        `(they stay in the database — use Delete import to remove them permanently).`
    );
    if (!ok) return;

    setBusyId(row.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/import/history/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsActive: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to ${label} import`);
      setMessage(
        `${nextActive ? "Activated" : "Deactivated"} ${json.result?.updatedCount ?? 0} question(s) from "${row.fileName}".`
      );
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${label} import`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: ImportRow) {
    if (row.status !== "COMPLETED") return;

    const deleteAll = window.confirm(
      `Delete Excel import "${row.fileName}"?\n\n` +
        `This permanently removes questions from this file.\n` +
        `• Created by this import: ${row.createdCount}\n` +
        `• Updated by this import: ${row.updatedCount}\n\n` +
        `OK = delete created + updated (whole wrong file)\n` +
        `Cancel = choose created-only or abort`
    );

    let mode: "all" | "created" = "all";
    if (!deleteAll) {
      const createdOnly = window.confirm(
        `Delete only questions CREATED by this import (${row.createdCount})?\n\n` +
          `OK = created only\n` +
          `Cancel = abort`
      );
      if (!createdOnly) return;
      mode = "created";
    }

    setBusyId(row.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/questions/import/history/${row.id}?mode=${mode}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete import");
      setMessage(
        `Deleted ${json.result?.deletedCount ?? 0} question(s) from "${row.fileName}".`
      );
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete import");
    } finally {
      setBusyId(null);
    }
  }

  function statusBadge(r: ImportRow) {
    if (r.status === "COMPLETED") {
      if (r.questionsActive === false) {
        return (
          <div className="flex flex-col gap-1">
            <Badge tone="success">COMPLETED</Badge>
            <Badge tone="warning">DEACTIVATED</Badge>
          </div>
        );
      }
      return <Badge tone="success">COMPLETED</Badge>;
    }
    if (r.status === "FAILED" || r.status === "CANCELLED") {
      return (
        <Badge tone="danger">
          {r.status === "CANCELLED" ? "DELETED" : r.status}
        </Badge>
      );
    }
    return <Badge tone="neutral">{r.status}</Badge>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import History"
        description="Excel question bank uploads — duplicates, activate/deactivate imports, error reports, and delete wrong imports."
        action={{ label: "Import Excel", href: "/admin/questions/import" }}
      />

      <Link href="/admin/questions" className="text-sm text-brand-600 hover:underline">
        ← Practice Questions
      </Link>

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No imports yet"
          description="Upload an FA Question Bank workbook to get started."
          actionLabel="Import Excel"
          actionHref="/admin/questions/import"
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <Table>
              <TableHead>
                <TableHeader>File</TableHeader>
                <TableHeader>Uploaded by</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Updated</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Duplicates</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Report</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const dups = r.duplicateCount ?? 0;
                  const busy = busyId === r.id;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.fileName}</TableCell>
                      <TableCell>
                        <div>
                          <p>{r.uploadedBy.name}</p>
                          <p className="text-xs text-slate-500">{r.uploadedBy.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{r.createdCount}</TableCell>
                      <TableCell>{r.updatedCount}</TableCell>
                      <TableCell>{r.failedCount}</TableCell>
                      <TableCell>
                        {dups > 0 ? (
                          <div className="space-y-1">
                            <Badge tone="warning">DUPLICATE · {dups}</Badge>
                            <p className="text-[11px] leading-snug text-slate-500">
                              {r.duplicateInFileCount > 0 && (
                                <span>
                                  {r.duplicateInFileCount} in file
                                  {r.duplicateExistingCount > 0 ? " · " : ""}
                                </span>
                              )}
                              {r.duplicateExistingCount > 0 && (
                                <span>{r.duplicateExistingCount} already exist</span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell>
                        <a
                          className="text-sm font-medium text-brand-600 hover:underline"
                          href={`/api/admin/questions/import/history/${r.id}/errors?format=csv`}
                        >
                          Download CSV
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "COMPLETED" ? (
                          <div className="flex flex-col items-end gap-1">
                            {r.questionsActive === false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-700 hover:bg-emerald-50"
                                disabled={busy}
                                onClick={() => void handleToggleActive(r, true)}
                              >
                                {busy ? "Saving…" : "Activate"}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-700 hover:bg-amber-50"
                                disabled={busy}
                                onClick={() => void handleToggleActive(r, false)}
                              >
                                {busy ? "Saving…" : "Deactivate"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={busy}
                              onClick={() => void handleDelete(r)}
                            >
                              {busy ? "Working…" : "Delete import"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
