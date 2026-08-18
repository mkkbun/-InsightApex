"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { DashboardCoverage, DashboardCoverageTopic } from "@/types";

export function SyllabusTopicsModal({
  open,
  onClose,
  coverage,
  paperLabel = "Selected paper",
}: {
  open: boolean;
  onClose: () => void;
  coverage?: DashboardCoverage | null;
  paperLabel?: string;
}) {
  const completed = coverage?.topics?.completed ?? [];
  const partial = coverage?.topics?.partial ?? [];
  const notStarted = coverage?.topics?.notStarted ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Syllabus Topics" size="lg">
      <p className="mb-4 text-sm text-slate-500">
        Coverage for <span className="font-medium text-slate-800">{paperLabel}</span>
        {coverage ? (
          <>
            {" "}
            · Completed {coverage.completedPercent}% · Partial {coverage.partialPercent}% · Not
            started {coverage.notStartedPercent}%
          </>
        ) : null}
      </p>

      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        <Section title="Completed" tone="success" items={completed} empty="No completed topics yet." />
        <Section
          title="Partially Covered"
          tone="warning"
          items={partial}
          empty="No partially covered topics."
        />
        <Section title="Not Started" tone="neutral" items={notStarted} empty="Every topic has been started." />
      </div>
    </Modal>
  );
}

function Section({
  title,
  tone,
  items,
  empty,
}: {
  title: string;
  tone: "success" | "warning" | "neutral";
  items: DashboardCoverageTopic[];
  empty: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const href = `/dashboard/quiz?${new URLSearchParams({
              paperId: item.paperId,
              categoryId: item.categoryId,
              subCategoryId: item.id,
            }).toString()}`;
            return (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-400">{item.categoryTitle}</p>
                    <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.uniqueAnswered} of {item.totalQuestions} questions answered
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Study →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
