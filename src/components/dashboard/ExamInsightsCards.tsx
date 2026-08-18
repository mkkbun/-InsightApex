"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { ExamReadinessGauge } from "@/components/dashboard/ExamReadinessGauge";
import { ReadinessBreakdownModal } from "@/components/dashboard/ReadinessBreakdownModal";
import {
  computeExamInsights,
  getExamReadinessBreakdown,
  getMainReadinessBlocker,
  getPredictionConfidence,
  type ScoreTrackSummary,
} from "@/lib/exam-insights";

interface ExamInsightsCardsProps {
  averageScore: number;
  bestScore: number;
  coveragePercent: number;
  studyStreak: number;
  totalAttempts: number;
  paperLabel?: string;
  practiceScores?: ScoreTrackSummary;
  mockScores?: ScoreTrackSummary;
}

/**
 * Three side-by-side semicircle gauges (Exam success metrics, Predicted mark, Pass probability).
 * Values still come from computeExamInsights (calculation unchanged).
 * Exam success metrics opens a Readiness Breakdown popup on click.
 */
export function ExamInsightsCards({
  averageScore,
  bestScore,
  coveragePercent,
  studyStreak,
  totalAttempts,
  paperLabel,
  practiceScores,
  mockScores = { latestScore: null, bestScore: null, count: 0 },
}: ExamInsightsCardsProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const mockAverage =
    mockScores.count > 0 && mockScores.latestScore != null
      ? mockScores.bestScore != null
        ? Math.round((mockScores.bestScore + mockScores.latestScore) / 2)
        : mockScores.latestScore
      : null;

  const insights = computeExamInsights({
    averageScore,
    bestScore,
    coveragePercent,
    studyStreak,
    totalAttempts,
    mockAverageScore: mockAverage,
    mockBestScore: mockScores.bestScore,
    mockAttemptCount: mockScores.count,
  });

  const breakdown = getExamReadinessBreakdown({
    coveragePercent,
    averageScore,
    bestScore,
    studyStreak,
    recentScore:
      practiceScores?.latestScore ?? mockScores.latestScore ?? bestScore,
  });

  const empty = !insights.hasData;
  const blocker = getMainReadinessBlocker(breakdown, empty);
  const predictionConfidence = getPredictionConfidence(totalAttempts, empty);
  const scope = paperLabel ? ` · ${paperLabel}` : "";

  const passHint =
    empty
      ? undefined
      : insights.passLean === "pass"
        ? "Leaning pass"
        : insights.passLean === "fail"
          ? "Keep practicing"
          : "Need more attempts";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex h-full flex-col">
          <CardBody className="flex flex-1 flex-col p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setBreakdownOpen(true)}
              className="group flex min-h-0 w-full flex-1 cursor-pointer flex-col rounded-xl text-left outline-none transition-colors hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-[#2456f5]/35"
              aria-haspopup="dialog"
              aria-expanded={breakdownOpen}
              aria-label="Exam readiness — open readiness breakdown"
            >
              <div className="flex items-center gap-1.5">
                <p className="text-base font-semibold text-ink-900">Exam readiness</p>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400"
                  title="Opens a breakdown of coverage, scores, and consistency"
                >
                  i
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Practice & coverage{scope}</p>
              <div className="mt-3 flex min-h-0 flex-1 items-center gap-4">
                <div className="w-[58%] min-w-[11rem] max-w-[18rem] shrink-0">
                  <ExamReadinessGauge
                    percent={insights.examReadyPercent}
                    empty={empty}
                    compact
                    hideLegend
                    metricName="Exam readiness"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">{blocker.label}</p>
                  <p
                    className={`mt-1 text-lg font-semibold leading-snug ${
                      blocker.isCritical ? "text-red-500" : "text-ink-900"
                    }`}
                  >
                    {blocker.title}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{blocker.hint}</p>
                </div>
              </div>
            </button>
          </CardBody>
        </Card>

        <Card className="flex h-full flex-col">
          <CardBody className="flex flex-1 flex-col p-4 sm:p-5">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-ink-900">Predicted mark</p>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400"
                title="Predicted from your practice scores and coverage. More attempts increase confidence."
              >
                i
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {insights.hasMockData ? `Practice + mocks${scope}` : `From practice${scope}`}
            </p>
            <div className="mt-3 flex min-h-0 flex-1 items-center gap-4">
              <div className="w-[58%] min-w-[11rem] max-w-[18rem] shrink-0">
                <ExamReadinessGauge
                  percent={insights.predictedExamMark}
                  empty={empty}
                  compact
                  hideLegend
                  metricName="Predicted mark"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-base font-semibold text-ink-900">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      predictionConfidence.level === "high"
                        ? "bg-emerald-500"
                        : predictionConfidence.level === "medium"
                          ? "bg-brand-500"
                          : "bg-amber-400"
                    }`}
                    aria-hidden
                  />
                  {predictionConfidence.label}
                </p>
                <p className="mt-1 text-sm text-slate-500">{predictionConfidence.attemptsLabel}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  {predictionConfidence.hint}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="h-full">
          <CardBody className="flex flex-col p-3.5 sm:p-4">
            <p className="text-center text-sm font-semibold text-ink-900">Pass probability</p>
            <p className="mt-0.5 text-center text-xs text-slate-500">
              Chance of scoring 50%+{scope}
            </p>
            <div className="mx-auto mt-2 w-full max-w-[268px]">
              <ExamReadinessGauge
                percent={insights.passProbabilityPercent}
                empty={empty}
                compact
                metricName="Pass probability"
              />
            </div>
            {!empty && passHint && (
              <p className="mt-1.5 text-center text-xs font-medium text-slate-600">{passHint}</p>
            )}
            {!empty &&
              practiceScores &&
              practiceScores.count > 0 &&
              practiceScores.latestScore != null && (
                <p className="mt-0.5 text-center text-[11px] text-slate-400">
                  Latest practice {practiceScores.latestScore}%
                  {mockScores.count > 0 && mockScores.latestScore != null
                    ? ` · Latest mock ${mockScores.latestScore}%`
                    : ""}
                </p>
              )}
          </CardBody>
        </Card>
      </div>

      <ReadinessBreakdownModal
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        items={breakdown}
        empty={empty}
        paperLabel={paperLabel}
      />
    </>
  );
}
