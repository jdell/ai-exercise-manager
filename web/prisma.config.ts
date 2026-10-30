import "dotenv/config";
import { defineConfig } from "prisma/config";

// The datasource URL lives here rather than in schema.prisma so that
// `prisma generate` works without a database connection (CI, Vercel builds).
// DIRECT_URL is the session pooler (port 5432) and is used for migrations;
// the app runtime connects through DATABASE_URL in src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
