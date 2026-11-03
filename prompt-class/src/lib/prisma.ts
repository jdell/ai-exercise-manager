import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 client over the `@prisma/adapter-pg` driver adapter.
 *
 * The runtime uses the pooled connection (`DATABASE_URL`); the CLI uses
 * `DIRECT_URL` via `prisma.config.ts`. The pool connects lazily, so importing
 * this before the env vars are set is safe.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse the client across hot reloads in dev, otherwise every save leaks a pool.
// A running dev server keeps the old client after `prisma generate` — restart it.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
