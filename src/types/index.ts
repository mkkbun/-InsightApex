export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type AccessLevel = "FREE" | "PREMIUM";

export interface PartSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  order: number;
  paperCount: number;
}

export interface PaperSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  partId: string;
  part: Pick<PartSummary, "id" | "code" | "title">;
  accessLevel: AccessLevel;
  categoryCount: number;
}

export interface CategorySummary {
  id: string;
  title: string;
  description: string | null;
  subCategoryCount: number;
}

export interface SubCategorySummary {
  id: string;
  title: string;
  description: string | null;
  freeQuestionCount: number;
  premiumQuestionCount: number;
  totalQuestionCount: number;
  accessibleQuestionCount: number;
  questionCount: number;
}

export type QuestionAccessLevel = "FREE_TRIAL" | "PREMIUM";

export interface QuizQuestionView {
  id: string;
  text: string;
  imageUrl: string | null;
  difficulty: DifficultyLevel;
  marks: number;
  options: { id: string; text: string }[];
}

export interface QuizResultSubCategoryBreakdown {
  subCategoryId: string;
  categoryTitle: string;
  subCategoryTitle: string;
  total: number;
  correct: number;
  percent: number;
}

export interface QuizResultSummary {
  attemptId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  passed: boolean;
  subCategoryBreakdown: QuizResultSubCategoryBreakdown[];
}

export type SubCategoryPerformanceStatus = "Weak" | "Average" | "Strong";

export interface DashboardSubCategoryDetail {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  paperId: string;
  accuracy: number;
  status: SubCategoryPerformanceStatus;
  /** Answered practice questions in this sub category (scoped). */
  correctCount: number;
  totalAnswered: number;
}

export interface DashboardKnowledgeCoverageLevelItem {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  paperId: string;
  accuracy: number;
  status: SubCategoryPerformanceStatus;
  levelLabel: "Weak" | "Developing" | "Strong";
  correctCount: number;
  totalAnswered: number;
}

/** Performance-based knowledge mix (Weak / Developing / Strong) for the scoped paper. */
export interface DashboardKnowledgeCoverage {
  weakPercent: number;
  developingPercent: number;
  strongPercent: number;
  assessedCount: number;
  weak: DashboardKnowledgeCoverageLevelItem[];
  developing: DashboardKnowledgeCoverageLevelItem[];
  strong: DashboardKnowledgeCoverageLevelItem[];
  thresholds: {
    weakBelow: number;
    developingMin: number;
    developingMax: number;
    strongAtOrAbove: number;
  };
}

export interface DashboardPaperProgress {
  id: string;
  code: string;
  title: string;
  partId: string;
  lastPracticeDate: string | null;
  progressPercent: number;
  subCategoriesAttempted: number;
  totalSubCategories: number;
  averageScore: number | null;
  continueCategoryId: string | null;
  continueSubCategoryId: string | null;
  hasPremiumAccess: boolean;
  hasFreeTrialQuestions: boolean;
  accessibleQuestionCount: number;
}

export interface DashboardRecommendedPractice {
  subCategoryId: string;
  paperId: string;
  categoryId: string;
  categoryTitle: string;
  subCategoryTitle: string;
  reason: string;
}

export interface DashboardRecentActivity {
  id: string;
  paper: string;
  subCategory: string | null;
  score: number | null;
  passed: boolean | null;
  date: string | null;
}

export interface DashboardFilterPaper {
  id: string;
  code: string;
  title: string;
}

export interface DashboardCoverageTopic {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  paperId: string;
  uniqueAnswered: number;
  totalQuestions: number;
}

export interface DashboardCoverage {
  percent: number;
  coveredTopics: number;
  totalTopics: number;
  label: string;
  /** Topics where every practice question has been answered. */
  completedCount: number;
  /** Topics with some, but not all, practice questions answered. */
  partialCount: number;
  notStartedCount: number;
  completedPercent: number;
  partialPercent: number;
  notStartedPercent: number;
  topics: {
    completed: DashboardCoverageTopic[];
    partial: DashboardCoverageTopic[];
    notStarted: DashboardCoverageTopic[];
  };
}

export type CategoryCoverageStatus = "finished" | "on_the_way" | "not_started";

export interface DashboardCategoryCoverageItem {
  id: string;
  title: string;
  paperId: string;
  paperCode: string;
  paperTitle: string;
  totalSubCategories: number;
  attemptedSubCategories: number;
  percent: number;
  status: CategoryCoverageStatus;
}

export interface DashboardCategoryCoverage {
  finished: DashboardCategoryCoverageItem[];
  onTheWay: DashboardCategoryCoverageItem[];
  notStarted: DashboardCategoryCoverageItem[];
  counts: {
    finished: number;
    onTheWay: number;
    notStarted: number;
    total: number;
  };
}

/** Subcategory accuracy for one local calendar day on the selected paper. */
export interface DashboardScoreHistorySubcategory {
  id: string;
  name: string;
  correct: number;
  answered: number;
  score: number;
}

export interface DashboardScoreHistoryPoint {
  date: string;
  score: number;
  paper: string;
  subcategories: DashboardScoreHistorySubcategory[];
}

export interface DashboardOverview {
  studentName: string;
  targetExamDate: string | null;
  examDatesByPaperId: Record<string, string>;
  selectedPaperId: string | null;
  selectedPaper: DashboardFilterPaper | null;
  filterPapers: DashboardFilterPaper[];
  totalAttempts: number;
  averageScore: number;
  completedQuizzes: number;
  bestScore: number;
  weakSubCategoryCount: number;
  studyStreak: number;
  studyActivity: { date: string; count: number }[];
  weakSubCategories: string[];
  subCategoryDetails: DashboardSubCategoryDetail[];
  coverage: DashboardCoverage;
  knowledgeCoverage: DashboardKnowledgeCoverage;
  categoryCoverage: DashboardCategoryCoverage;
  paperProgress: DashboardPaperProgress[];
  carouselPapers: DashboardPaperProgress[];
  isPremiumSubscriber: boolean;
  recommendedPractice: DashboardRecommendedPractice[];
  /** Unpractised SubCategories for the selected paper (Daily Goal “New Chapters”). */
  newPractice: DashboardRecommendedPractice[];
  recentActivity: DashboardRecentActivity[];
  scoreHistory: DashboardScoreHistoryPoint[];
  attemptScores: {
    practice: { latestScore: number | null; bestScore: number | null; count: number };
    mock: { latestScore: number | null; bestScore: number | null; count: number };
  };
  trends?: {
    attempts: number | null;
    averageScore: number | null;
    completedQuizzes: number | null;
  };
  continueLearning: {
    paperId: string;
    paperCode: string;
    paperTitle: string;
    status:
      | "unfinished"
      | "continue_next"
      | "all_complete"
      | "ready_to_start"
      | "no_syllabus";
    lastCompleted: {
      categoryId: string;
      categoryTitle: string;
      subCategoryId: string;
      subCategoryTitle: string;
    } | null;
    upNext: {
      categoryId: string;
      categoryTitle: string;
      subCategoryId: string;
      subCategoryTitle: string;
    } | null;
    href: string | null;
    progressPercent: number;
    chaptersCompleted: number;
    chaptersTotal: number;
  } | null;
  dailyGoal: {
    dateKey: string;
    timezone: string;
    questions: { current: number; target: number };
    weakTopic: { current: number; target: number };
    quizScore: { current: number; target: number; threshold: number };
    goalsCompleted: number;
    goalsTotal: number;
    overallPercent: number;
    completed: boolean;
  };
}

// Future-ready (not used in Phase 1 UI yet)
export type AccessControlLevel = "FREE" | "PREMIUM";
export type QuestionPurpose = "PRACTICE" | "MOCK_EXAM";
