"use client";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { DashboardKnowledgeCoverage, DashboardKnowledgeCoverageLevelItem } from "@/types";

export function KnowledgeCoverageModal({
  open,
  onClose,
  knowledgeCoverage,
  paperLabel = "Selected paper",
}: {
  open: boolean;
  onClose: () => void;
  knowledgeCoverage?: DashboardKnowledgeCoverage | null;
  paperLabel?: string;
}) {
  const weak = knowledgeCoverage?.weak ?? [];
  const developing = knowledgeCoverage?.developing ?? [];
  const strong = knowledgeCoverage?.strong ?? [];
  const assessed = knowledgeCoverage?.assessedCount ?? 0;
  const thresholds = knowledgeCoverage?.thresholds;

  return (
    <Modal open={open} onClose={onClose} title="Knowledge Coverage" size="lg">
      <p className="mb-4 text-sm text-slate-500">
        Performance by topic for{" "}
        <span className="font-medium text-slate-800">{paperLabel}</span>
        {assessed > 0 && knowledgeCoverage ? (
          <>
            {" "}
            · Weak {knowledgeCoverage.weakPercent}% · Developing{" "}
            {knowledgeCoverage.developingPercent}% · Strong {knowledgeCoverage.strongPercent}%
          </>
        ) : null}
      </p>

      {thresholds && (
        <p className="mb-4 text-xs text-slate-400">
          Weak below {thresholds.weakBelow}% · Developing {thresholds.developingMin}–
          {thresholds.developingMax}% · Strong {thresholds.strongAtOrAbove}%+
        </p>
      )}

      {assessed === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink-900">
            Not enough activity yet to calculate knowledge coverage.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Complete more practice questions to build your coverage profile.
          </p>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          <Section
            title="Weak"
            tone="danger"
            percent={knowledgeCoverage?.weakPercent ?? 0}
            items={weak}
          />
          <Section
            title="Developing"
            tone="warning"
            percent={knowledgeCoverage?.developingPercent ?? 0}
            items={developing}
          />
          <Section
            title="Strong"
            tone="success"
            percent={knowledgeCoverage?.strongPercent ?? 0}
            items={strong}
          />
        </div>
      )}
    </Modal>
  );
}

function Section({
  title,
  tone,
  percent,
  items,
}: {
  title: string;
  tone: "success" | "warning" | "danger";
  percent: number;
  items: DashboardKnowledgeCoverageLevelItem[];
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
        <span className="text-xs tabular-nums text-slate-400">{percent}% of assessed topics</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">None in this level yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-400">{item.categoryTitle}</p>
                  <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink-900">
                    {item.accuracy}%
                  </p>
                  <p className="text-[11px] text-slate-400">{item.levelLabel}</p>
                </div>
              </div>
              {item.totalAnswered > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {item.correctCount} correct · {item.totalAnswered - item.correctCount} incorrect ·{" "}
                  {item.totalAnswered} answered
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
