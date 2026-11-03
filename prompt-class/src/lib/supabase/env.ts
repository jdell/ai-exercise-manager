/**
 * Supabase environment, read in one place.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and safe in the browser,
 * the server and the proxy alike. The service-role key is deliberately not
 * read here — it must never reach a client bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * False until the env vars are filled in. Auth helpers degrade rather than
 * throw, so a fresh clone still builds and the landing page still renders.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
