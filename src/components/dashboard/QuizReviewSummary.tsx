"use client";

import { Button } from "@/components/ui/Button";

interface QuizReviewSummaryProps {
  totalQuestions: number;
  completeCount: number;
  incompleteCount: number;
  flaggedCount: number;
  onResume: () => void;
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-medium text-slate-700">{label}</div>
      <div className="flex min-w-[72px] items-center justify-center rounded-xl bg-slate-100 px-4 py-3.5 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

export function QuizReviewSummary({
  totalQuestions,
  completeCount,
  incompleteCount,
  flaggedCount,
  onResume,
}: QuizReviewSummaryProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Review</h1>

      <div className="space-y-3">
        <StatRow label="Total number of questions" value={totalQuestions} />
        <StatRow label="Number of complete questions" value={completeCount} />
        <StatRow label="Number of incomplete questions" value={incompleteCount} />
        <StatRow label="Number of flagged questions" value={flaggedCount} />
      </div>

      <Button variant="secondary" size="lg" onClick={onResume} className="min-w-[160px]">
        Resume Test
      </Button>
    </div>
  );
}
