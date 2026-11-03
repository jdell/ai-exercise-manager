"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, FlaskConical, LayoutDashboard, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exercises", label: "Exercises", icon: FlaskConical },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/candidates", label: "Candidates", icon: Users },
] as const;

/** The signed-in staff navigation. Data comes from the layout's session read. */
export function Sidebar({
  tenantName,
  userLabel,
  roleLabel,
}: {
  tenantName: string | null;
  userLabel: string | null;
  roleLabel: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) {
      toast.error("Couldn't sign you out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-card md:sticky md:top-0 md:h-svh md:w-60 md:border-r md:border-b-0">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        {tenantName && <p className="mt-1 truncate text-xs text-muted">{tenantName}</p>}
      </div>

      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap ${
                active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-soft hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 md:mt-auto md:block md:py-4">
        <div className="min-w-0">
          {userLabel && <p className="truncate text-sm font-medium">{userLabel}</p>}
          {roleLabel && <p className="text-xs text-muted">{roleLabel}</p>}
        </div>
        <button type="button" onClick={signOut} className="flex shrink-0 items-center gap-2 text-sm text-muted hover:text-ink md:mt-3">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </aside>
  );
}
