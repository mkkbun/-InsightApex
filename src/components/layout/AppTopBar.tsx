"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavStudyStreak } from "@/components/layout/NavStudyStreak";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { IconChevronDown } from "@/components/dashboard/DashboardIcons";
import { cn } from "@/lib/utils";

export const HEADER_HEIGHT_PX = 64;

interface AppTopBarProps {
  userName: string;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onMenuOpen?: () => void;
  studyStreak?: number;
  studyActivity?: { date: string; count: number }[];
  /** When provided by DashboardShell, skips a duplicate billing fetch. */
  isPremium?: boolean;
}

export function IconGridToggle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function AppTopBar({
  userName,
  sidebarExpanded,
  onToggleSidebar,
  onMenuOpen,
  studyStreak = 0,
  studyActivity = [],
  isPremium = false,
}: AppTopBarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/* Left — menu + toggle + brand */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className={cn(
              "hidden h-9 w-9 items-center justify-center rounded-lg text-brand-500 transition-colors hover:bg-brand-50 lg:flex",
              sidebarExpanded && "bg-brand-50"
            )}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarExpanded}
          >
            <IconGridToggle className="h-4 w-4" />
          </button>

          <div className="hidden h-6 w-px bg-slate-200 lg:block" aria-hidden />

          <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/insightapex-logo.png"
              alt=""
              className="h-9 w-auto object-contain sm:h-10"
            />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold leading-tight tracking-tight text-ink-900">InsightApex</p>
              <p className="truncate text-[11px] leading-tight text-slate-400">ACCA Practice Platform</p>
            </div>
          </Link>
        </div>

        {/* Center — search (desktop); grows with full-width header */}
        <div className="hidden min-w-0 flex-1 px-4 lg:block lg:px-8 xl:max-w-3xl 2xl:max-w-4xl">
          <GlobalSearch />
        </div>

        {/* Right — actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Search"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {studyStreak !== undefined && (
            <NavStudyStreak studyStreak={studyStreak} studyActivity={studyActivity} />
          )}

          <NotificationBell />

          <Dropdown
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-slate-50 sm:gap-2.5 sm:pr-3"
              >
                <Avatar name={userName} size="sm" />
                <div className="hidden text-left md:block">
                  <div className="flex items-center gap-1">
                    <p className="max-w-[120px] truncate text-sm font-semibold text-slate-800">{userName}</p>
                    <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </div>
                  {isPremium && (
                    <Badge tone="premium" className="mt-0.5 text-[10px]">
                      Premium
                    </Badge>
                  )}
                </div>
              </button>
            }
            items={[
              { label: "Profile", href: "/dashboard/profile" },
              { label: "Billing", href: "/dashboard/billing" },
              { label: "Sign out", onClick: () => signOut({ callbackUrl: "/" }), danger: true },
            ]}
          />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-slate-200/60 px-4 py-3 lg:hidden">
          <GlobalSearch showShortcut={false} />
        </div>
      )}
    </header>
  );
}
