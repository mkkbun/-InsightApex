"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { WeakSubCategoryItem } from "@/components/dashboard/WeakSubCategoryItem";
import type { DashboardSubCategoryDetail } from "@/types";

const PREVIEW_COUNT = 3;

export function WeakAreasCard({
  subCategoryDetails,
  hasAttempts,
}: {
  subCategoryDetails: DashboardSubCategoryDetail[];
  hasAttempts: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const weak = subCategoryDetails
    .filter((s) => s.status === "Weak" || s.status === "Average")
    .sort((a, b) => a.accuracy - b.accuracy);

  const visible = showAll ? weak : weak.slice(0, PREVIEW_COUNT);
  const hasMore = weak.length > PREVIEW_COUNT;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Weak areas</h2>
            <p className="section-subtitle">Focus here to raise your exam success metrics</p>
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
        {!hasAttempts || weak.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {hasAttempts
              ? "No weak areas flagged for this paper — great work."
              : "Complete quizzes to see topics that need work."}
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
