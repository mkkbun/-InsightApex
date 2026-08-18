"use client";

import { cn } from "@/lib/utils";

const GRID_DAYS = 25; // 5 × 5 mini heatmap

type ActivityDay = { date: string; count: number };

/**
 * Compact Study Streak chip for the top bar (same streak + activity data as before).
 */
export function NavStudyStreak({
  studyStreak,
  studyActivity = [],
  className,
}: {
  studyStreak: number;
  studyActivity?: ActivityDay[];
  className?: string;
}) {
  const max = Math.max(1, ...studyActivity.map((d) => d.count));
  const recent = studyActivity.slice(-GRID_DAYS);
  // Pad from the left if fewer than GRID_DAYS so the grid stays 5×5.
  const cells: ActivityDay[] =
    recent.length >= GRID_DAYS
      ? recent
      : [
          ...Array.from({ length: GRID_DAYS - recent.length }, (_, i) => ({
            date: `pad-${i}`,
            count: 0,
          })),
          ...recent,
        ];

  return (
    <div
      className={cn(
        "hidden items-center gap-3 rounded-xl bg-[#2456f5] px-3 py-2 text-white shadow-sm md:flex",
        className
      )}
      title={
        studyStreak > 0
          ? `${studyStreak}-day study streak — keep practising`
          : "Practice today to start a streak"
      }
      aria-label={
        studyStreak > 0
          ? `Study streak: ${studyStreak} days`
          : "Study streak: 0 days"
      }
    >
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] font-medium text-white/85">Study Streak</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-sm leading-none" aria-hidden>
            🔥
          </span>
          <span className="text-base font-bold tabular-nums tracking-tight">
            {studyStreak}
          </span>
          <span className="text-[11px] font-medium text-white/80">days</span>
        </p>
      </div>

      <div
        className="grid shrink-0 grid-cols-5 gap-[3px]"
        aria-hidden
      >
        {cells.map((day) => {
          const active = day.count > 0;
          const intensity = active ? Math.max(0.35, day.count / max) : 0;
          return (
            <span
              key={day.date}
              title={
                day.date.startsWith("pad-")
                  ? undefined
                  : `${day.date}: ${day.count} quiz${day.count === 1 ? "" : "zes"}`
              }
              className={cn(
                "h-[5px] w-[5px] rounded-full",
                active ? "bg-teal-300" : "bg-white/20"
              )}
              style={active ? { opacity: intensity } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
