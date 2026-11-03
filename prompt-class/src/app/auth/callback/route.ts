import { NextResponse } from "next/server";
import { HOME_ROUTE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a sign-in link lands. Exchanges the PKCE code for a session cookie,
 * then forwards to `next` — same-site paths only, so the link can't be used
 * as an open redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : HOME_ROUTE;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
