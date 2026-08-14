"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface WelcomeHeaderProps {
  studentName: string;
  hasAttempts: boolean;
  paperId?: string | null;
  paperCode?: string | null;
  paperTitle?: string | null;
  targetExamDate?: string | null;
  onExamDateChange?: (date: string | null) => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseExamDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatExamDayLabel(isoDate: string) {
  const date = parseExamDay(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function useExamCountdown(isoDate: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isoDate) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isoDate]);

  return useMemo(() => {
    if (!isoDate) return null;
    const examDay = parseExamDay(isoDate);
    if (!examDay) return null;

    const examStart = startOfLocalDay(examDay).getTime();
    const todayStart = startOfLocalDay(new Date(now)).getTime();
    const diffMs = examStart - now;
    const dayDiff = Math.round((examStart - todayStart) / (24 * 60 * 60 * 1000));

    if (dayDiff === 0) {
      return { kind: "today" as const, label: formatExamDayLabel(isoDate) };
    }
    if (dayDiff < 0) {
      return {
        kind: "past" as const,
        daysAgo: Math.abs(dayDiff),
        label: formatExamDayLabel(isoDate),
      };
    }

    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      kind: "upcoming" as const,
      days,
      hours,
      minutes,
      seconds,
      label: formatExamDayLabel(isoDate),
    };
  }, [isoDate, now]);
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[2.75rem] rounded-lg bg-white/15 px-2 py-1.5 text-center backdrop-blur-sm">
      <div className="text-base font-bold tabular-nums text-white sm:text-lg">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[9px] font-medium uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}

export function WelcomeHeader({
  studentName,
  hasAttempts,
  paperId = null,
  paperCode = null,
  paperTitle = null,
  targetExamDate = null,
  onExamDateChange,
}: WelcomeHeaderProps) {
  const firstName = studentName.split(" ")[0];
  const countdown = useExamCountdown(paperId ? targetExamDate : null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(targetExamDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftDate(targetExamDate ?? "");
    setError(null);
  }, [paperId, targetExamDate]);

  const paperLabel = paperCode
    ? paperTitle
      ? `${paperCode} – ${paperTitle}`
      : paperCode
    : null;

  async function saveExamDate(next: string | null) {
    if (!paperId) {
      setError("Select a paper first, then set that paper’s exam day.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ paperId, targetExamDate: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not save exam day"
        );
      }
      onExamDateChange?.(data.targetExamDate ?? null);
      setModalOpen(false);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Could not reach the server. Check that the app is running and try again."
          : err instanceof Error
            ? err.message
            : "Could not save exam day";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand px-5 py-4 shadow-panel sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 right-1/4 h-24 w-24 rounded-full bg-accent-400/20 blur-2xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm leading-snug text-white/80">
              {hasAttempts
                ? "Every question you solve today brings you closer to your goals. Keep the momentum going!"
                : "Your ACCA journey starts here. Take your first practice quiz to unlock personalised insights."}
            </p>

            {!targetExamDate && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={!paperId}
                className="mt-2 text-sm font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              >
                {paperCode ? `Set Exam Date (${paperCode})` : "Set Exam Date"}
              </button>
            )}
          </div>

          {countdown && (
            <div className="w-full shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 backdrop-blur-sm sm:w-auto sm:max-w-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    {paperCode ? `${paperCode} exam countdown` : "Exam countdown"}
                  </p>
                  <p className="mt-0.5 text-xs text-white/90 sm:text-sm">{countdown.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="shrink-0 text-xs font-medium text-white/80 hover:text-white"
                >
                  Change
                </button>
              </div>

              {countdown.kind === "upcoming" && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <CountdownUnit value={countdown.days} label="Days" />
                  <CountdownUnit value={countdown.hours} label="Hrs" />
                  <CountdownUnit value={countdown.minutes} label="Min" />
                  <CountdownUnit value={countdown.seconds} label="Sec" />
                </div>
              )}

              {countdown.kind === "today" && (
                <p className="mt-2 text-sm font-semibold text-white">Exam day is today — good luck!</p>
              )}

              {countdown.kind === "past" && (
                <p className="mt-2 text-xs text-white/90 sm:text-sm">
                  Exam day was {countdown.daysAgo} day{countdown.daysAgo === 1 ? "" : "s"} ago. Set a
                  new date when you&apos;re ready.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={paperCode ? `${paperCode} exam day` : "Exam day"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {paperLabel
              ? `Pick your ${paperLabel} exam date. Switching papers later will show that paper’s own countdown.`
              : "Select a paper first, then pick its exam date."}
          </p>
          <Input
            id="target-exam-date"
            label="Exam date"
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {targetExamDate && (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => void saveExamDate(null)}
              >
                Clear date
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !draftDate || !paperId}
              onClick={() => void saveExamDate(draftDate || null)}
            >
              {saving ? "Saving…" : "Save exam day"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
