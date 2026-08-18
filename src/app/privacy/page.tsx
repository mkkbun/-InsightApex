import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/register" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        InsightApex stores the details you provide at signup — name, email, school, and how you heard
        about us — so we can create your account, send verification email, and show progress to you
        and your school where applicable.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        We do not sell your personal data. Questions about how your information is used can be sent
        to{" "}
        <a href="mailto:support@insightapex.com" className="font-medium text-brand-600">
          support@insightapex.com
        </a>
        .
      </p>
    </main>
  );
}
