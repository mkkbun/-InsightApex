"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type {
  DashboardScoreHistoryPoint,
  DashboardScoreHistorySubcategory,
} from "@/types";

type ChartPoint = DashboardScoreHistoryPoint & { label: string };

function formatLocalDateLabel(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return dateKey;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function PerformanceTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const subs: DashboardScoreHistorySubcategory[] = point.subcategories ?? [];

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
      <p className="font-semibold text-ink-900">{point.label}</p>

      {subs.length > 0 ? (
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
          {subs.map((sc) => (
            <li key={sc.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1 break-words leading-snug text-slate-600">
                {sc.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                {sc.score}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-slate-500">
          Overall {point.score}%
          {point.paper ? ` · ${point.paper}` : ""}
          <span className="mt-0.5 block text-[11px] text-slate-400">
            No subcategory detail for this date
          </span>
        </p>
      )}
    </div>
  );
}

export function ScoreChart({ data }: { data: DashboardScoreHistoryPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
        <span className="mb-2 text-2xl">📊</span>
        <p className="text-sm font-medium text-slate-600">No score history yet</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Start your first practice to see your score trend over time.
        </p>
      </div>
    );
  }

  const formatted: ChartPoint[] = data.map((d) => ({
    ...d,
    subcategories: d.subcategories ?? [],
    label: formatLocalDateLabel(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b2ff5" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2456f5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b2ff5" />
            <stop offset="100%" stopColor="#2456f5" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<PerformanceTrendTooltip />}
          wrapperStyle={{ outline: "none", zIndex: 20 }}
          allowEscapeViewBox={{ x: true, y: true }}
        />
        <ReferenceLine
          y={50}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "Pass (50%)", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="url(#scoreStroke)"
          strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={{ r: 4, fill: "#2456f5", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
