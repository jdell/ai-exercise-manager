import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireStaff } from "@/lib/auth";
import { DIFFICULTY_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const { tenant } = await requireStaff();
  const exercises = await prisma.exercise.findMany({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Exercises"
        description="Your library of AI-assisted engineering tasks."
        action={
          <Link
            href="/exercises/new"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            <Plus className="size-4" aria-hidden />
            New exercise
          </Link>
        }
      />

      {exercises.length === 0 ? (
        <EmptyState>No exercises yet. Create your first one to start building assessments.</EmptyState>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{exercise.title}</p>
                <p className="text-sm text-zinc-500">
                  {EXERCISE_TYPE_LABELS[exercise.type]} · {DIFFICULTY_LABELS[exercise.difficulty]}
                  {exercise.timeLimitMinutes ? ` · ${exercise.timeLimitMinutes} min` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  exercise.isPublished
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {exercise.isPublished ? "Published" : "Draft"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
