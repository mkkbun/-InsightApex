"use client";

import { useEffect, useState } from "react";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  userName: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [studyStreak, setStudyStreak] = useState(0);
  const [studyActivity, setStudyActivity] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Lean parallel fetches — avoid loading full /api/dashboard twice.
    void Promise.all([
      fetch("/api/billing/dashboard", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/dashboard/streak", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([billing, streak]) => {
        if (cancelled) return;
        const status = billing.subscription?.status;
        setIsPremium(status === "ACTIVE" || status === "TRIALING");
        setStudyStreak(streak.studyStreak ?? 0);
        setStudyActivity(Array.isArray(streak.studyActivity) ? streak.studyActivity : []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-surface">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-200/20 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-brand-200/20 blur-3xl" />
      </div>

      <AppTopBar
        userName={userName}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((v) => !v)}
        onMenuOpen={() => setMobileOpen(true)}
        studyStreak={studyStreak}
        studyActivity={studyActivity}
        isPremium={isPremium}
      />

      <FloatingNav
        expanded={sidebarExpanded}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isPremium={isPremium}
      />

      <main
        className={cn(
          "relative min-w-0 transition-[padding-left] duration-300",
          sidebarExpanded ? "lg:pl-[256px]" : "lg:pl-[76px]"
        )}
      >
        <div className="dashboard-page-container animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
