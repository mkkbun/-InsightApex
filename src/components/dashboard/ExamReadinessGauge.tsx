"use client";

import {
  EXAM_READINESS_STAGES,
  clampExamPercent,
  getExamReadinessStage,
} from "@/lib/exam-insights";
import { cn } from "@/lib/utils";

type ExamReadinessGaugeProps = {
  percent: number;
  empty?: boolean;
  /** Accessible metric name, e.g. "Exam success metrics" */
  metricName?: string;
  emptyLabel?: string;
  /** Tighter layout for 3 side-by-side cards */
  compact?: boolean;
  /** Hide the stage dots/legend under the gauge */
  hideLegend?: boolean;
  className?: string;
};

/**
 * Semicircle speedometer: 5 coloured stages + needle from a 0–100%.
 * Geometry is viewBox-based so it scales without distortion.
 */
export function ExamReadinessGauge({
  percent,
  empty = false,
  metricName = "Exam success metrics",
  emptyLabel = "No practice yet",
  compact = false,
  hideLegend = false,
  className,
}: ExamReadinessGaugeProps) {
  const value = empty ? 0 : clampExamPercent(percent);
  const stage = getExamReadinessStage(value);

  const width = 320;
  const height = compact ? 168 : 190;
  const cx = width / 2;
  const cy = compact ? 138 : 150;
  const radius = compact ? 104 : 118;
  const strokeWidth = compact ? 23 : 28;
  const innerR = radius - strokeWidth / 2;

  const startAngle = Math.PI;
  const endAngle = 0;
  const sweep = startAngle - endAngle;

  function polar(angle: number, r: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  }

  function arcPath(a0: number, a1: number, r: number) {
    const p0 = polar(a0, r);
    const p1 = polar(a1, r);
    const large = a0 - a1 > Math.PI ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  }

  const stageCount = EXAM_READINESS_STAGES.length;
  const stageArcs = EXAM_READINESS_STAGES.map((s, i) => {
    const a0 = startAngle - (i / stageCount) * sweep;
    const a1 = startAngle - ((i + 1) / stageCount) * sweep;
    return { ...s, a0, a1, d: arcPath(a0, a1, innerR) };
  });

  const needleAngle = startAngle - (value / 100) * sweep;
  // Short stubby arrowhead at the inner edge of the coloured track (not a long center needle).
  const hubR = innerR - strokeWidth / 2;
  const tipR = hubR + strokeWidth * 0.7;
  const halfW = compact ? 4.5 : 5.5;
  const needleTip = polar(needleAngle, tipR);
  const needleBaseLeft = {
    x: cx + hubR * Math.cos(needleAngle) + halfW * Math.cos(needleAngle + Math.PI / 2),
    y: cy - hubR * Math.sin(needleAngle) - halfW * Math.sin(needleAngle + Math.PI / 2),
  };
  const needleBaseRight = {
    x: cx + hubR * Math.cos(needleAngle) + halfW * Math.cos(needleAngle - Math.PI / 2),
    y: cy - hubR * Math.sin(needleAngle) - halfW * Math.sin(needleAngle - Math.PI / 2),
  };

  return (
    <div className={cn("w-full mx-auto", className)}>
      <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={
            empty
              ? `${metricName}: no data yet`
              : `${metricName}: ${Math.round(value)} percent, ${stage.label}`
          }
        >
          <path
            d={arcPath(startAngle, endAngle, innerR)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {stageArcs.map((s) => (
            <path
              key={s.id}
              d={s.d}
              fill="none"
              stroke={empty ? "#e2e8f0" : s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={empty ? 0.55 : 1}
            />
          ))}

          {Array.from({ length: stageCount + 1 }).map((_, i) => {
            const a = startAngle - (i / stageCount) * sweep;
            const outer = polar(a, innerR + strokeWidth / 2 - 1);
            const inner = polar(a, innerR - strokeWidth / 2 + 1);
            return (
              <line
                key={`tick-${i}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="white"
                strokeWidth={2}
                opacity={0.9}
              />
            );
          })}

          {!empty && (
            <polygon
              points={`${needleTip.x},${needleTip.y} ${needleBaseLeft.x},${needleBaseLeft.y} ${needleBaseRight.x},${needleBaseRight.y}`}
              fill="#2d2d2d"
            />
          )}

          <text
            x={cx}
            y={cy - (compact ? 22 : 28)}
            textAnchor="middle"
            className="fill-ink-900"
            style={{ fontSize: compact ? 28 : 36, fontWeight: 700 }}
          >
            {empty ? "—" : `${Math.round(value)}%`}
          </text>
          <text
            x={cx}
            y={cy - (compact ? 4 : 6)}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: compact ? 11 : 13, fontWeight: 600 }}
          >
            {empty ? emptyLabel : stage.label}
          </text>
        </svg>
      </div>

      {hideLegend ? null : compact ? (
        <ul className="mt-1 flex items-center justify-center gap-1.5" aria-hidden>
          {EXAM_READINESS_STAGES.map((s) => (
            <li key={s.id}>
              <span
                className={cn(
                  "block h-1.5 w-1.5 rounded-full ring-1 ring-white",
                  !empty && stage.id === s.id && "h-2 w-2 ring-slate-300"
                )}
                style={{ backgroundColor: s.color }}
                title={s.label}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-5 sm:gap-2">
          {EXAM_READINESS_STAGES.map((s) => {
            const active = !empty && stage.id === s.id;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] sm:flex-col sm:items-center sm:gap-1 sm:text-center sm:text-[11px]",
                  active && "bg-slate-50 ring-1 ring-slate-200"
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span
                  className={cn(
                    "leading-tight text-slate-500",
                    active && "font-semibold text-ink-900"
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
