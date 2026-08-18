"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { DashboardCoverage } from "@/types";
import { cn } from "@/lib/utils";

const LEVELS = [
  {
    key: "completed" as const,
    label: "Completed",
    color: "#10b981",
    dotClass: "bg-emerald-500",
  },
  {
    key: "partial" as const,
    label: "Partially Covered",
    color: "#fbbf24",
    dotClass: "bg-amber-400",
  },
  {
    key: "notStarted" as const,
    label: "Not Started",
    color: "#e2e8f0",
    dotClass: "bg-slate-200",
  },
];

function CoverageDonut({
  completed,
  partial,
  notStarted,
  completedPercent,
  size = 172,
  strokeWidth = 22,
}: {
  completed: number;
  partial: number;
  notStarted: number;
  completedPercent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const total = Math.max(1, completed + partial + notStarted);

  const segments = [
    { key: "completed", value: completed, color: "#10b981" },
    { key: "partial", value: partial, color: "#fbbf24" },
    { key: "notStarted", value: notStarted, color: "#e2e8f0" },
  ].filter((seg) => seg.value > 0);

  let offset = 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${completedPercent}% of topics completed`}
    >
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => {
          const length = (seg.value / total) * circumference;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={seg.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold leading-none tabular-nums text-ink-900">
          {completedPercent}%
        </span>
      </div>
    </div>
  );
}

export function OverallCoverageCard({
  coverage,
  onOpenSyllabus,
}: {
  coverage?: DashboardCoverage | null;
  onOpenSyllabus: () => void;
}) {
  const total = coverage?.totalTopics ?? 0;
  const completed = coverage?.completedCount ?? 0;
  const partial = coverage?.partialCount ?? 0;
  const notStarted = coverage?.notStartedCount ?? (total > 0 ? total : 0);
  const completedPercent = coverage?.completedPercent ?? 0;
  const partialPercent = coverage?.partialPercent ?? 0;
  const notStartedPercent = coverage?.notStartedPercent ?? (total > 0 ? 100 : 0);

  const counts = {
    completed,
    partial,
    notStarted,
  };
  const percents = {
    completed: completedPercent,
    partial: partialPercent,
    notStarted: notStartedPercent,
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Overall Coverage</h2>
        <p className="section-subtitle">
          {coverage?.label ?? "Syllabus topics completed, partial, and not started"}
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
            <p className="text-sm font-medium text-ink-900">No syllabus topics for this paper yet.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Coverage appears here once categories and sub categories are published.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
            <CoverageDonut
              completed={completed}
              partial={partial}
              notStarted={notStarted}
              completedPercent={completedPercent}
            />

            <div className="w-full min-w-0 space-y-3 sm:w-auto sm:min-w-[12.5rem]">
              <ul className="grid grid-cols-1 gap-2.5">
                {LEVELS.map((level) => (
                  <li key={level.key} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        level.key === "notStarted" && "ring-1 ring-slate-300/80",
                        level.dotClass
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{level.label}</p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {counts[level.key]}{" "}
                        <span className="text-slate-400">({percents[level.key]}%)</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-snug text-slate-400">
                of {total} topic{total === 1 ? "" : "s"} completed
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenSyllabus}
          disabled={total === 0}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          View Syllabus Topics →
        </button>
      </CardBody>
    </Card>
  );
}
