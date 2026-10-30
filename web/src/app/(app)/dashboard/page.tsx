import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireStaff } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { tenant } = await requireStaff();

  const [exerciseCount, candidateCount, byStatus] = await Promise.all([
    prisma.exercise.count({ where: { tenantId: tenant.id } }),
    prisma.tenantMembership.count({ where: { tenantId: tenant.id, role: "CANDIDATE" } }),
    prisma.assessment.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: { _all: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

  const stats = [
    { label: "Exercises", value: exerciseCount },
    { label: "Candidates", value: candidateCount },
    ...Object.entries(ASSESSMENT_STATUS_LABELS).map(([status, label]) => ({
      label: `Assessments · ${label.toLowerCase()}`,
      value: statusCounts[status] ?? 0,
    })),
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Overview for ${tenant.name}`} />
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">{label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
