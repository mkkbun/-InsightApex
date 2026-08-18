import { PageLoading } from "@/components/ui/PageLoading";

/**
 * Keeps DashboardShell (header/nav/background) visible while the page segment loads.
 * Avoids a full-viewport white flash during client navigations.
 */
export default function DashboardLoading() {
  return <PageLoading message="Loading…" className="min-h-[50vh]" />;
}
