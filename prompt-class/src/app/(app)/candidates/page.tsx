import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, NoAccess, PageHeader, PageSkeleton, Panel, Td, Th, formatDate } from "@/components/ui";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Candidates />
    </Suspense>
  );
}

async function Candidates() {
  const session = await requireStaffSession("/candidates");
  if (!session.ok) return <NoAccess reason={session.reason} />;
  const tenantId = session.tenant.id;

  const members = await prisma.tenantMembership.findMany({
    where: { tenantId, role: "CANDIDATE" },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          authId: true,
          // Count only this tenant's assessments — a candidate may sit with several.
          _count: { select: { assessments: { where: { tenantId } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Candidates" description="People you've invited to sit an assessment." />
      {members.length === 0 ? (
        <EmptyState title="No candidates yet" body="Candidates appear here once you invite them to an assessment." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Signed in</Th>
                <Th>Added</Th>
                <Th className="text-right">Assessments</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map(({ userId, user, createdAt }) => (
                <tr key={userId}>
                  <Td className="font-medium">{user.name ?? "–"}</Td>
                  <Td className="text-muted">{user.email}</Td>
                  <Td>{user.authId ? "Yes" : "Not yet"}</Td>
                  <Td>{formatDate(createdAt)}</Td>
                  <Td className="text-right tabular-nums">{user._count.assessments}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
