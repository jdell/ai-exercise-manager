import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { AssessmentStatus } from "@/generated/prisma/enums";
import { NoAccess, PageHeader, PageSkeleton, Panel } from "@/components/ui";
import { requireStaffSession } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS, PLAN_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const session = await requireStaffSession("/dashboard");
  if (!session.ok) return <NoAccess reason={session.reason} />;
  const tenantId = session.tenant.id;

  const [exercises, sets, candidates, byStatus] = await Promise.all([
    prisma.exercise.count({ where: { tenantId, isTemplate: false } }),
    prisma.exerciseSet.count({ where: { tenantId } }),
    prisma.tenantMembership.count({ where: { tenantId, role: "CANDIDATE" } }),
    prisma.assessment.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
  ]);
  const statusCount = (status: AssessmentStatus) => byStatus.find((s) => s.status === status)?._count ?? 0;

  const stats = [
    { label: "Exercises", value: exercises, href: "/exercises" },
    { label: "Exercise sets", value: sets, href: "/exercises" },
    { label: "Candidates", value: candidates, href: "/candidates" },
    { label: "To score", value: statusCount("SUBMITTED"), href: "/assessments" },
  ];

  return (
    <>
      <PageHeader
        title={session.tenant.name}
        description={`${PLAN_LABELS[session.tenant.plan]} plan`}
        action={
          <Link href="/exercises/new" className="btn-primary">
            New exercise
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Panel className="p-5 hover:bg-soft">
              <p className="label">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{s.value}</p>
            </Panel>
          </Link>
        ))}
      </div>

      <Panel className="mt-6 p-5">
        <p className="label">Assessments by status</p>
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(Object.keys(ASSESSMENT_STATUS_LABELS) as AssessmentStatus[]).map((status) => (
            <li key={status}>
              <p className="text-sm text-muted">{ASSESSMENT_STATUS_LABELS[status]}</p>
              <p className="text-xl font-semibold tabular-nums">{statusCount(status)}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
