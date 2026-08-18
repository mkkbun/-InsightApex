"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ExamReadinessBreakdownItem } from "@/lib/exam-insights";
import { cn } from "@/lib/utils";

type ReadinessBreakdownModalProps = {
  open: boolean;
  onClose: () => void;
  items: ExamReadinessBreakdownItem[];
  empty?: boolean;
  paperLabel?: string;
};

function BreakdownIcon({ id, tone }: { id: ExamReadinessBreakdownItem["id"]; tone: "blue" | "gold" }) {
  const wrap =
    tone === "gold"
      ? "bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/50"
      : "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/40";

  const paths: Record<ExamReadinessBreakdownItem["id"], ReactNode> = {
    coverage: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    average: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
    recent: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
      />
    ),
    consistency: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  };

  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", wrap)}>
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        {paths[id]}
      </svg>
    </span>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: "blue" | "gold" }) {
  const fill = tone === "gold" ? "bg-amber-300" : "bg-sky-300";
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="relative h-2 w-full rounded-full bg-white/15">
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full", fill)}
        style={{ width: `${pct}%` }}
      />
      <span
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)]"
        style={{ left: `max(0px, calc(${pct}% - 6px))` }}
        aria-hidden
      />
    </div>
  );
}

/**
 * Dark-blue “Readiness Breakdown” popup matching the product mock.
 */
export function ReadinessBreakdownModal({
  open,
  onClose,
  items,
  empty = false,
  paperLabel,
}: ReadinessBreakdownModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close readiness breakdown"
        className="absolute inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="readiness-breakdown-title"
        className="relative z-10 w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-[#2456f5] p-5 text-white shadow-float sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="readiness-breakdown-title" className="text-lg font-semibold tracking-tight">
              Readiness Breakdown
            </h2>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/50 text-[11px] font-semibold text-white/90"
              title="Factors that feed into Exam success metrics. Weights show relative emphasis in this view."
            >
              i
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {paperLabel ? <p className="mb-4 text-xs text-white/70">{paperLabel}</p> : null}

        {empty ? (
          <p className="rounded-xl bg-white/10 px-4 py-6 text-center text-sm text-white/80">
            Complete a practice or mock to see your readiness breakdown.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 sm:gap-4">
                <BreakdownIcon id={item.id} tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    {item.label}{" "}
                    <span className="font-normal text-white/75">({item.weightPercent}%)</span>
                  </p>
                </div>
                <p className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                  {Math.round(item.valuePercent)}%
                </p>
                <div className="w-[5.5rem] shrink-0 sm:w-36">
                  <ProgressBar value={item.valuePercent} tone={item.tone} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
