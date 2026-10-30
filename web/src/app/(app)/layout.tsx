import { Sidebar } from "@/components/sidebar";
import { requireStaff } from "@/lib/auth";

// Reads the Supabase session on every request, so it cannot be prerendered.
// Blocking is fine for now; stream behind <Suspense> once the UI settles.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, tenant } = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar tenantName={tenant.name} userEmail={user.email} />
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
