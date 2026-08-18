"use client";

import type { DashboardOverview } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type DailyGoal = DashboardOverview["dailyGoal"];

function Checkbox({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
        done
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-slate-300 bg-white"
      )}
      aria-hidden
    >
      {done ? (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function GoalRow({
  label,
  current,
  target,
  done,
  showBar,
  onClick,
}: {
  label: string;
  current: number;
  target: number;
  done: boolean;
  showBar?: boolean;
  onClick?: () => void;
}) {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const content = (
    <>
      <Checkbox done={done} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {showBar ? (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>
      <span className="shrink-0 text-sm tabular-nums text-slate-500">
        {current}/{target}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 rounded-lg py-1.5 text-left transition-colors hover:bg-slate-50"
      >
        {content}
      </button>
    );
  }

  return <div className="flex w-full items-start gap-3 py-1.5">{content}</div>;
}

export function DailyGoalCard({
  data,
  loading,
  onQuestionsClick,
  onWeakTopicClick,
  onQuizScoreClick,
}: {
  data: DailyGoal | null | undefined;
  loading?: boolean;
  onQuestionsClick?: () => void;
  onWeakTopicClick?: () => void;
  onQuizScoreClick?: () => void;
}) {
  if (!data) {
    return (
      <Card className={`h-full ${loading ? "opacity-60" : ""}`}>
        <CardHeader className="px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight text-ink-900 sm:text-lg">
            Today&apos;s Goal
          </h2>
          <p className="section-subtitle">Loading today&apos;s targets…</p>
        </CardHeader>
        <CardBody className="p-4 sm:p-5">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        </CardBody>
      </Card>
    );
  }

  const questionsDone = data.questions.current >= data.questions.target;
  const weakDone = data.weakTopic.current >= data.weakTopic.target;
  const quizDone = data.quizScore.current >= data.quizScore.target;
  const dailyPercent =
    data.goalsTotal > 0 ? (data.goalsCompleted / data.goalsTotal) * 100 : 0;

  return (
    <Card
      className={cn(
        "h-full",
        loading && "opacity-60",
        data.completed && "border-emerald-200/80 ring-1 ring-emerald-100"
      )}
    >
      <CardHeader className="px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold tracking-tight text-ink-900 sm:text-lg">
            Today&apos;s Goal
          </h2>
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400"
            title="Goals reset each day at midnight. Answer 10 questions, practise one weak topic, and score 80%+ in a quiz."
          >
            i
          </span>
        </div>
        <p className="section-subtitle">Complete your daily goals to stay on track.</p>
      </CardHeader>
      <CardBody className="space-y-3 p-4 sm:p-5">
        <div className="space-y-1">
          <GoalRow
            label="Answer 10 questions"
            current={data.questions.current}
            target={data.questions.target}
            done={questionsDone}
            showBar
            onClick={onQuestionsClick}
          />
          <GoalRow
            label="Practice weak topic"
            current={data.weakTopic.current}
            target={data.weakTopic.target}
            done={weakDone}
            onClick={onWeakTopicClick}
          />
          <GoalRow
            label={`Score ${data.quizScore.threshold}%+ in a quiz`}
            current={data.quizScore.current}
            target={data.quizScore.target}
            done={quizDone}
            onClick={onQuizScoreClick}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Daily Progress</span>
            <span className="font-semibold tabular-nums text-slate-700">
              {data.goalsCompleted}/{data.goalsTotal}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-300 transition-all duration-500"
              style={{ width: `${dailyPercent}%` }}
              role="progressbar"
              aria-valuenow={data.goalsCompleted}
              aria-valuemin={0}
              aria-valuemax={data.goalsTotal}
              aria-label="Daily progress"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
