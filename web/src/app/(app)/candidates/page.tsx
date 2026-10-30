import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Candidates" };

export default async function CandidatesPage() {
  const { tenant } = await requireStaff();
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: tenant.id, role: "CANDIDATE" },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: {
          _count: { select: { assessmentsTaken: { where: { tenantId: tenant.id } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Candidates" description="People who have been invited to take an assessment." />

      {memberships.length === 0 ? (
        <EmptyState>No candidates yet.</EmptyState>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {memberships.map(({ user }) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{user.fullName ?? user.email}</p>
                {user.fullName && <p className="text-sm text-zinc-500">{user.email}</p>}
              </div>
              <span className="text-sm text-zinc-500">
                {user._count.assessmentsTaken}{" "}
                {user._count.assessmentsTaken === 1 ? "assessment" : "assessments"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
