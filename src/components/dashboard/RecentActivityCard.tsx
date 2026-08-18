"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardRecentActivity } from "@/types";

function formatWhen(date: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentActivityCard({
  activities,
  totalAttempts,
}: {
  activities: DashboardRecentActivity[];
  totalAttempts: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <h2 className="section-title">Recent activity</h2>
        <p className="section-subtitle">
          {totalAttempts} submitted attempt{totalAttempts === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardBody>
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No recent quizzes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activities.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/quiz/result?attemptId=${a.id}`}
                  className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">{a.paper}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      {a.subCategory ?? "Practice"} · {formatWhen(a.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-sm font-semibold text-slate-800">
                      {a.score != null ? `${Math.round(a.score)}%` : "—"}
                    </span>
                    {a.passed != null && (
                      <Badge tone={a.passed ? "success" : "danger"}>
                        {a.passed ? "Pass" : "Fail"}
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/quiz"
          className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          Practice more →
        </Link>
      </CardBody>
    </Card>
  );
}
