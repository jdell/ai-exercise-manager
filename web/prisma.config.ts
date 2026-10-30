import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load the same files Next.js does, so `prisma db push` and `npm run dev` hit
// the same database. The first file to define a variable wins.
config({ path: [".env.local", ".env"], quiet: true });

// The datasource URL lives here rather than in schema.prisma so that
// `prisma generate` works without a database connection (CI, Vercel builds).
// DIRECT_URL bypasses the transaction pooler, which hosted Supabase needs for
// schema changes; locally both URLs point at the same container. The app
// runtime connects through DATABASE_URL in src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
