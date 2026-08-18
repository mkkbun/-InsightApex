import Link from "next/link";
import type { ReactNode } from "react";

const LOGO_SRC = "/brand/insightapex-logo.png";

export function AuthSplitLayout({
  eyebrow,
  title,
  subtitle,
  leftHeadline,
  leftDescription,
  leftBottom,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  leftHeadline: ReactNode;
  leftDescription: string;
  leftBottom?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-white">
      <aside className="relative hidden w-[40%] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:bg-[#0c1f4d]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-32deg, transparent, transparent 14px, rgba(255,255,255,0.35) 14px, rgba(255,255,255,0.35) 15px)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            InsightApex
          </Link>

          <div className="max-w-md animate-fade-in">
            <div className="mb-8 inline-flex rounded-2xl border border-white/20 bg-white p-4 shadow-[0_0_40px_rgba(59,130,246,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Insight Apex — Master today. Lead tomorrow."
                className="h-auto w-[11.5rem] object-contain sm:w-[13rem]"
              />
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              {leftHeadline}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/85 xl:text-[15px]">
              {leftDescription}
            </p>
            {leftBottom ? <div className="mt-8">{leftBottom}</div> : null}
          </div>

          <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.22em] text-blue-200/50">
            InsightApex · ACCA Exam Preparation
          </p>
        </div>
      </aside>

      <main className="relative flex w-full flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:w-[60%]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.06),_transparent_55%)]" />

        <div className="relative w-full max-w-[26rem] animate-slide-up">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            <span className="h-px w-4 bg-brand-500" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

          <Link href="/" className="mt-5 inline-flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="Insight Apex" className="h-14 w-auto object-contain" />
          </Link>

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
