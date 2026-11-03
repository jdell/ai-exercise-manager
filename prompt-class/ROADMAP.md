# Roadmap

Phases follow the Lexit Project Playbook
(`lexdespacho/docs/Lexit_Project_Playbook.md`).

## Shipped

### Phase 0 – scaffold (3 November 2026)

- [x] Next.js 16.4 app in `prompt-class/`, alongside the existing Vite app
- [x] Prisma 7 schema: tenants, users, memberships, exercises, exercise sets,
      assessments, submissions, scores, reports; `0_init` migration
- [x] Supabase Auth: password sign-in, magic-link sign-in, callback route
- [x] `proxy.ts` session refresh and redirects for protected routes
- [x] Staff shell with sidebar; dashboard, exercises, assessments, candidates
- [x] New exercise form with server-side validation
- [x] Candidate shell and assessment overview
- [x] Light and dark tokens; Vercel security headers

## Next

### Phase 1 – tenancy and people

- [ ] Self-service sign-up that provisions a tenant and its first ADMIN
- [ ] Invite teachers and candidates by email (needs the service-role key)
- [ ] Tenant switcher for people in more than one workspace
- [ ] **RLS on every table** – before anything queries through the anon key

### Phase 2 – exercises and sets

- [ ] Exercise detail and edit: source files, scoring dimensions, weights
- [ ] Template library and "start from template"
- [ ] Exercise sets: create, order, attach exercises

### Phase 3 – the candidate workspace

- [ ] Timed workspace: brief, source files, editor
- [ ] Prompt capture into `promptHistory`
- [ ] Submit, and move the assessment through its statuses

### Phase 4 – scoring and reports

- [ ] Scoring screen per submission and dimension
- [ ] Composite score from weighted dimensions
- [ ] Report release to the candidate

### Later

- [ ] Stripe billing (Free / Pro / Premium) with plan gating
- [ ] AI-assisted first-pass scoring, marked as automated (`scoredById` null)
- [ ] Staging environment, auto-versioning, onboarding tour, analytics
