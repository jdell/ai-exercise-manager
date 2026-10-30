# Prompt Class

A multi-tenant platform for assessing how engineers work with AI. Teams build a library of
realistic exercises, invite candidates, record every prompt they write and score their work
against a rubric — then review and override the score before issuing a report.

Lives in `web/` of the ai-exercise-manager repo; the Vite + Firebase classroom app at the repo
root is unaffected. Run every command from this directory.

**Stack:** Next.js 16 · TypeScript · Tailwind v4 · Supabase Auth · Prisma 7 + Postgres · Vercel

## Getting started

Needs Node 22 and Docker (for local Supabase).

```bash
cd web
npm install                  # also runs `prisma generate`
cp .env.example .env.local   # local Supabase values are already filled in
npm run db:start             # local Supabase in Docker
npm run db:push              # create the tables
npm run db:seed              # optional test data
npm run dev
```

Open <http://localhost:3000> and sign in as `teacher@example.test` (staff area) or
`candidate@example.test` (the assessment link printed by `db:seed`). The test password is in
`scripts/seed-local.mjs`. See [CLAUDE.md](CLAUDE.md#local-development) for local URLs and caveats.

## Structure

```
prisma/schema.prisma         Tenant, User, TenantMembership, Exercise, ExerciseSet(+Item),
                             Assessment, Submission, Score, Report
supabase/config.toml         Local Supabase stack (Supabase CLI)
scripts/seed-local.mjs       Local test data
src/proxy.ts                 Session refresh + redirect for protected routes
src/lib/
  auth.ts                    requireUser / requireStaff / requireCandidateAssessment
  constants.ts               Enum labels, protected route prefixes
  prisma.ts                  Prisma client (pg adapter)
  supabase/{server,client}.ts
src/app/
  page.tsx                   Landing page
  login/                     Password + magic-link sign-in
  auth/{callback,signout}/   Supabase auth routes
  (app)/                     Staff area: dashboard, exercises, assessments, candidates
  (candidate)/assess/[id]/   Candidate assessment view
src/components/sidebar.tsx   Staff navigation
```

See [CLAUDE.md](CLAUDE.md) for conventions, the deployment workflow and the roadmap.
