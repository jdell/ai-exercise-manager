@AGENTS.md

# Prompt Class

A multi-tenant SaaS for **evaluating AI-enabled engineers through exercises**.
A team (tenant) builds a library of realistic exercises — migrations,
debugging, code review, system prompts and so on — groups them into exercise
sets, invites candidates to sit a set as an assessment, records every prompt
the candidate sends alongside the code they hand in, and scores each
submission against weighted dimensions. A report rolls the scores up and is
released to the candidate when the team is ready.

Display name **Prompt Class**; repo `jdell/ai-exercise-manager`. This app
lives in `prompt-class/`. The repo root is a **separate, older app** — the
React + Vite + Firebase classroom tool, with its own `CLAUDE.md`, deployed to
Firebase Hosting by `.github/workflows/deploy.yml` on push to `main`. Nothing
here imports from it, and changes here must not touch it.

- Build plan: the Lexit Project Playbook,
  `../../lexdespacho/docs/Lexit_Project_Playbook.md`
- What's built and what's next: `ROADMAP.md` — **update it after each phase**
- First run: `SETUP.md`

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack, Cache Components, Partial Prefetching) |
| UI | React 19, Tailwind CSS v4 (`src/app/globals.css` tokens), lucide-react, sonner; Inter + JetBrains Mono |
| Language | TypeScript, strict |
| Database | Supabase Postgres |
| ORM | Prisma 7.10 with `@prisma/adapter-pg` (pinned below 8 — `latest` on npm is an 8.0 RC) |
| Auth | Supabase Auth via `@supabase/ssr` — password for staff, magic link for candidates |
| Validation | Zod 4 (`z.email()`, `{ error: "…" }`) |
| Hosting | Vercel (`lhr1`), security headers in `vercel.json` |

## Commands

Run from `prompt-class/`.

```bash
npm run dev          # dev server on :3000
npm run typecheck    # next typegen && tsc --noEmit
npm run lint         # ESLint
npm run build        # production build
npm run db:migrate   # prisma migrate dev — LOCAL DATABASES ONLY
npm run db:deploy    # prisma migrate deploy — staging and production
npm run db:generate  # regenerate the client (postinstall does this too)
npm run db:studio    # Prisma Studio
```

**Definition of done:** typecheck, lint and build pass; behaviour checked in
the running app where it can be; `ROADMAP.md` updated; committed with a
Conventional Commit message and pushed.

---

## Deployment guardrails

- **Feature branch → Vercel preview → merge to `main` → production.** Never
  push straight to `main`.
- **Never run `prisma migrate dev` against staging or production** — it can
  reset the database. Use `npm run db:deploy`.
- Staging and production are separate Supabase projects with separate env
  vars. Never point a preview deployment at the production database.
- Pushing to `main` also deploys the root Vite app to Firebase. A PR that only
  touches `prompt-class/` still triggers that workflow; it builds the old app
  and leaves this one alone.
- The Vercel project's **Root Directory must be `prompt-class`**.

---

## Next.js 16 conventions — these differ from Next 14/15

Read `node_modules/next/dist/docs/` before writing anything unfamiliar.

- **`middleware.ts` is now `proxy.ts`** (`src/proxy.ts`, exports `proxy`).
  Never create a `middleware.ts`.
- **`cookies()` and `headers()` are async**, so the server Supabase client
  is too — one per request, never a module constant.
- **`params` are Promises.** Use the generated global types
  (`PageProps<"/assess/[id]">`, `RouteContext<…>`) and `await params`. They
  come from `next typegen`, which `npm run typecheck` runs first. Route-group
  layouts take a plain `{ children: ReactNode }`.
- **Cache Components is on.** Anything that reads request data — cookies,
  the session, `searchParams`, `new Date()` — must sit behind `<Suspense>` or
  the build fails. Every signed-in page is a static shell plus an async inner
  component inside `<Suspense fallback={<PageSkeleton />}>`. Client forms read
  `window.location.search` at submit time instead of `useSearchParams()`.
- **Session reads call `connection()` first** (`getAuthUser()` in
  `src/lib/auth.ts`). Partial Prefetching can prerender with cookies present,
  and Supabase's token-expiry check then reads the clock. Keep that call.

## Prisma 7 conventions

- **The connection URL lives in `prisma.config.ts`, not the schema**, so
  `prisma generate` runs without a database (CI, Vercel).
- The CLI uses `DIRECT_URL` (session pooler, 5432); the runtime uses the
  pooled `DATABASE_URL` (6543) through `PrismaPg` in `src/lib/prisma.ts`.
- **`prisma migrate dev` does not regenerate the client** in every case —
  run `npm run db:generate`, then **restart `npm run dev`**: the client is
  cached on `globalThis`, so a running server keeps the old one and fails
  with "Unknown argument" on new columns.
- Generated client: `src/generated/prisma/` (gitignored). Import from
  `@/generated/prisma/client`; import enums as types from
  `@/generated/prisma/enums`.
- Tables and columns are snake_case via `@@map` / `@map`
  (`exercises.tenant_id`).
- Migrations live in `prisma/migrations/`. `0_init` was generated with
  `prisma migrate diff --from-empty` and checked against a clean Postgres 17.

---

## Architecture

```
src/
  proxy.ts                 Session refresh + redirects for PROTECTED_PREFIXES
  app/
    page.tsx               Landing (static)
    login/                 Password sign-in + magic link (client form)
    auth/callback/         Exchanges a magic-link code for a session
    (app)/                 Staff shell: sidebar + pages
      layout.tsx           Static frame; sidebar reads the session behind <Suspense>
      dashboard/           Counts by area and assessment status
      exercises/           Library list
      exercises/new/       Form → server action (zod) → create in the active tenant
      assessments/         Candidate × exercise set, with status and score
      candidates/          Tenant members with the CANDIDATE role
    (candidate)/           Candidate shell: no navigation
      assess/[id]/         One assessment, scoped to the signed-in candidate
  components/
    sidebar.tsx            Staff navigation, tenant, sign-out (client)
    ui.tsx                 PageHeader, Panel, EmptyState, NoAccess, Badge, PageSkeleton, Th/Td
  lib/
    auth.ts                getAuthUser(), getSession(), requireStaffSession(), isStaff()
    constants.ts           Labels, roles, routes, default scoring dimensions
    prisma.ts              Prisma client (server-only)
    supabase/              server.ts, client.ts, env.ts
    validations/           Zod schemas
prisma/schema.prisma       The data model
```

### The data model

- **Tenant** — a workspace (`slug` unique, `plan` FREE/PRO/PREMIUM).
- **User** — one per person across all tenants. `authId` is the Supabase
  `auth.users` id and is **nullable**: a candidate invited by email exists
  before they ever sign in. `findOrLinkUser()` claims the row on first
  sign-in by matching the confirmed email.
- **TenantMembership** — `(userId, tenantId)` with a role: ADMIN, TEACHER,
  CANDIDATE. A person can be a teacher in one tenant and a candidate in
  another.
- **Exercise** — tenant-owned. `sourceFiles` (`[{ path, content }]`),
  `scoringDimensions` (`[{ key, label, weight }]`) and `allowedTools` shape
  what a candidate gets and what a scorer marks. `isTemplate` plus
  `parentTemplateId` let a team fork a template.
- **ExerciseSet** + **ExerciseSetItem** — an ordered list (`position`).
- **Assessment** — one candidate sitting one set. Status only moves forward:
  INVITED → IN_PROGRESS → SUBMITTED → SCORED.
- **Submission** — one per assessment × exercise: the final code, the full
  `promptHistory` (`[{ at, tool, prompt, response }]`) and time spent.
- **Score** — one scorer's mark on one dimension. `scoredById` is null for
  an automated score.
- **Report** — composite score and summary; hidden from the candidate until
  `releasedAt` is set.

### Authorisation

**The proxy is not the authorisation boundary.** It only redirects.

- **Staff pages** call `requireStaffSession(path)`: signed out → `/login`,
  otherwise either `{ ok: true, user, tenant, role }` or a reason the page
  renders with `<NoAccess>`.
- **Server actions re-check the session** and take the tenant from it,
  never from form data.
- **Tenant isolation in code:** every query on a tenant-scoped table filters
  by `session.tenant.id`. Another tenant's row must look exactly like a
  missing one — 404, never 403.
- **Candidates** see only assessments where `candidateId` is their own
  user id, and the candidate queries never select rubric notes or scores.
- **Active tenant:** the `pc-tenant` cookie, honoured only when the user is a
  member of that tenant; otherwise the first membership.
- RLS is **not set up yet** (see `ROADMAP.md`). Until it is, nothing may
  query these tables through the Supabase client with the anon key.

---

## Design system

Tokens are CSS variables on `:root` in `globals.css`, flipped for dark mode
under `prefers-color-scheme`. Use the token utilities — `bg-bg`, `bg-card`,
`text-ink`, `text-muted`, `border-line`, `bg-soft`, `bg-accent`,
`text-accent-ink`, `bg-accent-soft`, `text-ok`, `text-warn` — **never raw
Tailwind greys or `dark:` colour variants**.

Component classes: `.btn-primary`, `.btn-outline`, `.field`, `.label` (11px
mono uppercase metadata). Tailwind v4's `@apply` can't reference another
custom class, so the button base is a grouped selector — add new variants to
it. Reuse `components/ui.tsx` rather than hand-rolling panels, empty states
or skeletons.

## Writing conventions

British English, sentence-case headings, logical punctuation, single quotes
in prose, spaced en dashes for asides, numbers under 10 in words in running
text, dates as "3 November 2026" (`formatDate()` in `components/ui.tsx`).
