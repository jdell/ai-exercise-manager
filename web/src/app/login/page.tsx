import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  "no-account": "You're signed in, but no Prompt Class account is linked to this email. Ask your administrator for an invitation.",
  forbidden: "Your account doesn't have access to that page.",
  "auth-callback": "That sign-in link is invalid or has expired. Please request a new one.",
};

/** Only same-origin paths are accepted, so the redirect can't be used to send users elsewhere. */
function safeRedirect(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

// Reads the Supabase session on every request, so it cannot be prerendered.
// Blocking is fine for now; stream behind <Suspense> once the UI settles.
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>

        {error && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p>{error}</p>
            <form action="/auth/signout" method="post" className="mt-2">
              <button type="submit" className="font-medium underline">
                Sign out
              </button>
            </form>
          </div>
        )}

        <LoginForm redirectTo={safeRedirect(params.redirectTo)} />
      </div>
    </main>
  );
}
