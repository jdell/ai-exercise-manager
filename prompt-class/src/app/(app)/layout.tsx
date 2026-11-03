import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

/**
 * The staff shell: a static frame, with the session-dependent sidebar behind
 * <Suspense> (Cache Components). The layout doesn't gate access — each page
 * checks its own session, because layouts don't re-run on every navigation.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <Suspense fallback={<Sidebar tenantName={null} userLabel={null} roleLabel={null} />}>
        <SessionSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

async function SessionSidebar() {
  const session = await getSession();
  return (
    <Sidebar
      tenantName={session?.tenant?.name ?? null}
      userLabel={session?.user?.name ?? session?.authUser.email ?? null}
      roleLabel={session?.role ? ROLE_LABELS[session.role] : null}
    />
  );
}
