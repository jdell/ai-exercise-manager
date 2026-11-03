import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, EmptyState, NoAccess, PageHeader, PageSkeleton, Panel, Td, Th } from "@/components/ui";
import { requireStaffSession } from "@/lib/auth";
import { DIFFICULTY_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exercises" };

export default function ExercisesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Exercises />
    </Suspense>
  );
}

async function Exercises() {
  const session = await requireStaffSession("/exercises");
  if (!session.ok) return <NoAccess reason={session.reason} />;

  const exercises = await prisma.exercise.findMany({
    where: { tenantId: session.tenant.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, type: true, difficulty: true, timeMinutes: true, isTemplate: true },
  });

  const newButton = (
    <Link href="/exercises/new" className="btn-primary">
      New exercise
    </Link>
  );

  return (
    <>
      <PageHeader title="Exercises" description="The library your assessments are built from." action={newButton} />
      {exercises.length === 0 ? (
        <EmptyState
          title="No exercises yet"
          body="Write your first exercise: a brief, the starting files and what you'll score."
          href="/exercises/new"
          cta="New exercise"
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Difficulty</Th>
                <Th className="text-right">Time</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {exercises.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium">
                    {e.title} {e.isTemplate && <Badge tone="accent">Template</Badge>}
                  </Td>
                  <Td>{EXERCISE_TYPE_LABELS[e.type]}</Td>
                  <Td>{DIFFICULTY_LABELS[e.difficulty]}</Td>
                  <Td className="text-right tabular-nums">{e.timeMinutes} min</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
