/** Heuristic exam readiness / prediction from practice + recorded mock results. */

export interface ExamInsightInput {
  averageScore: number;
  bestScore: number;
  coveragePercent: number;
  studyStreak: number;
  totalAttempts: number;
  mockAverageScore?: number | null;
  mockBestScore?: number | null;
  mockAttemptCount?: number;
}

export interface ExamInsights {
  examReadyPercent: number;
  predictedExamMark: number;
  passProbabilityPercent: number;
  passLean: "pass" | "fail" | "insufficient";
  hasData: boolean;
  hasMockData: boolean;
}

export type ScoreTrackSummary = {
  latestScore: number | null;
  bestScore: number | null;
  count: number;
};

export type PredictionCompareResult = {
  beatPrediction: boolean;
  delta: number;
  comparable: boolean;
};

/** Display stages for the Exam Readiness gauge (visual labels only). */
export type ExamReadinessStageId =
  | "early"
  | "need_attention"
  | "developing"
  | "nearly_ready"
  | "exam_ready";

export type ExamReadinessStage = {
  id: ExamReadinessStageId;
  label: string;
  min: number;
  max: number;
  /** Arc fill colour (InsightApex-aligned). */
  color: string;
};

/**
 * Fixed display bands for the speedometer.
 * Calculation of examReadyPercent is unchanged; these only map % → label/colour.
 */
export const EXAM_READINESS_STAGES: ExamReadinessStage[] = [
  { id: "early", label: "Early Stage", min: 0, max: 19, color: "#f43f5e" },
  { id: "need_attention", label: "Need Attention", min: 20, max: 39, color: "#f97316" },
  { id: "developing", label: "Developing", min: 40, max: 59, color: "#fbbf24" },
  { id: "nearly_ready", label: "Nearly Ready", min: 60, max: 79, color: "#2456f5" },
  { id: "exam_ready", label: "Exam Ready", min: 80, max: 100, color: "#10b981" },
];

export function clampExamPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function getExamReadinessStage(percent: number): ExamReadinessStage {
  const p = clampExamPercent(percent);
  for (const stage of EXAM_READINESS_STAGES) {
    if (p >= stage.min && p <= stage.max) return stage;
  }
  return EXAM_READINESS_STAGES[EXAM_READINESS_STAGES.length - 1];
}

/** Display-only factors for the Readiness Breakdown popup (does not change examReadyPercent). */
export type ExamReadinessBreakdownTone = "blue" | "gold";

export type ExamReadinessBreakdownItem = {
  id: "coverage" | "average" | "recent" | "consistency";
  label: string;
  weightPercent: number;
  valuePercent: number;
  tone: ExamReadinessBreakdownTone;
};

export type ExamReadinessBreakdownInput = {
  coveragePercent: number;
  averageScore: number;
  /** Latest practice (or mock) score; falls back to bestScore. */
  recentScore?: number | null;
  bestScore: number;
  studyStreak: number;
};

export type MainReadinessBlocker = {
  label: string;
  title: string;
  hint: string;
  isCritical: boolean;
};

const BLOCKER_COPY: Record<
  ExamReadinessBreakdownItem["id"],
  { lowTitle: (n: number) => string; hint: string }
> = {
  coverage: {
    lowTitle: (n) => `Low syllabus coverage (${n}%)`,
    hint: "Focus on covering more topics and keep practising.",
  },
  average: {
    lowTitle: (n) => `Low average score (${n}%)`,
    hint: "Focus on accuracy in your practice quizzes.",
  },
  recent: {
    lowTitle: (n) => `Low syllabus coverage (${n}%)`,
    hint: "Focus on covering and keep practising.",
  },
  consistency: {
    lowTitle: (n) => `Low consistency (${n}%)`,
    hint: "Practise a little every day to build a streak.",
  },
};

/** Display-only confidence for the Predicted mark card. */
export type PredictionConfidence = {
  level: "low" | "medium" | "high";
  label: string;
  attemptsLabel: string;
  hint: string;
};

export function getPredictionConfidence(
  attemptCount: number,
  empty?: boolean
): PredictionConfidence {
  if (empty || attemptCount <= 0) {
    return {
      level: "low",
      label: "Low confidence",
      attemptsLabel: "Based on 0 attempts",
      hint: "Complete a quiz to get a predicted mark.",
    };
  }

  if (attemptCount < 5) {
    return {
      level: "low",
      label: "Low confidence",
      attemptsLabel: `Based on ${attemptCount} attempt${attemptCount === 1 ? "" : "s"}`,
      hint: "Keep practising to get a more accurate prediction.",
    };
  }

  if (attemptCount < 10) {
    return {
      level: "medium",
      label: "Medium confidence",
      attemptsLabel: `Based on ${attemptCount} attempts`,
      hint: "A few more quizzes will make this prediction more stable.",
    };
  }

  return {
    level: "high",
    label: "High confidence",
    attemptsLabel: `Based on ${attemptCount} attempts`,
    hint: "This prediction is based on a solid practice history.",
  };
}
export function getMainReadinessBlocker(
  items: ExamReadinessBreakdownItem[],
  empty?: boolean
): MainReadinessBlocker {
  if (empty || items.length === 0) {
    return {
      label: "Main blocker",
      title: "Not enough practice yet",
      hint: "Complete a quiz to see what to focus on.",
      isCritical: false,
    };
  }

  const weakest = [...items].sort((a, b) => a.valuePercent - b.valuePercent)[0];
  const copy = BLOCKER_COPY[weakest.id];
  const n = Math.round(weakest.valuePercent);
  const isCritical = n < 60;

  return {
    label: "Main blocker",
    title: isCritical ? copy.lowTitle(n) : `${weakest.label} (${n}%)`,
    hint: copy.hint,
    isCritical,
  };
}

/**
 * Raw factor values shown in the breakdown UI.
 * Weights are relative emphasis for the popup, not a re-implementation of computeExamInsights.
 */
export function getExamReadinessBreakdown(
  input: ExamReadinessBreakdownInput
): ExamReadinessBreakdownItem[] {
  const recent =
    input.recentScore != null && Number.isFinite(input.recentScore)
      ? input.recentScore
      : input.bestScore;
  // 10-day streak maps to 100% consistency on the breakdown bar.
  const consistency = Math.min(100, Math.round(Math.max(0, input.studyStreak) * 10));

  return [
    {
      id: "coverage",
      label: "Syllabus Coverage",
      weightPercent: 40,
      valuePercent: clampExamPercent(input.coveragePercent),
      tone: "blue",
    },
    {
      id: "average",
      label: "Average Score",
      weightPercent: 40,
      valuePercent: clampExamPercent(input.averageScore),
      tone: "blue",
    },
    {
      id: "recent",
      label: "Recent Performance",
      weightPercent: 10,
      valuePercent: clampExamPercent(recent),
      tone: "gold",
    },
    {
      id: "consistency",
      label: "Consistency",
      weightPercent: 10,
      valuePercent: consistency,
      tone: "gold",
    },
  ];
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Maps practice (+ optional mock) performance toward exam readiness predictions.
 */
export function computeExamInsights(input: ExamInsightInput): ExamInsights {
  const {
    averageScore,
    bestScore,
    coveragePercent,
    studyStreak,
    totalAttempts,
    mockAverageScore = null,
    mockBestScore = null,
    mockAttemptCount = 0,
  } = input;

  const hasData = totalAttempts > 0;
  const hasMockData = (mockAttemptCount ?? 0) > 0;

  if (!hasData && !hasMockData) {
    return {
      examReadyPercent: 0,
      predictedExamMark: 0,
      passProbabilityPercent: 0,
      passLean: "insufficient",
      hasData: false,
      hasMockData: false,
    };
  }

  const practiceBlend =
    totalAttempts > 0
      ? averageScore * 0.65 + bestScore * 0.35
      : 0;

  const mockBlend =
    hasMockData && mockAverageScore != null
      ? mockAverageScore * 0.55 + (mockBestScore ?? mockAverageScore) * 0.45
      : null;

  // Weight mocks higher when present — closer to exam conditions.
  const performanceCore =
    mockBlend != null
      ? practiceBlend * 0.45 + mockBlend * 0.55
      : practiceBlend;

  const coverageFactor = 0.55 + (coveragePercent / 100) * 0.45;
  const streakBoost = Math.min(8, studyStreak * 0.8);
  const volumeBoost = Math.min(6, Math.log10(Math.max(1, totalAttempts + 1)) * 4);

  const examReadyPercent = clamp(
    Math.round(performanceCore * coverageFactor + streakBoost + volumeBoost * 0.5)
  );

  // Prediction slightly discounts practice optimism.
  const discount = hasMockData ? 0.96 : 0.9;
  const predictedExamMark = clamp(Math.round(performanceCore * discount * coverageFactor));

  const passProbabilityPercent = clamp(
    Math.round(
      predictedExamMark * 0.7 +
        examReadyPercent * 0.2 +
        Math.min(10, studyStreak) +
        (predictedExamMark >= 50 ? 5 : 0)
    )
  );

  let passLean: ExamInsights["passLean"] = "insufficient";
  if (totalAttempts + (mockAttemptCount ?? 0) >= 2) {
    passLean = passProbabilityPercent >= 50 ? "pass" : "fail";
  }

  return {
    examReadyPercent,
    predictedExamMark,
    passProbabilityPercent,
    passLean,
    hasData: hasData || hasMockData,
    hasMockData,
  };
}

/** Compare a score track against the predicted exam mark. */
export function compareScoreToPrediction(
  summary: ScoreTrackSummary | undefined,
  predictedExamMark: number
): PredictionCompareResult {
  if (!summary || summary.count === 0 || summary.latestScore == null) {
    return { beatPrediction: false, delta: 0, comparable: false };
  }
  const delta = summary.latestScore - predictedExamMark;
  return {
    beatPrediction: delta >= 0,
    delta,
    comparable: true,
  };
}
