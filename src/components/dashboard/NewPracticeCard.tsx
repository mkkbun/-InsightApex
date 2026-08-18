"use client";

import { useState } from "react";
import type { DashboardRecommendedPractice } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RecommendedPracticeItem } from "@/components/dashboard/RecommendedPracticeItem";

const PREVIEW_COUNT = 3;

export function NewPracticeCard({
  items,
  paperLabel,
}: {
  items: DashboardRecommendedPractice[];
  paperLabel?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) {
    return (
      <section id="new-practice" className="scroll-mt-6">
        <Card>
          <CardHeader>
            <h2 className="section-title">New Practice</h2>
            <p className="section-subtitle">
              {paperLabel
                ? `All chapters in ${paperLabel} have been started`
                : "All chapters have been started"}
            </p>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">
              No unpractised chapters left for this paper. Great coverage — keep reviewing weak topics
              above.
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  const visible = showAll ? items : items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <section id="new-practice" className="scroll-mt-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">New Practice</h2>
              <p className="section-subtitle">
                Chapters you haven&apos;t practised yet
                {paperLabel ? ` · ${paperLabel}` : ""}
                {" · "}
                {items.length} remaining
              </p>
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {showAll ? "Show less" : "See all"}
              </button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {visible.map((item) => (
            <RecommendedPracticeItem key={item.subCategoryId} item={item} />
          ))}
          {!showAll && hasMore && (
            <p className="text-center text-xs text-slate-400">
              Showing {PREVIEW_COUNT} of {items.length} · tap See all for the rest
            </p>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
