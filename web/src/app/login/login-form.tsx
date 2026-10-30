"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.email("Enter a valid email address.");

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setPending(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setPending(false);

    if (error) return toast.error(error.message);
    router.replace(redirectTo);
    router.refresh();
  }

  async function sendMagicLink() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setPending(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectTo);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      // Accounts are provisioned by invitation; a sign-in link must not create one.
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: false },
    });
    setPending(false);

    if (error) return toast.error(error.message);
    toast.success("Check your inbox — we've sent you a sign-in link.");
  }

  return (
    <form onSubmit={signInWithPassword} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !password}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={sendMagicLink}
        disabled={pending}
        className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Email me a sign-in link
      </button>
    </form>
  );
}
