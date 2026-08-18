import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import { isContentAdminAllowedPath } from "@/lib/roles";
import { logPerf } from "@/lib/perf-timing";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function homeForRole(role: unknown): string {
  if (role === "OWNER") return "/admin";
  if (role === "CONTENT_ADMIN") return "/admin/questions";
  if (role === "PARTNER_ADMIN") return "/partner";
  if (role === "LECTURER") return "/lecturer";
  return "/dashboard";
}

const MAINTENANCE_BLOCKED_PREFIXES = [
  "/dashboard",
  "/register",
  "/login",
  "/pricing",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

/** Edge-local cache — avoid a settings fetch on every matched navigation. */
const MAINTENANCE_CACHE_MS = 30_000;
let maintenanceCache: {
  at: number;
  data: { maintenanceMode?: boolean; maintenanceAdminAccess?: boolean } | null;
} | null = null;

async function getMaintenanceFlags(req: NextRequest) {
  const start = performance.now();
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.at < MAINTENANCE_CACHE_MS) {
    logPerf("middleware maintenance (cache hit)", performance.now() - start);
    return maintenanceCache.data;
  }

  try {
    const res = await fetch(new URL("/api/settings/public", req.url), {
      headers: { "x-maintenance-check": "1" },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      logPerf("middleware maintenance (fetch !ok)", performance.now() - start);
      return null;
    }
    const data = (await res.json()) as {
      maintenanceMode?: boolean;
      maintenanceAdminAccess?: boolean;
    };
    maintenanceCache = { at: now, data };
    logPerf("middleware maintenance (fetch)", performance.now() - start);
    return data;
  } catch {
    logPerf("middleware maintenance (error)", performance.now() - start);
    return null;
  }
}

function withRequestHeader(req: NextRequest, key: string, value: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(key, value);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export async function middleware(req: NextRequest) {
  const mwStart = performance.now();
  try {
    return await runMiddleware(req);
  } finally {
    logPerf(`middleware ${req.nextUrl.pathname}`, performance.now() - mwStart);
  }
}

async function runMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } }
      );
    }
  }

  const maintenance = await getMaintenanceFlags(req);
  if (maintenance?.maintenanceMode && path !== "/maintenance") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isOwner = token?.role === "OWNER";
    const blocked = MAINTENANCE_BLOCKED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );

    if (blocked && !(maintenance.maintenanceAdminAccess && isOwner)) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // ----- Owner / Content Admin portal -----
  // Login page is public; already-authenticated staff leave immediately (no login form in shell).
  if (path === "/admin/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.role === "OWNER" || token?.role === "CONTENT_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
    // Mark so admin/layout never wraps login with AdminShell
    return withRequestHeader(req, "x-admin-auth-page", "1");
  }

  if (path.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (token.role !== "OWNER" && token.role !== "CONTENT_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
    if (token.role === "CONTENT_ADMIN" && !isContentAdminAllowedPath(path)) {
      return NextResponse.redirect(new URL("/admin/questions", req.url));
    }
    return NextResponse.next();
  }

  // Partner Portal — separate from student dashboard; PARTNER_ADMIN only.
  if (path.startsWith("/partner")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "PARTNER_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
  }

  if (path.startsWith("/lecturer")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "LECTURER") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/lecturer/:path*",
    "/api/auth/:path*",
    "/dashboard/:path*",
    "/register",
    "/login",
    "/pricing",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ],
};
