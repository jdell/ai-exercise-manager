import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Role } from "@/generated/prisma/enums";
import { STAFF_ROLES, TENANT_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in Supabase user, verified against the Auth server, or null.
 *
 * Reads cookies, so under Cache Components any component calling this must
 * sit behind <Suspense>. Route handlers and server actions can call it freely.
 */
export async function getAuthUser() {
  // Request time only. With Partial Prefetching, Next may prerender with
  // cookies available, and Supabase's token-expiry check reads the clock —
  // a "Date.now() while prerendering" error. A session is never prerenderable.
  await connection();
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * The signed-in person, their memberships and the tenant they're working in.
 *
 * - `null` — signed out.
 * - `{ user: null }` — signed in to Supabase but with no Prompt Class user
 *   (tenant provisioning isn't built yet; see ROADMAP.md).
 * - `{ tenant: null }` — a user with no memberships.
 *
 * The active tenant is the one in the `pc-tenant` cookie when the user is a
 * member of it, otherwise their first membership. A cookie naming a tenant
 * they don't belong to is ignored, never trusted.
 */
export async function getSession() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const user = await findOrLinkUser(authUser.id, authUser.email);
  if (!user) return { authUser, user: null, tenant: null, role: null };

  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: user.id },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  const preferred = (await cookies()).get(TENANT_COOKIE)?.value;
  const active = memberships.find((m) => m.tenantId === preferred) ?? memberships[0];

  return {
    authUser,
    user,
    memberships,
    tenant: active?.tenant ?? null,
    role: active?.role ?? null,
  };
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** Staff can author exercises and run assessments; candidates can't. */
export function isStaff(role: Role | null): role is Role {
  return role !== null && STAFF_ROLES.includes(role);
}

/**
 * The session a staff page needs, or why it can't have one. Signed-out
 * visitors are redirected to /login; everyone else gets a reason the page
 * renders with `<NoAccess>`.
 */
export async function requireStaffSession(next: string) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!session.user) return { ok: false, reason: "no-user" } as const;
  if (!session.tenant) return { ok: false, reason: "no-tenant" } as const;
  if (!isStaff(session.role)) return { ok: false, reason: "not-staff" } as const;
  return {
    ok: true,
    user: session.user,
    tenant: session.tenant,
    role: session.role,
  } as const;
}

/**
 * The user row for a Supabase account. A candidate is invited by email, so
 * their row exists before their auth account does: on first sign-in, claim
 * the unlinked row with the same address. Supabase only issues a session
 * once the address is confirmed, which is what makes the email match safe.
 */
async function findOrLinkUser(authId: string, email: string | undefined) {
  const linked = await prisma.user.findUnique({ where: { authId } });
  if (linked || !email) return linked;

  const claimed = await prisma.user.updateMany({
    where: { email: email.toLowerCase(), authId: null },
    data: { authId },
  });
  return claimed.count > 0 ? prisma.user.findUnique({ where: { authId } }) : null;
}
