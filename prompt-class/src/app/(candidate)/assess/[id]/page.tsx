import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge, NoAccess, PageHeader, PageSkeleton, Panel } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { ASSESSMENT_STATUS_LABELS, DIFFICULTY_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your assessment" };

export default function AssessPage({ params }: PageProps<"/assess/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Assessment params={params} />
    </Suspense>
  );
}

async function Assessment({ params }: { params: PageProps<"/assess/[id]">["params"] }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/assess/${id}`)}`);
  if (!session.user) return <NoAccess reason="no-user" />;

  // Scoped to the candidate: someone else's assessment looks exactly like a
  // missing one. Rubric notes and scores are deliberately not selected.
  const assessment = await prisma.assessment.findFirst({
    where: { id, candidateId: session.user.id },
    include: {
      tenant: { select: { name: true } },
      exerciseSet: {
        select: {
          title: true,
          description: true,
          items: {
            orderBy: { position: "asc" },
            select: {
              exercise: { select: { id: true, title: true, type: true, difficulty: true, timeMinutes: true } },
            },
          },
        },
      },
      submissions: { select: { exerciseId: true, submittedAt: true } },
    },
  });
  if (!assessment) notFound();

  const { exerciseSet } = assessment;
  const submitted = new Set(assessment.submissions.filter((s) => s.submittedAt).map((s) => s.exerciseId));
  const totalMinutes = exerciseSet.items.reduce((sum, i) => sum + i.exercise.timeMinutes, 0);

  return (
    <>
      <PageHeader
        title={exerciseSet.title}
        description={`From ${assessment.tenant.name} · ${exerciseSet.items.length} exercises · about ${totalMinutes} minutes`}
        action={<Badge tone="accent">{ASSESSMENT_STATUS_LABELS[assessment.status]}</Badge>}
      />
      {exerciseSet.description && <p className="mb-6 max-w-2xl text-muted">{exerciseSet.description}</p>}

      <Panel className="divide-y divide-line">
        {exerciseSet.items.map(({ exercise }, index) => (
          <div key={exercise.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
            <span className="font-mono text-xs text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-medium">{exercise.title}</span>
            <span className="text-sm text-muted">
              {EXERCISE_TYPE_LABELS[exercise.type]} · {DIFFICULTY_LABELS[exercise.difficulty]} · {exercise.timeMinutes} min
            </span>
            <span className="ml-auto">
              {submitted.has(exercise.id) ? <Badge tone="ok">Submitted</Badge> : <Badge>Not started</Badge>}
            </span>
          </div>
        ))}
      </Panel>

      <p className="mt-6 text-sm text-muted">The exercise workspace opens here in the next phase.</p>
    </>
  );
}
