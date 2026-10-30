@AGENTS.md

# Prompt Class — Agent Guide

Multi-tenant platform for assessing how engineers work with AI. Teams build a library of
exercises (migration, debugging, code review, system prompts, …), group them into sets, invite
candidates, record every prompt a candidate writes, and score submissions against a rubric.

This app lives in `web/` of the ai-exercise-manager repo, beside the original Vite + Firebase
classroom app at the repo root. The two share nothing at runtime: separate `package.json`,
separate auth (Supabase here, Firebase there), separate database. Run every command below from
`web/`.

Stack: Next.js 16 (App Router, `src/`), Tailwind v4, Supabase Auth, Prisma 7 on Supabase Postgres,
zod, sonner, lucide-react. Hosted on Vercel.

## Conventions

- **British English** in all UI copy, docs, comments and commit messages ("organisation",
  "programme", "behaviour"). Dates via `Intl.DateTimeFormat("en-GB", …)`.
- **Conventional commits** (`feat:`, `fix:`, `docs:`, `chore:` …).
- Labels for enums live in `src/lib/constants.ts` — never render a raw enum value.
- Validate every server action input with zod before it reaches Prisma.

## Next.js 16 — read before writing routing code

- `middleware.ts` is now **`src/proxy.ts`** (export `proxy`).
- `params` and `searchParams` are **Promises**; `cookies()` is async.
- **Cache Components is on.** Reading cookies/the session outside `<Suspense>` fails the build.
  Session-reading segments currently opt out with `export const instant = false`; move them to
  streaming behind `<Suspense>` when the UI settles. See
  `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- Route types (`PageProps<"/route">`, `LayoutProps`) are generated: run `npx next typegen` if
  `tsc` complains about a new route.

## Multi-tenancy & auth

- `User.id` equals the Supabase `auth.users.id`. Users join tenants via `TenantMembership`
  with a role of `ADMIN`, `TEACHER` or `CANDIDATE`.
- Every tenant-owned query **must** filter by `tenantId` from `requireStaff()` (`src/lib/auth.ts`).
  Never take a tenant ID from the client.
- `(app)/*` is the staff area (`ADMIN`/`TEACHER`), guarded by `requireStaff()` in its layout.
  `(candidate)/assess/[id]` is guarded by `requireCandidateAssessment()`, which only returns an
  assessment owned by the signed-in candidate.
- **Every protected route prefix must be listed in `PROTECTED_PREFIXES`** (`src/lib/constants.ts`).
  A new page that isn't listed is publicly reachable at the proxy layer.
- RLS must be enabled on every table before production (see Roadmap below).

## Environments

| Environment | Branch | Supabase |
|---|---|---|
| Production | `main` | production project |
| Staging/Preview | any other branch | staging project |

Vercel routes env vars by target: `production` vars go to `main` deploys; `preview` vars
(staging credentials) go to every other branch deploy.

## Deployment workflow

**Never push untested code directly to `main`.**

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Push to GitHub — Vercel creates a preview deployment with staging credentials
3. Test on the preview URL
4. Merge to `main` — production deploys automatically

## Database changes

**Always apply changes to staging before production.**

1. Point `DIRECT_URL` at staging and run `npm run db:push`
2. For SQL that Prisma can't express (RLS, functions, triggers): add a file to
   `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`
3. Apply the same SQL to production only after staging is verified
4. Never run `prisma migrate dev` against staging or production — it can reset the database

Prisma 7 notes: the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`, so
`prisma generate` works without a database. The client is generated into `src/generated/prisma`
(gitignored, rebuilt on `postinstall`) and connects through `@prisma/adapter-pg`.

## Key commands

```bash
npm run dev            # local development
npm run build          # verify the build passes before pushing
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run db:generate    # regenerate the Prisma client
npm run db:push        # sync the Prisma schema (uses DIRECT_URL)
```

## Roadmap (next steps)

- [ ] RLS policies on all tables (staging, then production)
- [ ] Invite flow: create candidate `User` + membership + `Assessment`, send Supabase invite
- [ ] Exercise sets UI (create, reorder via `ExerciseSetItem.position`)
- [ ] Candidate workspace: AI chat that appends to `Submission.promptHistory`
- [ ] Automated scoring (Claude) → `Score`, teacher override, `Report` generation
- [ ] Tenant switcher for users with several staff memberships
