import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Next.js 16: `cookies()` is async, so this is too — create a client per
 * request and never hoist the result to a module constant. With Cache
 * Components on, any component that calls this must sit behind <Suspense>.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: `src/proxy.ts` refreshes the session on every
          // request, so the cookie is rewritten there instead.
        }
      },
    },
  });
}
