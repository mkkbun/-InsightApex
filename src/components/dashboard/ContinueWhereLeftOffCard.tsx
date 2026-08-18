"use client";

import Link from "next/link";
import type { DashboardOverview } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

type ContinueLearning = NonNullable<DashboardOverview["continueLearning"]>;

export function ContinueWhereLeftOffCard({
  data,
  loading,
}: {
  data: ContinueLearning | null | undefined;
  loading?: boolean;
}) {
  if (!data) {
    return (
      <Card className={`h-full ${loading ? "opacity-60" : ""}`}>
        <CardHeader className="px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight text-ink-900 sm:text-lg">Continue Where You Left Off</h2>
          <p className="section-subtitle">Pick a paper to resume your syllabus</p>
        </CardHeader>
        <CardBody className="p-4 sm:p-5">
          <p className="text-sm text-slate-500">
            Select a paper above to see your last completed chapter and what to practise next.
          </p>
          <Link href="/dashboard/quiz" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Open Practice
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const statusLabel =
    data.status === "unfinished"
      ? "Unfinished chapter"
      : data.status === "all_complete"
        ? "Syllabus complete"
        : data.status === "ready_to_start"
          ? "Ready to start"
          : data.status === "no_syllabus"
            ? "No chapters yet"
            : "Up next";

  const statusTone =
    data.status === "all_complete"
      ? ("success" as const)
      : data.status === "unfinished"
        ? ("warning" as const)
        : ("brand" as const);

  return (
    <Card className={`h-full ${loading ? "opacity-60" : ""}`}>
      <CardHeader className="px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink-900 sm:text-lg">Continue Where You Left Off</h2>
            <p className="section-subtitle">
              {data.paperCode} – {data.paperTitle}
            </p>
          </div>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3 p-4 sm:p-5">
        {data.status === "no_syllabus" ? (
          <p className="text-sm text-slate-500">
            This paper has no active chapters yet. Check back after content is published.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Last completed
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink-900">
                  {data.lastCompleted
                    ? `${data.lastCompleted.categoryTitle} / ${data.lastCompleted.subCategoryTitle}`
                    : "None yet"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {data.status === "unfinished" ? "Resume" : "Up next"}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">
                  {data.upNext
                    ? `${data.upNext.categoryTitle} / ${data.upNext.subCategoryTitle}`
                    : data.status === "all_complete"
                      ? "Every chapter covered — well done"
                      : "—"}
                </p>
              </div>
            </div>

            {data.chaptersTotal > 0 && (
              <ProgressBar
                value={data.progressPercent}
                tone="brand"
                label="Chapter progress"
                showValue
              />
            )}

            {data.href ? (
              <Link href={data.href} className="block">
                <Button variant="gradient" className="w-full sm:w-auto">
                  {data.status === "unfinished"
                    ? "Continue unfinished chapter"
                    : data.status === "ready_to_start"
                      ? "Start first chapter"
                      : "Continue"}
                </Button>
              </Link>
            ) : data.status === "all_complete" ? (
              <Link href="/dashboard/quiz" className="block">
                <Button variant="outline" className="w-full sm:w-auto">
                  Review practice
                </Button>
              </Link>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
