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

export interface DashboardCoverage {
  percent: number;
  coveredTopics: number;
  totalTopics: number;
  label: string;
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
  categoryCoverage: DashboardCategoryCoverage;
  paperProgress: DashboardPaperProgress[];
  carouselPapers: DashboardPaperProgress[];
  isPremiumSubscriber: boolean;
  recommendedPractice: DashboardRecommendedPractice[];
  recentActivity: DashboardRecentActivity[];
  scoreHistory: { date: string; score: number; paper: string }[];
  attemptScores: {
    practice: { latestScore: number | null; bestScore: number | null; count: number };
    mock: { latestScore: number | null; bestScore: number | null; count: number };
  };
  trends?: {
    attempts: number | null;
    averageScore: number | null;
    completedQuizzes: number | null;
  };
}

// Future-ready (not used in Phase 1 UI yet)
export type AccessControlLevel = "FREE" | "PREMIUM";
export type QuestionPurpose = "PRACTICE" | "MOCK_EXAM";
