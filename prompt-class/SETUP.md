# Setup

Everything runs from `prompt-class/`.

## 1. Install

```bash
npm install            # postinstall runs prisma generate
cp .env.example .env.local
```

## 2. Supabase project

1. Create a project at supabase.com, in the London region (`eu-west-2`).
2. **Project settings → API**: copy the URL and the anon key into
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **Project settings → Database → Connection string**:
   - Transaction pooler (port 6543) → `DATABASE_URL`, with
     `?pgbouncer=true` on the end.
   - Session pooler (port 5432) → `DIRECT_URL`. Don't use
     `db.<ref>.supabase.co` – it's IPv6-only.
4. **Authentication → URL configuration**:
   - Site URL: `http://localhost:3000` (production URL later).
   - Redirect URLs: `http://localhost:3000/auth/callback**`. The `**`
     matters – the callback carries a `?next=` path.

Keep staging and production as **separate** Supabase projects.

## 3. Database

```bash
npm run db:deploy      # applies prisma/migrations to DIRECT_URL
```

On a local throwaway database, `npm run db:migrate` is fine. **Never** run
it against staging or production.

## 4. First tenant and staff user

Self-service sign-up and tenant provisioning aren't built yet
(`ROADMAP.md`). Until they are:

1. **Authentication → Users → Add user**: create yourself with a password
   and tick "Auto confirm".
2. Run this in the SQL editor, with your own values:

```sql
insert into tenants (id, name, slug, plan)
values ('tenant_demo', 'Demo workspace', 'demo', 'FREE');

insert into users (id, email, name, auth_id)
values ('user_me', 'you@example.com', 'Your name',
        (select id::text from auth.users where email = 'you@example.com'));

insert into tenant_memberships (user_id, tenant_id, role)
values ('user_me', 'tenant_demo', 'ADMIN');
```

Then `npm run dev` and sign in at `/login`.

## 5. Vercel

- Import `jdell/ai-exercise-manager` and set the **Root Directory** to
  `prompt-class`.
- Add every variable from `.env.example` with that environment's values.
- Add the deployment's `/auth/callback**` to Supabase's redirect URLs.
