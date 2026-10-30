// Seeds the LOCAL Supabase stack with a tenant, a teacher, a candidate, one
// exercise set and an invited assessment, so every screen has something to show.
// Run after `npm run db:start` and `npm run db:push`. Safe to re-run.
//
// The passwords below are local test values only; the script refuses to run
// against anything but localhost.
import { config } from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

config({ path: [".env.local", ".env"], quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

const isLocal = (url) => ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  throw new Error("Missing Supabase or database settings — copy .env.example to .env.local first.");
}
if (!isLocal(supabaseUrl) || !isLocal(databaseUrl)) {
  throw new Error("Refusing to seed: Supabase and the database must both be on localhost.");
}

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const EXERCISE_ID = "00000000-0000-4000-8000-000000000002";
const SET_ID = "00000000-0000-4000-8000-000000000003";
const ASSESSMENT_ID = "00000000-0000-4000-8000-000000000004";

const PEOPLE = [
  { email: "teacher@example.test", password: "local-test-pass", fullName: "Tess Teacher", role: "TEACHER" },
  { email: "candidate@example.test", password: "local-test-pass", fullName: "Cara Candidate", role: "CANDIDATE" },
];

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

/** Returns the auth user's id, creating the user if it does not exist yet. */
async function ensureAuthUser({ email, password }) {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (data.user) return data.user.id;
  if (error?.code !== "email_exists") throw error;

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  return list.users.find((u) => u.email === email).id;
}

const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();

try {
  await db.query("begin");
  await db.query(
    `insert into tenants (id, name, slug, updated_at) values ($1, 'Acme Engineering', 'acme', now())
     on conflict (id) do nothing`,
    [TENANT_ID]
  );

  const ids = {};
  for (const person of PEOPLE) {
    const id = await ensureAuthUser(person);
    ids[person.role] = id;
    await db.query(
      `insert into users (id, email, full_name, updated_at) values ($1, $2, $3, now())
       on conflict (id) do nothing`,
      [id, person.email, person.fullName]
    );
    await db.query(
      `insert into tenant_memberships (id, tenant_id, user_id, role) values (gen_random_uuid(), $1, $2, $3)
       on conflict (tenant_id, user_id) do nothing`,
      [TENANT_ID, id, person.role]
    );
  }

  await db.query(
    `insert into exercises (id, tenant_id, created_by_id, title, brief, type, difficulty, time_limit_minutes, is_published, updated_at)
     values ($1, $2, $3, 'Fix the flaky retry',
       'A payment worker occasionally charges a customer twice. Use an AI assistant to find out why the retry loop is not idempotent and propose a fix.',
       'DEBUGGING', 'MID', 45, true, now())
     on conflict (id) do nothing`,
    [EXERCISE_ID, TENANT_ID, ids.TEACHER]
  );
  await db.query(
    `insert into exercise_sets (id, tenant_id, name, description, updated_at)
     values ($1, $2, 'Backend screen', 'A short screen for mid-level backend engineers.', now())
     on conflict (id) do nothing`,
    [SET_ID, TENANT_ID]
  );
  await db.query(
    `insert into exercise_set_items (exercise_set_id, exercise_id, position) values ($1, $2, 1)
     on conflict do nothing`,
    [SET_ID, EXERCISE_ID]
  );
  await db.query(
    `insert into assessments (id, tenant_id, exercise_set_id, candidate_id, invited_by_id, status)
     values ($1, $2, $3, $4, $5, 'INVITED')
     on conflict (id) do nothing`,
    [ASSESSMENT_ID, TENANT_ID, SET_ID, ids.CANDIDATE, ids.TEACHER]
  );
  await db.query("commit");
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  await db.end();
}

console.log(`Seeded the local database.
  Staff:     teacher@example.test   → http://localhost:3000/dashboard
  Candidate: candidate@example.test → http://localhost:3000/assess/${ASSESSMENT_ID}
  Password for both: see PEOPLE in scripts/seed-local.mjs`);
