"use client";

import dynamic from "next/dynamic";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { DashboardScoreHistoryPoint } from "@/types";

const ScoreChart = dynamic(
  () =>
    import("@/components/dashboard/ScoreChart").then((m) => ({
      default: m.ScoreChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[240px] items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
        Loading chart…
      </div>
    ),
  }
);

export function PerformanceTrendCard({
  scoreHistory,
}: {
  scoreHistory: DashboardScoreHistoryPoint[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Performance trend</h2>
        <p className="section-subtitle">Score history for this paper</p>
      </CardHeader>
      <CardBody>
        <ScoreChart data={scoreHistory} />
      </CardBody>
    </Card>
  );
}
