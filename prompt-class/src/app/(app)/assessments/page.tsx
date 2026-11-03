import type { Metadata } from "next";
import { Suspense } from "react";
import type { AssessmentStatus } from "@/generated/prisma/enums";
import { Badge, EmptyState, NoAccess, PageHeader, PageSkeleton, Panel, Td, Th, formatDate } from "@/components/ui";
import { requireStaffSession } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Assessments" };

const STATUS_TONE: Record<AssessmentStatus, "neutral" | "accent" | "warn" | "ok"> = {
  INVITED: "neutral",
  IN_PROGRESS: "accent",
  SUBMITTED: "warn",
  SCORED: "ok",
};

export default function AssessmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Assessments />
    </Suspense>
  );
}

async function Assessments() {
  const session = await requireStaffSession("/assessments");
  if (!session.ok) return <NoAccess reason={session.reason} />;

  const assessments = await prisma.assessment.findMany({
    where: { tenantId: session.tenant.id },
    orderBy: { invitedAt: "desc" },
    include: {
      candidate: { select: { name: true, email: true } },
      exerciseSet: { select: { title: true } },
      report: { select: { compositeScore: true } },
    },
  });

  return (
    <>
      <PageHeader title="Assessments" description="Each one is a candidate sitting an exercise set." />
      {assessments.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          body="Build an exercise set, then invite a candidate to sit it. Invitations arrive in the next phase."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <Th>Candidate</Th>
                <Th>Exercise set</Th>
                <Th>Status</Th>
                <Th>Invited</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {assessments.map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium">{a.candidate.name ?? a.candidate.email}</Td>
                  <Td>{a.exerciseSet.title}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[a.status]}>{ASSESSMENT_STATUS_LABELS[a.status]}</Badge>
                  </Td>
                  <Td>{formatDate(a.invitedAt)}</Td>
                  <Td className="text-right tabular-nums">
                    {a.report?.compositeScore != null ? Math.round(a.report.compositeScore) : "–"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
