"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { homePathForRole, isOwner, isContentAdmin, isPlatformStaff } from "@/lib/roles";

export type LoginStatus = "idle" | "signing-in" | "redirecting";

type UseLoginOptions = {
  adminOnly?: boolean;
};

/** Final destination after login — Owner dashboard vs Content Admin questions. */
export function getPostLoginPath(role: string | undefined, adminOnly: boolean): string | null {
  if (adminOnly) {
    if (isOwner(role)) return "/admin";
    if (isContentAdmin(role)) return "/admin/questions";
    return null;
  }
  if (!role) return "/dashboard";
  return homePathForRole(role);
}

function getRedirectMessage(path: string): string {
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (path.includes("questions")) return "Redirecting to question management...";
    return "Redirecting to owner dashboard...";
  }
  if (path === "/partner") return "Redirecting to partner portal...";
  if (path === "/lecturer") return "Redirecting to lecturer portal...";
  return "Redirecting to your dashboard...";
}

const REDIRECT_FALLBACK_MS = 8_000;

/**
 * Hard navigation — required for admin login so AdminShell / cookie timing
 * cannot leave the login view stuck. Prefer soft router.replace for students.
 */
function hardNavigate(path: string) {
  if (typeof window === "undefined") return;
  window.location.replace(path);
}

export function useLogin(options: UseLoginOptions = {}) {
  const { adminOnly = false } = options;
  const router = useRouter();
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const resetSubmission = useCallback(() => {
    submittingRef.current = false;
    setStatus("idle");
    setRedirectMessage(null);
    setRedirectTarget(null);
    clearFallback();
  }, [clearFallback]);

  useEffect(() => () => clearFallback(), [clearFallback]);

  // Fallback: if soft nav stalls, hard-navigate once.
  useEffect(() => {
    if (status !== "redirecting" || !redirectTarget) return;

    clearFallback();
    fallbackTimerRef.current = setTimeout(() => {
      hardNavigate(redirectTarget);
    }, REDIRECT_FALLBACK_MS);

    return clearFallback;
  }, [status, redirectTarget, clearFallback]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setError(null);
      setRedirectMessage(null);
      setRedirectTarget(null);
      setNeedsEmailVerification(false);
      setStatus("signing-in");

      try {
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (res?.error || !res?.ok) {
          if (res?.error === "EMAIL_NOT_VERIFIED") {
            setNeedsEmailVerification(true);
            setError("Please verify your email before logging in.");
          } else {
            setError(adminOnly ? "Invalid credentials." : "Invalid email or password.");
          }
          resetSubmission();
          return;
        }

        let session = await getSession();
        if (!session?.user?.role) {
          await new Promise((r) => setTimeout(r, 100));
          session = await getSession();
        }

        const role = session?.user?.role;
        const destination = getPostLoginPath(role, adminOnly);

        if (!destination) {
          await signOut({ redirect: false });
          setError(
            adminOnly
              ? "This account does not have admin access. Use the student login instead."
              : "Could not determine portal for this account."
          );
          resetSubmission();
          return;
        }

        if (!adminOnly && isPlatformStaff(role) && isOwner(role)) {
          // homePathForRole already sends owners to /admin
        }

        setRedirectMessage(getRedirectMessage(destination));
        setRedirectTarget(destination);
        setStatus("redirecting");

        // Admin: hard navigate (cookie + AdminShell race). Students: soft client nav.
        if (adminOnly || destination.startsWith("/admin")) {
          hardNavigate(destination);
        } else {
          router.replace(destination);
          router.refresh();
        }
      } catch {
        setError("Something went wrong. Please try again.");
        resetSubmission();
      }
    },
    [adminOnly, resetSubmission, router]
  );

  const isLoading = status === "signing-in" || status === "redirecting";

  return {
    login,
    status,
    error,
    redirectMessage,
    redirectTarget,
    isLoading,
    isRedirecting: status === "redirecting",
    needsEmailVerification,
  };
}
