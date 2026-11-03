"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { HOME_ROUTE } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.email({ error: "Enter a valid email address." });

/**
 * Only same-site paths are honoured as `?next=`, so a crafted link can't
 * bounce someone to another site after they sign in.
 */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : HOME_ROUTE;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"password" | "link" | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  function checkEmail() {
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) toast.error(parsed.error.issues[0].message);
    return parsed.success ? parsed.data.toLowerCase() : null;
  }

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    const address = checkEmail();
    if (!address) return;
    if (!password) return toast.error("Enter your password.");
    setPending("password");
    const { error } = await createClient().auth.signInWithPassword({ email: address, password });
    setPending(null);
    if (error) return toast.error("That email and password don't match.");
    router.replace(nextPath());
    router.refresh();
  }

  async function sendLink() {
    const address = checkEmail();
    if (!address) return;
    setPending("link");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", nextPath());
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      // Candidates are invited, never self-registered.
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: false },
    });
    setPending(null);
    if (error) return toast.error("We couldn't send a link to that address. Check it's the one you were invited with.");
    setLinkSent(true);
  }

  if (!isSupabaseConfigured) {
    return (
      <p className="mt-5 rounded-md bg-soft px-3 py-2.5 text-sm text-muted">
        Sign-in isn&apos;t configured. Set the Supabase variables in <code className="font-mono">.env.local</code> — see SETUP.md.
      </p>
    );
  }

  if (linkSent) {
    return (
      <p role="status" className="mt-5 rounded-md bg-accent-soft px-3 py-2.5 text-sm text-ink">
        Check your inbox: we&apos;ve sent a sign-in link to <span className="font-medium">{email.trim()}</span>.
      </p>
    );
  }

  return (
    <form onSubmit={signInWithPassword} className="mt-5 flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email</span>
        <input type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Password</span>
        <input type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" className="btn-primary" disabled={pending !== null}>
        {pending === "password" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Sign in
      </button>
      <button type="button" className="btn-outline" onClick={sendLink} disabled={pending !== null}>
        {pending === "link" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Email me a sign-in link
      </button>
    </form>
  );
}
