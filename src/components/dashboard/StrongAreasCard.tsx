"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { WeakSubCategoryItem } from "@/components/dashboard/WeakSubCategoryItem";
import type { DashboardSubCategoryDetail } from "@/types";

const PREVIEW_COUNT = 3;

export function StrongAreasCard({
  subCategoryDetails,
  hasAttempts,
}: {
  subCategoryDetails: DashboardSubCategoryDetail[];
  hasAttempts: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const strong = subCategoryDetails
    .filter((s) => s.status === "Strong")
    .sort((a, b) => b.accuracy - a.accuracy);

  const visible = showAll ? strong : strong.slice(0, PREVIEW_COUNT);
  const hasMore = strong.length > PREVIEW_COUNT;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Strong areas</h2>
            <p className="section-subtitle">Sub categories where you score 80%+</p>
          </div>
          {hasAttempts && hasMore && (
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
      <CardBody>
        {!hasAttempts || strong.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {hasAttempts
              ? "Keep practicing to unlock strong areas."
              : "Complete quizzes to see your strengths."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((sc) => (
              <WeakSubCategoryItem key={sc.id} subCategory={sc} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
