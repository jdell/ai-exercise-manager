# Prompt Class

A multi-tenant platform for assessing how engineers work with AI. Teams build a library of
realistic exercises, invite candidates, record every prompt they write and score their work
against a rubric — then review and override the score before issuing a report.

Lives in `web/` of the ai-exercise-manager repo; the Vite + Firebase classroom app at the repo
root is unaffected. Run every command from this directory.

**Stack:** Next.js 16 · TypeScript · Tailwind v4 · Supabase Auth · Prisma 7 + Postgres · Vercel

## Getting started

```bash
cd web
cp .env.example .env.local   # Next.js
cp .env.example .env         # Prisma CLI
# fill in the Supabase and database values in both

npm install                  # also runs `prisma generate`
npm run db:push              # create the tables (point DIRECT_URL at a dev/staging database)
npm run dev
```

Open <http://localhost:3000>. To sign in to the staff area you need a Supabase auth user, a
matching row in `users` (same `id`) and a `tenant_memberships` row with role `ADMIN` or `TEACHER`.

## Structure

```
prisma/schema.prisma         Tenant, User, TenantMembership, Exercise, ExerciseSet(+Item),
                             Assessment, Submission, Score, Report
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
