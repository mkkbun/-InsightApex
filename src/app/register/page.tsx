"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/marketing/AuthSplitLayout";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 0115 0" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5l8.4 5.6a1.5 1.5 0 001.6 0L21.4 7.5M5.25 18h13.5A1.75 1.75 0 0020.5 16.25v-8.5A1.75 1.75 0 0018.75 6H5.25A1.75 1.75 0 003.5 7.75v8.5A1.75 1.75 0 005.25 18z" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V8.25a4.5 4.5 0 019 0v2.25M6.75 10.5h10.5A1.75 1.75 0 0119 12.25v6A1.75 1.75 0 0117.25 20H6.75A1.75 1.75 0 015 18.25v-6a1.75 1.75 0 011.75-1.75z" />
    </svg>
  );
}

function IconSchool({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75L3.75 8.25 12 12.75l8.25-4.5L12 3.75zM6 10.2v5.05c0 .4.22.77.58.97L12 19.5l5.42-3.28c.36-.2.58-.57.58-.97V10.2" />
    </svg>
  );
}

function IconSource({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25h13.5v13.5H5.25zM8.25 9h7.5M8.25 12.75h7.5M8.25 16.5h4.5" />
    </svg>
  );
}

function IconEye({ className, open }: { className?: string; open: boolean }) {
  if (open) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" />
    </svg>
  );
}

const STEPS = [
  "Create your free account",
  "Pick your school & papers",
  "Start your first practice set",
] as const;

function FieldShell({
  label,
  icon,
  trailing,
  children,
}: {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-20 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
        {trailing}
      </span>
    </label>
  );
}

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-ink-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

function RegisterShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AuthSplitLayout
      eyebrow="Create account"
      title={title}
      subtitle={subtitle}
      leftHeadline={
        <>
          Start practicing
          <br />
          for free.
        </>
      }
      leftDescription="Join students preparing for ACCA with structured papers, mock exams, and daily practice questions."
      leftBottom={
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-sm text-blue-50/90">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      }
    >
      {children}
    </AuthSplitLayout>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolIdFromUrl = searchParams.get("schoolId")?.trim() ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    schoolId: schoolIdFromUrl,
    registrationSourceId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [schools, setSchools] = useState<Option[]>([]);
  const [sources, setSources] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [schoolLocked, setSchoolLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/register/options", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Could not load schools and signup sources. Run npm run db:seed if this is a fresh database."
          );
          setSchools([]);
          setSources([]);
          return;
        }
        const schoolList: Option[] = data.schools ?? [];
        const sourceList: Option[] = data.sources ?? [];
        setSchools(schoolList);
        setSources(sourceList);

        if (schoolList.length === 0 || sourceList.length === 0) {
          setError(
            "No schools or referral sources are configured yet. Ask an admin to seed the database (npm run db:seed)."
          );
        }

        if (schoolIdFromUrl) {
          const match = schoolList.find((s) => s.id === schoolIdFromUrl);
          if (match) {
            setForm((prev) => ({ ...prev, schoolId: match.id }));
            setSchoolLocked(true);
          } else {
            setError(
              "This school is not accepting public signups right now. Choose another school or ask your school admin."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not load registration options. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolIdFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <RegisterShell title="Check your email" subtitle="We've sent a verification link to your inbox.">
        <p className="text-sm text-slate-600">
          Open the email from InsightApex and click <strong>Verify email address</strong>. Check your spam
          folder if you don&apos;t see it within a few minutes.
        </p>
        <p className="mt-3 text-sm text-slate-500">Redirecting you to login…</p>
      </RegisterShell>
    );
  }

  const selectedSchool = schools.find((s) => s.id === form.schoolId);
  const schoolEmpty = !form.schoolId;
  const sourceEmpty = !form.registrationSourceId;

  return (
    <RegisterShell
      title="Create your account"
      subtitle={
        schoolLocked && selectedSchool
          ? `Join ${selectedSchool.name} and start practicing ACCA questions.`
          : "Choose your school and start practicing ACCA questions for free."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldShell label="Full name" icon={<IconUser className="h-4 w-4" />}>
          <input
            required
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={fieldClass}
          />
        </FieldShell>

        <FieldShell label="Email" icon={<IconMail className="h-4 w-4" />}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={fieldClass}
          />
        </FieldShell>

        <FieldShell
          label="Password"
          icon={<IconLock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <IconEye className="h-4 w-4" open={showPassword} />
            </button>
          }
        >
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={cn(fieldClass, "pr-11")}
          />
        </FieldShell>

        <FieldShell label="School" icon={<IconSchool className="h-4 w-4" />}>
          <span className="relative block overflow-hidden rounded-lg">
            <select
              required
              value={form.schoolId}
              onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
              disabled={schoolLocked || optionsLoading || schools.length === 0}
              className={cn(
                fieldClass,
                "appearance-none pr-10 [-webkit-appearance:none] [-moz-appearance:none] [&::-ms-expand]:hidden [&>option]:bg-white [&>option]:text-ink-900",
                schoolEmpty && "text-slate-400"
              )}
            >
              <option value="" disabled>
                {optionsLoading ? "Loading schools…" : "Select your school"}
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-10 items-center justify-center text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </span>
        </FieldShell>

        {schoolLocked && selectedSchool && (
          <p className="text-xs text-emerald-700">
            You are registering under <strong>{selectedSchool.name}</strong>. Your partner school will see
            your signup in their portal.
          </p>
        )}

        <FieldShell label="How did you hear about us?" icon={<IconSource className="h-4 w-4" />}>
          <span className="relative block overflow-hidden rounded-lg">
            <select
              required
              value={form.registrationSourceId}
              onChange={(e) => setForm({ ...form, registrationSourceId: e.target.value })}
              disabled={optionsLoading || sources.length === 0}
              className={cn(
                fieldClass,
                "appearance-none pr-10 [-webkit-appearance:none] [-moz-appearance:none] [&::-ms-expand]:hidden [&>option]:bg-white [&>option]:text-ink-900",
                sourceEmpty && "text-slate-400"
              )}
            >
              <option value="" disabled>
                {optionsLoading ? "Loading sources…" : "Select a source"}
              </option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-10 items-center justify-center text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </span>
        </FieldShell>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white",
            "shadow-[0_8px_20px_rgba(36,86,245,0.35)] transition-all",
            "hover:bg-brand-700 hover:shadow-[0_10px_24px_rgba(36,86,245,0.4)] active:scale-[0.99]",
            "disabled:cursor-not-allowed disabled:opacity-70"
          )}
        >
          {loading && <Spinner className="h-4 w-4 text-white" />}
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
        By creating an account you agree to InsightApex&apos;s{" "}
        <Link href="/terms" className="font-medium text-slate-700 hover:text-ink-900">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-slate-700 hover:text-ink-900">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </RegisterShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <RegisterShell title="Create your account" subtitle="Loading signup form…">
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </RegisterShell>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
