"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconBookmarks, IconChevronDown } from "@/components/dashboard/DashboardIcons";
import { QuizReviewSummary } from "@/components/dashboard/QuizReviewSummary";
import { QuestionExplanations } from "@/components/dashboard/QuestionExplanations";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/question-types";

export type QuizAnswerValue = string | string[] | null;

export type QuizFeatureSettings = {
  allowPreviousQuestion?: boolean;
  allowQuestionFlagging?: boolean;
  allowDifficultyRating?: boolean;
  allowAnswerReview?: boolean;
  showExplanationAfterCheck?: boolean;
  allowBookmarks?: boolean;
};

export interface QuizPracticeQuestion {
  id: string;
  text: string;
  categoryTitle: string;
  subCategoryTitle: string;
  options: { id: string; text: string; order?: number; label?: string }[];
  imageUrl?: string;
  explanation?: string | null;
  explanationMy?: string | null;
  correctOptionId?: string | null;
  correctOptionIds?: string[];
  questionType?: QuestionType;
}

type DifficultyRating = "easy" | "medium" | "hard";

interface QuizPracticePanelProps {
  questions: QuizPracticeQuestion[];
  current: number;
  onCurrentChange: (index: number) => void;
  answers: Record<string, QuizAnswerValue>;
  onAnswer: (questionId: string, optionId: string, questionType: QuestionType) => void;
  flagged: Set<string>;
  onToggleFlag: (questionId: string) => void;
  durationLabel: string;
  durationLow?: boolean;
  onSubmit: () => void;
  submitError?: string | null;
  onTimerPausedChange?: (paused: boolean) => void;
  features?: QuizFeatureSettings;
  /** Last-question primary button label (default: Submit Quiz) */
  finalSubmitLabel?: string;
}

function IconFlag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  );
}

function IconLightbulb({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconCross({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizPracticePanel({
  questions,
  current,
  onCurrentChange,
  answers,
  onAnswer,
  flagged,
  onToggleFlag,
  durationLabel,
  durationLow = false,
  onSubmit,
  submitError,
  onTimerPausedChange,
  features = {},
  finalSubmitLabel = "Submit Quiz",
}: QuizPracticePanelProps) {
  const {
    allowPreviousQuestion = true,
    allowQuestionFlagging = true,
    allowDifficultyRating = true,
    allowAnswerReview = true,
    showExplanationAfterCheck = true,
    allowBookmarks = true,
  } = features;

  const q = questions[current];
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [explanationOpen, setExplanationOpen] = useState<Record<string, boolean>>({});
  const [difficultyRatings, setDifficultyRatings] = useState<Record<string, DifficultyRating>>({});
  const [showReviewSummary, setShowReviewSummary] = useState(false);
  const [resumeQuestionIndex, setResumeQuestionIndex] = useState(0);

  const selectedAnswer = answers[q.id];
  const isChecked = checked.has(q.id);
  const correctIds =
    q.correctOptionIds && q.correctOptionIds.length > 0
      ? q.correctOptionIds
      : q.correctOptionId
        ? [q.correctOptionId]
        : [];
  const isMultiSelect =
    q.questionType === "MULTIPLE_CHOICE" || correctIds.length > 1;
  const maxSelect = correctIds.length > 1 ? correctIds.length : isMultiSelect ? 2 : 1;
  const selectedCount = Array.isArray(selectedAnswer)
    ? selectedAnswer.length
    : selectedAnswer
      ? 1
      : 0;
  const hasSelection = selectedCount > 0;
  const answeredCount = questions.filter((question) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  }).length;
  const isLast = current === questions.length - 1;

  useEffect(() => {
    setChecked((prev) => {
      if (!prev.has(q.id)) return prev;
      const next = new Set(prev);
      next.delete(q.id);
      return next;
    });
    setExplanationOpen((prev) => {
      if (!prev[q.id]) return prev;
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
  }, [selectedAnswer, q.id]);

  function handleCheckAnswer() {
    if (!hasSelection) return;
    setChecked((prev) => new Set(prev).add(q.id));
    if (showExplanationAfterCheck) {
      setExplanationOpen((prev) => ({ ...prev, [q.id]: true }));
    }
  }

  function handleNext() {
    if (isLast) {
      onSubmit();
      return;
    }
    onCurrentChange(current + 1);
  }

  function openReviewSummary() {
    setResumeQuestionIndex(current);
    setShowReviewSummary(true);
    onTimerPausedChange?.(true);
  }

  function handleResumeTest() {
    setShowReviewSummary(false);
    onCurrentChange(resumeQuestionIndex);
    onTimerPausedChange?.(false);
  }

  if (showReviewSummary) {
    return (
      <QuizReviewSummary
        totalQuestions={questions.length}
        completeCount={answeredCount}
        incompleteCount={questions.length - answeredCount}
        flaggedCount={flagged.size}
        onResume={handleResumeTest}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}

      <div className="grid grid-cols-3 items-center gap-4">
        <p className="text-sm text-slate-500">
          Question <span className="font-semibold text-slate-800">{current + 1}</span> of{" "}
          <span className="font-semibold text-slate-800">{questions.length}</span>
        </p>
        <div className="flex justify-center">
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              durationLow ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
            )}
          >
            {durationLabel}
          </span>
        </div>
        <p className="text-right text-sm text-slate-500">
          Answered:{" "}
          <span className="font-semibold text-slate-800">
            {answeredCount}/{questions.length}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {questions.map((question, idx) => {
          const questionId = question.id;
          const isCurrent = idx === current;
          const isFlagged = flagged.has(questionId);
          const isAnswered = (() => {
            const answer = answers[questionId];
            return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
          })();

          return (
            <button
              key={questionId}
              type="button"
              onClick={() => onCurrentChange(idx)}
              title={isFlagged ? "Flagged" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                isFlagged && isCurrent && "bg-orange-300 text-orange-950 shadow-sm ring-2 ring-orange-400",
                isFlagged && !isCurrent && "bg-orange-100 text-orange-700 hover:bg-orange-200",
                !isFlagged && isCurrent && "bg-brand-600 text-white shadow-sm",
                !isFlagged && !isCurrent && isAnswered && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                !isFlagged && !isCurrent && !isAnswered && "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">
              {q.categoryTitle} / {q.subCategoryTitle}
            </p>
            <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{q.text}</h2>
            <p className="mt-2 text-sm italic text-slate-400">
              {isMultiSelect
                ? maxSelect === 2
                  ? "Select 2 answers"
                  : `Select ${maxSelect} answers`
                : "Mark one answer"}
              {isMultiSelect && selectedCount > 0
                ? ` · ${selectedCount}/${maxSelect} selected`
                : ""}
            </p>
          </div>

          {q.imageUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.imageUrl} alt="" className="max-h-64 w-full object-contain" />
            </div>
          )}
        </div>

        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options.map((opt, idx) => {
              const letter =
                opt.label ||
                (typeof opt.order === "number"
                  ? OPTION_LETTERS[opt.order]
                  : null) ||
                OPTION_LETTERS[idx] ||
                String(idx + 1);
              const selected = Array.isArray(selectedAnswer)
                ? selectedAnswer.includes(opt.id)
                : selectedAnswer === opt.id;
              const isCorrectOption = correctIds.includes(opt.id);
              const showCorrect = isChecked && isCorrectOption;
              const showWrong = isChecked && !isCorrectOption;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onAnswer(
                      q.id,
                      opt.id,
                      isMultiSelect ? "MULTIPLE_CHOICE" : (q.questionType ?? "SINGLE_CHOICE")
                    )
                  }
                  className={cn(
                    "flex min-h-[72px] items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-sm transition-all sm:text-base",
                    showCorrect && "border-emerald-500 bg-emerald-50",
                    showWrong && selected && "border-red-400 bg-red-50",
                    showWrong && !selected && "border-red-200 bg-red-50/40",
                    !showCorrect && !showWrong && selected && "border-brand-500 bg-brand-50/40",
                    !showCorrect && !showWrong && !selected && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {showCorrect ? (
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                      aria-label="Correct answer"
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                  ) : showWrong ? (
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
                        selected ? "bg-red-500" : "bg-red-400"
                      )}
                      aria-label={selected ? "Your incorrect answer" : "Incorrect answer"}
                    >
                      <IconCross className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
                        isMultiSelect ? "rounded" : "rounded-full",
                        selected ? "border-brand-500 bg-brand-500" : "border-slate-300 bg-white"
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-sm bg-white" />}
                    </span>
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 leading-snug",
                      showCorrect && "font-medium text-emerald-900",
                      showWrong && selected && "font-medium text-red-800",
                      showWrong && !selected && "text-red-700/80",
                      !showCorrect && !showWrong && (selected ? "font-medium text-slate-900" : "text-slate-700")
                    )}
                  >
                    <span className="font-semibold">{letter}.</span> {opt.text}
                    {showCorrect && (
                      <span className="mt-1 block text-xs font-semibold text-emerald-700">
                        Correct answer{selected ? " · Your answer" : ""}
                      </span>
                    )}
                    {showWrong && selected && (
                      <span className="mt-1 block text-xs font-semibold text-red-600">Your answer</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {allowPreviousQuestion ? (
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => onCurrentChange(current - 1)}
                className="w-full gap-2 lg:w-auto"
              >
                <IconArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <div className="hidden lg:block lg:w-auto" />
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              {allowQuestionFlagging && (
                <button
                  type="button"
                  onClick={() => onToggleFlag(q.id)}
                  aria-pressed={flagged.has(q.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                    flagged.has(q.id)
                      ? "border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  )}
                >
                  <IconFlag className="h-4 w-4" />
                  {flagged.has(q.id) ? "Flagged" : "Flag"}
                </button>
              )}
              {allowBookmarks && (
                <button
                  type="button"
                  onClick={openReviewSummary}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:border-brand-200"
                >
                  <IconBookmarks className="h-4 w-4" />
                  Review
                </button>
              )}
              {allowAnswerReview && (
                <Button
                  onClick={handleCheckAnswer}
                  disabled={!hasSelection || isChecked}
                  className="min-w-[140px]"
                >
                  Check Answer
                </Button>
              )}
            </div>

            <Button onClick={handleNext} className="w-full gap-2 lg:w-auto">
              {isLast ? finalSubmitLabel : "Next"}
              {!isLast && <IconArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {allowDifficultyRating && (
          <div className="border-t border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
            <h3 className="text-base font-bold text-slate-900">Rate this question</h3>
            <p className="mt-1 text-sm text-slate-500">How difficult was this question for you?</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {(
                [
                  { value: "easy" as const, label: "Easy", emoji: "😊", active: "border-emerald-300 bg-emerald-50 text-emerald-700" },
                  { value: "medium" as const, label: "Medium", emoji: "😐", active: "border-amber-300 bg-amber-50 text-amber-700" },
                  { value: "hard" as const, label: "Hard", emoji: "😟", active: "border-red-300 bg-red-50 text-red-700" },
                ] as const
              ).map((item) => {
                const active = difficultyRatings[q.id] === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDifficultyRatings((prev) => ({ ...prev, [q.id]: item.value }))}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      active ? item.active : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <span aria-hidden>{item.emoji}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showExplanationAfterCheck && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (!isChecked) return;
                setExplanationOpen((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
              }}
              disabled={!isChecked}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors sm:px-8",
                isChecked ? "bg-brand-50/70 hover:bg-brand-50" : "bg-brand-50/40"
              )}
            >
              <div className="flex items-center gap-3">
                <IconLightbulb className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-brand-800">
                  {isChecked ? "Explanation" : "Explanation (click Check Answer to view)"}
                </span>
              </div>
              <IconChevronDown
                className={cn(
                  "h-5 w-5 text-brand-600 transition-transform",
                  explanationOpen[q.id] && "rotate-180"
                )}
              />
            </button>
            {isChecked && explanationOpen[q.id] && (
              <div className="border-t border-brand-100 bg-brand-50/40 px-6 py-4 sm:px-8">
                <QuestionExplanations
                  explanation={q.explanation}
                  explanationMy={q.explanationMy}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
