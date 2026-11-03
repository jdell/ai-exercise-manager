import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { HOME_ROUTE, PROTECTED_PREFIXES } from "@/lib/constants";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. Two jobs:
 *   1. Refresh the Supabase session cookies so Server Components downstream
 *      always see a valid token.
 *   2. Optimistic routing — signed-out visitors off protected routes,
 *      signed-in ones off /login.
 *
 * This is a redirect convenience, not the authorisation boundary. Every page,
 * action and route handler checks the session and the tenant itself.
 */
export async function proxy(request: NextRequest) {
  // A fresh clone without Supabase env vars still serves the public pages.
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Nothing between createServerClient and getClaims(): it's what refreshes
  // an expired session. getClaims() verifies the JWT, unlike getSession().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && isProtected(pathname)) {
    return redirectWithCookies(request, response, "/login", pathname);
  }
  if (signedIn && pathname === "/login") {
    return redirectWithCookies(request, response, HOME_ROUTE);
  }
  return response;
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** A redirect that keeps any session cookies the refresh just set. */
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  to: string,
  next?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = next ? `?next=${encodeURIComponent(next)}` : "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Everything except static assets and image optimisation.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
