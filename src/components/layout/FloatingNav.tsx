"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconOverview,
  IconPractice,
  IconMockExam,
  IconProfile,
  IconBilling,
  IconPremium,
} from "@/components/dashboard/DashboardIcons";

export const SIDEBAR_COLLAPSED_OFFSET = 88;
export const SIDEBAR_EXPANDED_OFFSET = 272;

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  sectionId?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <IconOverview className="h-5 w-5" />, exact: true },
  { href: "/dashboard/quiz", label: "Practice", icon: <IconPractice className="h-5 w-5" /> },
  { href: "/dashboard/mock-exams", label: "Mock Exams", icon: <IconMockExam className="h-5 w-5" /> },
  { href: "/dashboard/pricing", label: "Pricing", icon: <IconPremium className="h-5 w-5" /> },
  { href: "/dashboard/billing", label: "Billing", icon: <IconBilling className="h-5 w-5" /> },
  { href: "/dashboard/profile", label: "Profile", icon: <IconProfile className="h-5 w-5" /> },
];

interface FloatingNavProps {
  expanded: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  isPremium?: boolean;
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function IconButton({
  active,
  label,
  children,
  className,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
        active ? "bg-gradient-brand text-white shadow-glow" : "text-slate-500",
        className
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

export function FloatingNav({ expanded, mobileOpen, onClose, isPremium }: FloatingNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash.replace("#", ""));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function isActive(item: NavItem) {
    if (item.sectionId) return pathname === "/dashboard" && activeHash === item.sectionId;
    if (item.exact && item.href === "/dashboard") return pathname === "/dashboard" && !activeHash;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function handleSectionNav(sectionId: string) {
    onClose?.();
    setActiveHash(sectionId);
    if (pathname === "/dashboard") {
      scrollToSection(sectionId);
      window.history.replaceState(null, "", `/dashboard#${sectionId}`);
      return;
    }
    router.push(`/dashboard#${sectionId}`);
  }

  function handleOverviewClick() {
    onClose?.();
    setActiveHash("");
    if (pathname === "/dashboard") {
      window.history.replaceState(null, "", "/dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function collapsedItemClass(active: boolean) {
    return cn(
      "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200",
      active ? "" : "hover:bg-slate-50"
    );
  }

  function expandedItemClass(active: boolean) {
    return cn(
      "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200",
      active
        ? "bg-gradient-brand text-white shadow-glow"
        : "text-slate-500 hover:bg-slate-50 hover:text-ink-800"
    );
  }

  function renderCollapsedItem(item: NavItem) {
    const active = isActive(item);

    const inner = (
      <>
        <IconButton active={active} label={item.label}>
          {item.icon}
        </IconButton>
        <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-panel transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
          {item.label}
        </span>
      </>
    );

    if (item.sectionId) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => handleSectionNav(item.sectionId!)}
          className={collapsedItemClass(active)}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
        >
          {inner}
        </button>
      );
    }

    if (item.exact && item.href === "/dashboard") {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={handleOverviewClick}
          className={collapsedItemClass(active)}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
        >
          {inner}
        </Link>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={collapsedItemClass(active)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
      >
        {inner}
      </Link>
    );
  }

  function renderExpandedItem(item: NavItem) {
    const active = isActive(item);
    const content = (
      <>
        <span className="shrink-0">{item.icon}</span>
        <span className="text-sm font-medium">{item.label}</span>
      </>
    );

    if (item.sectionId) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => handleSectionNav(item.sectionId!)}
          className={expandedItemClass(active)}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
        >
          {content}
        </button>
      );
    }

    if (item.exact && item.href === "/dashboard") {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={handleOverviewClick}
          className={expandedItemClass(active)}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={expandedItemClass(active)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }

  function renderMobileItem(item: NavItem) {
    const active = isActive(item);
    const className = cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      active ? "bg-gradient-brand text-white shadow-glow" : "text-slate-600 hover:bg-slate-50"
    );

    if (item.sectionId) {
      return (
        <button key={item.label} type="button" onClick={() => handleSectionNav(item.sectionId!)} className={className}>
          {item.icon}
          {item.label}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={item.exact && item.href === "/dashboard" ? handleOverviewClick : onClose}
        className={className}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Desktop — collapsed floating capsule (below header) */}
      {!expanded && (
        <div className="pointer-events-none fixed left-2 top-20 z-40 hidden lg:block">
          <nav
            className="pointer-events-auto flex flex-col items-center gap-1 rounded-[32px] border border-slate-200/50 bg-white px-2.5 py-3 shadow-float"
            aria-label="Main navigation"
          >
            {navItems.map(renderCollapsedItem)}
          </nav>
        </div>
      )}

      {/* Desktop — expanded floating panel */}
      {expanded && (
        <aside className="fixed left-2 top-20 z-40 hidden max-h-[calc(100vh-6rem)] w-[240px] flex-col rounded-[28px] border border-slate-200/50 bg-white p-4 shadow-float lg:flex">
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main navigation">
            {navItems.map(renderExpandedItem)}
            {!isPremium && (
              <>
                <div className="my-2 h-px w-full bg-slate-100" />
                <Link href="/dashboard/pricing" className={expandedItemClass(false)}>
                  <IconPremium className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Go Premium</span>
                </Link>
              </>
            )}
          </nav>
        </aside>
      )}

      {/* Desktop — separate premium pill (collapsed only) */}
      {!expanded && !isPremium && (
        <Link
          href="/dashboard/pricing"
          className="fixed bottom-6 left-2 z-40 hidden h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/50 bg-white text-accent-500 shadow-float transition-all hover:border-accent-200 hover:bg-accent-50 hover:shadow-panel lg:flex"
          aria-label="Go Premium"
        >
          <IconPremium className="h-5 w-5" />
        </Link>
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200/60 bg-white p-5 shadow-float transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link href="/dashboard" className="mb-6 flex items-center gap-3" onClick={onClose}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-glow">
            IA
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">InsightApex</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">ACCA Practice</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">{navItems.map(renderMobileItem)}</nav>

        {!isPremium && (
          <Link
            href="/dashboard/pricing"
            onClick={onClose}
            className="mt-4 flex items-center justify-center rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card"
          >
            Go Premium
          </Link>
        )}
      </aside>
    </>
  );
}
