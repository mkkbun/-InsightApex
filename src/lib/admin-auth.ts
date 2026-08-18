import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isContentAdmin, isOwner, isPlatformStaff } from "@/lib/roles";
import { logPerf } from "@/lib/perf-timing";

export type AdminApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
};

async function getSessionUser(): Promise<AdminApiUser | null> {
  const start = performance.now();
  const session = await getServerSession(authOptions);
  logPerf("getServerSession (api)", performance.now() - start);
  const user = session?.user;
  if (!user?.id || !user.role) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/** OWNER only (full platform admin APIs). */
export async function requireAdminApi(): Promise<AdminApiUser | null> {
  const user = await getSessionUser();
  if (!user || !isOwner(user.role)) return null;
  return user;
}

/** OWNER or CONTENT_ADMIN — practice questions / mock content editors. */
export async function requireContentEditorApi(): Promise<AdminApiUser | null> {
  const user = await getSessionUser();
  if (!user || !isPlatformStaff(user.role)) return null;
  return user;
}

/** Hierarchy read (papers/categories) — OWNER and CONTENT_ADMIN (needed for question filters). */
export async function requireHierarchyReadApi(): Promise<AdminApiUser | null> {
  return requireContentEditorApi();
}

/** Hierarchy write — OWNER only. */
export async function requireHierarchyWriteApi(): Promise<AdminApiUser | null> {
  return requireAdminApi();
}

export async function requireAuthApi(): Promise<AdminApiUser | null> {
  return getSessionUser();
}

export function isContentEditorRole(role: string | undefined | null): boolean {
  return isOwner(role) || isContentAdmin(role);
}
