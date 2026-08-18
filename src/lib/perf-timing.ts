/**
 * TEMPORARY performance instrumentation — remove after the navigation
 * bottleneck investigation. Enable with PERF_TIMING=1; disable with PERF_TIMING=0.
 * Defaults on in development, off in production.
 *
 * Search for `[perf]` / `logPerf` / `timedRoute` to strip.
 */

export function isPerfTimingEnabled(): boolean {
  if (process.env.PERF_TIMING === "0") return false;
  if (process.env.PERF_TIMING === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function logPerf(label: string, ms: number, extra?: string): void {
  if (!isPerfTimingEnabled()) return;
  const padded = ms.toFixed(1).padStart(8);
  const suffix = extra ? `  ${extra}` : "";
  console.log(`[perf] ${padded}ms  ${label}${suffix}`);
}

export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    logPerf(label, performance.now() - start);
  }
}

export function timedRoute<A extends unknown[], R>(
  name: string,
  handler: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const start = performance.now();
    try {
      return await handler(...args);
    } finally {
      logPerf(name, performance.now() - start);
    }
  };
}
