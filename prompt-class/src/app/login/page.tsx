import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-[15px] font-semibold tracking-tight">
        {APP_NAME}
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-6">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Teachers and admins use their password. Candidates can ask for a sign-in link.</p>
        <LoginForm />
      </div>
    </main>
  );
}
