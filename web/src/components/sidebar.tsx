"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Users,
  type LucideIcon,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exercises", label: "Exercises", icon: LibraryBig },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/candidates", label: "Candidates", icon: Users },
];

export function Sidebar({ tenantName, userEmail }: { tenantName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-zinc-950 text-zinc-100 md:h-screen md:w-60 md:border-r md:border-b-0">
      <div className="px-5 py-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <p className="truncate text-xs text-zinc-400">{tenantName}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-zinc-800 px-5 py-4 md:block">
        <p className="truncate text-xs text-zinc-400">{userEmail}</p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-2 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
