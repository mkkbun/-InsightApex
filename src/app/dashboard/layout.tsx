import { requireStudent } from "@/lib/guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { logPerf } from "@/lib/perf-timing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const start = performance.now();
  const user = await requireStudent();
  logPerf("dashboard-layout requireStudent", performance.now() - start);
  const userName = user.name ?? user.email ?? "Student";

  return <DashboardShell userName={userName}>{children}</DashboardShell>;
}
