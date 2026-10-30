import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireStaff } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Assessments" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function AssessmentsPage() {
  const { tenant } = await requireStaff();
  const assessments = await prisma.assessment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { invitedAt: "desc" },
    include: { candidate: true, exerciseSet: true, report: { select: { overallScore: true } } },
  });

  return (
    <>
      <PageHeader title="Assessments" description="Every invitation and its progress." />

      {assessments.length === 0 ? (
        <EmptyState>No assessments yet. Invite a candidate to an exercise set to get started.</EmptyState>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exercise set</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Invited</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.candidate.fullName ?? a.candidate.email}</td>
                  <td className="px-4 py-3">{a.exerciseSet.name}</td>
                  <td className="px-4 py-3">{ASSESSMENT_STATUS_LABELS[a.status]}</td>
                  <td className="px-4 py-3">{dateFormat.format(a.invitedAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {a.report ? a.report.overallScore.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
