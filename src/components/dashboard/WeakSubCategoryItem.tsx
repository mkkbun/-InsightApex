import Link from "next/link";
import type { DashboardSubCategoryDetail } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

interface WeakSubCategoryItemProps {
  subCategory: DashboardSubCategoryDetail;
}

const statusTone: Record<string, "danger" | "warning" | "success"> = {
  Weak: "danger",
  Average: "warning",
  Strong: "success",
};

function studyHref(subCategory: DashboardSubCategoryDetail): string {
  if (!subCategory.categoryId) return "/dashboard/quiz";
  const params = new URLSearchParams({
    paperId: subCategory.paperId,
    categoryId: subCategory.categoryId,
    subCategoryId: subCategory.id,
  });
  return `/dashboard/quiz?${params.toString()}`;
}

export function WeakSubCategoryItem({ subCategory }: WeakSubCategoryItemProps) {
  const barTone = subCategory.accuracy < 60 ? "danger" : subCategory.accuracy < 80 ? "warning" : "success";

  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">{subCategory.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{subCategory.categoryTitle}</p>
        </div>
        <Badge tone={statusTone[subCategory.status]}>{subCategory.status}</Badge>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={subCategory.accuracy}
          tone={barTone}
          label="Quiz accuracy"
          showValue
        />
      </div>
      <Link
        href={studyHref(subCategory)}
        className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        Study now →
      </Link>
    </li>
  );
}
