import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logPerf } from "@/lib/perf-timing";
import {
  homePathForRole,
  isContentAdmin,
  isContentAdminAllowedPath,
  isLecturer,
  isOwner,
  isPartnerAdmin,
  isPlatformStaff,
} from "@/lib/roles";

export async function getCurrentUser() {
  const start = performance.now();
  const session = await getServerSession(authOptions);
  logPerf("getServerSession (guards)", performance.now() - start);
  return session?.user ?? null;
}

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isPlatformStaff(user.role) || isPartnerAdmin(user.role) || isLecturer(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}

/** OWNER only (full Owner Portal). */
export async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isOwner(user.role)) redirect("/admin/login");
  return user;
}

/** @deprecated Use requireOwner */
export async function requireAdmin() {
  return requireOwner();
}

/** OWNER or CONTENT_ADMIN — may use Owner Portal shell with restricted routes. */
export async function requirePlatformStaff(pathname?: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isPlatformStaff(user.role)) redirect("/admin/login");

  if (isContentAdmin(user.role) && pathname && !isContentAdminAllowedPath(pathname)) {
    redirect("/admin/questions");
  }

  return user;
}

/** Partner Admin — school-scoped Partner Portal only. */
export async function requirePartner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isPartnerAdmin(user.role)) {
    redirect(homePathForRole(user.role));
  }

  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, role: "PARTNER_ADMIN" },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          logoUrl: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership || membership.partner.status === "SUSPENDED") {
    redirect("/login?error=partner_suspended");
  }

  return {
    user,
    partner: membership.partner,
    membershipId: membership.id,
  };
}

export async function requireLecturer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isLecturer(user.role)) {
    redirect(homePathForRole(user.role));
  }

  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, role: "LECTURER" },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          logoUrl: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership || membership.partner.status === "SUSPENDED") {
    redirect("/login?error=lecturer_suspended");
  }

  return {
    user,
    partner: membership.partner,
    membershipId: membership.id,
  };
}
