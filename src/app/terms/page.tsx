import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/register" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">Terms of use</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        By creating an InsightApex account you agree to use the platform for ACCA exam preparation,
        keep your login details secure, and follow your school&apos;s rules where they apply. We may
        update these terms as the product evolves.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        If you have questions, contact{" "}
        <a href="mailto:support@insightapex.com" className="font-medium text-brand-600">
          support@insightapex.com
        </a>
        .
      </p>
    </main>
  );
}
