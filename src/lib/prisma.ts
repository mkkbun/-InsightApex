import { PrismaClient } from "@prisma/client";
import { isPerfTimingEnabled, logPerf } from "@/lib/perf-timing";

// Prevent multiple Prisma Client instances in dev (Next.js hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const queryTiming = isPerfTimingEnabled();
  const client = new PrismaClient({
    log: queryTiming
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  if (queryTiming) {
    client.$on("query", (e) => {
      const sql = e.query.replace(/\s+/g, " ").slice(0, 90);
      logPerf(`prisma.query`, e.duration, sql);
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
