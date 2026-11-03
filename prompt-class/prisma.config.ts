import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Match Next.js precedence: .env.local wins over .env. dotenv does not
// override keys that are already set, so order in this array is priority.
config({ path: [".env.local", ".env"], quiet: true });

/**
 * Prisma 7 configuration. The connection URL lives here, not in the schema.
 *
 * The CLI (`migrate`, `studio`) prefers `DIRECT_URL` — migrations can't run
 * through pgBouncer's transaction mode. The app connects with the pooled
 * `DATABASE_URL` through `@prisma/adapter-pg` (`src/lib/prisma.ts`).
 * `prisma generate` needs neither, so CI builds without a database.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
