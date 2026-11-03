import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";

/**
 * The candidate shell: no navigation, nothing from the staff side. A
 * candidate sees the assessment they were invited to and nothing else.
 */
export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</main>
    </div>
  );
}
