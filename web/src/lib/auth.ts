import { cache } from "react";
import { redirect } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/** The signed-in Supabase user, or null. Cached per request. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The signed-in user with their tenant memberships. Redirects to /login when
 * there is no session. Cached per request.
 */
export const requireUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { memberships: { include: { tenant: true } } },
  });
  if (!user) redirect("/login?error=no-account");

  return user;
});

/**
 * The active membership for the staff area. Until tenant switching exists,
 * the first staff membership is the active one.
 */
export async function requireStaff(allowed: readonly MembershipRole[] = STAFF_ROLES) {
  const user = await requireUser();
  const membership = user.memberships.find((m) => allowed.includes(m.role));
  if (!membership) redirect("/login?error=forbidden");

  return { user, membership, tenant: membership.tenant };
}

/** Loads an assessment only if it belongs to the signed-in candidate. */
export async function requireCandidateAssessment(assessmentId: string) {
  const user = await requireUser();
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, candidateId: user.id },
    include: {
      exerciseSet: {
        include: {
          items: { orderBy: { position: "asc" }, include: { exercise: true } },
        },
      },
    },
  });
  if (!assessment) redirect("/login?error=forbidden");

  return { user, assessment };
}
