"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExamInsightsCards } from "@/components/dashboard/ExamInsightsCards";
import { PerformanceTrendCard } from "@/components/dashboard/PerformanceTrendCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { StrongAreasCard } from "@/components/dashboard/StrongAreasCard";
import { StudyStreakCard } from "@/components/dashboard/StudyStreakCard";
import { WeakAreasCard } from "@/components/dashboard/WeakAreasCard";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { RecommendedPracticeItem } from "@/components/dashboard/RecommendedPracticeItem";
import { KnowledgeCoverageModal } from "@/components/dashboard/KnowledgeCoverageModal";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import type { DashboardOverview } from "@/types";

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paperIdFromUrl = searchParams.get("paperId");

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

  const loadDashboard = useCallback(async (paperId: string | null) => {
    setLoading(true);
    setError(null);
    setData((prev) => {
      if (!prev || !paperId) return prev;
      const nextPaper =
        prev.filterPapers.find((paper) => paper.id === paperId) ?? prev.selectedPaper;
      return {
        ...prev,
        selectedPaperId: paperId,
        selectedPaper: nextPaper,
        targetExamDate: prev.examDatesByPaperId?.[paperId] ?? null,
      };
    });
    try {
      const params = new URLSearchParams();
      if (paperId) params.set("paperId", paperId);
      const query = params.toString();
      const res = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load progress");
      }
      setData(body);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(paperIdFromUrl);
  }, [paperIdFromUrl, loadDashboard]);

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, [loading, paperIdFromUrl]);

  function selectPaper(nextPaperId: string) {
    if (!nextPaperId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("paperId", nextPaperId);
    const query = params.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`${pathname}?${query}${hash}`, { scroll: false });
  }

  useEffect(() => {
    if (!data?.selectedPaperId || paperIdFromUrl) return;
    selectPaper(data.selectedPaperId);
    // Sync URL once API defaults to the first paper.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when dashboard defaults a paper
  }, [data?.selectedPaperId, paperIdFromUrl]);

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <Card>
        <CardBody className="space-y-4 py-10 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" onClick={() => void loadDashboard(paperIdFromUrl)}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  const hasAttempts = (data?.totalAttempts ?? 0) > 0;
  const selectedPaperId = data?.selectedPaperId ?? null;
  const coverage = data?.coverage;
  const paperLabel = data?.selectedPaper
    ? `${data.selectedPaper.code} – ${data.selectedPaper.title}`
    : "Selected paper";

  return (
    <div className="space-y-8 animate-stagger">
      <WelcomeHeader
        key={selectedPaperId ?? "no-paper"}
        studentName={data?.studentName ?? "Student"}
        hasAttempts={hasAttempts}
        paperId={selectedPaperId}
        paperCode={data?.selectedPaper?.code ?? null}
        paperTitle={data?.selectedPaper?.title ?? null}
        targetExamDate={
          selectedPaperId
            ? data?.examDatesByPaperId?.[selectedPaperId] ?? null
            : null
        }
        onExamDateChange={(date) =>
          setData((prev) => {
            if (!prev) return prev;
            const paperId = prev.selectedPaperId;
            const nextDates = { ...(prev.examDatesByPaperId ?? {}) };
            if (paperId) {
              if (date) nextDates[paperId] = date;
              else delete nextDates[paperId];
            }
            return {
              ...prev,
              targetExamDate: date,
              examDatesByPaperId: nextDates,
            };
          })
        }
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Exam readiness</h2>
            <p className="section-subtitle">
              Predictions from your practice marks
              {data?.studyStreak ? ` · ${data.studyStreak}-day streak` : ""}
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="paper-filter" className="mb-1.5 block text-xs font-medium text-slate-500">
              Paper filter
            </label>
            <select
              id="paper-filter"
              value={selectedPaperId ?? data?.filterPapers?.[0]?.id ?? ""}
              onChange={(e) => selectPaper(e.target.value)}
              disabled={loading || !(data?.filterPapers?.length)}
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-white px-3.5 text-sm text-ink-900 shadow-sm transition-all hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
            >
              {(data?.filterPapers ?? []).map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.code} – {paper.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ExamInsightsCards
          averageScore={data?.averageScore ?? 0}
          bestScore={data?.bestScore ?? 0}
          coveragePercent={data?.coverage?.percent ?? 0}
          studyStreak={data?.studyStreak ?? 0}
          totalAttempts={data?.totalAttempts ?? 0}
          paperLabel={paperLabel}
          practiceScores={data?.attemptScores?.practice}
          mockScores={data?.attemptScores?.mock}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="section-title">Progress &amp; Performance</h2>
          <p className="section-subtitle">
            Insights for {paperLabel}
            {loading ? " · Updating…" : ""}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!hasAttempts ? (
          <Card>
            <CardBody className="py-10 text-center">
              <p className="text-base font-semibold text-ink-900">
                {selectedPaperId
                  ? `No practice data for ${data?.selectedPaper?.code ?? "this paper"} yet`
                  : "No practice data yet"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {selectedPaperId
                  ? "Submit a quiz for this paper to unlock strong areas, weak areas, coverage and trends."
                  : "Complete your first practice quiz to see personalised performance insights."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/dashboard/quiz">
                  <Button variant="gradient">Start Practice</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className={`grid gap-6 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
            <section id="strong-areas" className="scroll-mt-6">
              <StrongAreasCard
                subCategoryDetails={data?.subCategoryDetails ?? []}
                hasAttempts={hasAttempts}
              />
            </section>

            <section id="weak-areas" className="scroll-mt-6">
              <WeakAreasCard
                subCategoryDetails={data?.subCategoryDetails ?? []}
                hasAttempts={hasAttempts}
              />
            </section>

            <section id="progress" className="scroll-mt-6">
              <Card className="h-full">
                <CardHeader>
                  <h2 className="section-title">Overall Coverage</h2>
                  <p className="section-subtitle">
                    {coverage?.label ?? "Topics you've practised across all papers"}
                  </p>
                </CardHeader>
                <CardBody className="flex flex-col items-center justify-center gap-5 py-6">
                  <CircularProgress
                    value={coverage?.percent ?? 0}
                    size={140}
                    sublabel={`${coverage?.coveredTopics ?? 0} of ${coverage?.totalTopics ?? 0} topics`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKnowledgeOpen(true)}
                    className="w-full max-w-[220px]"
                  >
                    Knowledge coverage
                  </Button>
                </CardBody>
              </Card>
            </section>

            <section id="performance-trend" className="scroll-mt-6">
              <PerformanceTrendCard scoreHistory={data?.scoreHistory ?? []} />
            </section>

            <section id="recent-activity" className="scroll-mt-6">
              <RecentActivityCard
                activities={data?.recentActivity ?? []}
                totalAttempts={data?.totalAttempts ?? 0}
              />
            </section>

            <section id="study-streak" className="scroll-mt-6">
              <StudyStreakCard
                studyStreak={data?.studyStreak ?? 0}
                studyActivity={data?.studyActivity ?? []}
                hasAttempts={hasAttempts}
              />
            </section>
          </div>
        )}
      </section>

      {hasAttempts && data?.recommendedPractice && data.recommendedPractice.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Recommended Practice</h2>
            <p className="section-subtitle">Suggested topics based on your performance</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.recommendedPractice.map((item) => (
              <RecommendedPracticeItem key={item.subCategoryId} item={item} />
            ))}
          </CardBody>
        </Card>
      )}

      <Card variant="gradient" className="flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-xl shadow-card">
            🏆
          </div>
          <div>
            <p className="font-semibold text-ink-900">Ready for a full mock exam?</p>
            <p className="text-sm text-slate-500">Test yourself under exam conditions</p>
          </div>
        </div>
        <Link href="/dashboard/mock-exams">
          <Button variant="gradient">Start Mock Exam</Button>
        </Link>
      </Card>

      <KnowledgeCoverageModal
        open={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        coverage={data?.categoryCoverage}
        paperLabel={paperLabel}
      />
    </div>
  );
}
