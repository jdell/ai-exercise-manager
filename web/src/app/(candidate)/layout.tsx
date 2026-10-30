import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

// Reads the Supabase session on every request, so it cannot be prerendered.
// Blocking is fine for now; stream behind <Suspense> once the UI settles.
export const instant = false;

export default function CandidateLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 px-4 py-4 sm:px-8 dark:border-zinc-800">
        <Link href="/" className="font-semibold tracking-tight">
          {APP_NAME}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
