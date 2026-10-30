import type { Metadata } from "next";
import { requireCandidateAssessment } from "@/lib/auth";
import {
  ASSESSMENT_STATUS_LABELS,
  DIFFICULTY_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";
import { startAssessment } from "./actions";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessPage({ params }: PageProps<"/assess/[id]">) {
  const { id } = await params;
  const { assessment } = await requireCandidateAssessment(id);
  const exercises = assessment.exerciseSet.items.map((item) => item.exercise);
  const started = assessment.status !== "INVITED";

  return (
    <>
      <p className="text-sm text-zinc-500">{ASSESSMENT_STATUS_LABELS[assessment.status]}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{assessment.exerciseSet.name}</h1>
      {assessment.exerciseSet.description && (
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{assessment.exerciseSet.description}</p>
      )}

      {!started ? (
        <div className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-sm">
            This assessment has {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}.
            Every prompt you write is recorded, so work as you normally would with an AI assistant.
          </p>
          <form action={startAssessment.bind(null, assessment.id)} className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              Start assessment
            </button>
          </form>
        </div>
      ) : (
        <ol className="mt-8 space-y-4">
          {exercises.map((exercise, index) => (
            <li key={exercise.id} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                Exercise {index + 1} · {EXERCISE_TYPE_LABELS[exercise.type]} ·{" "}
                {DIFFICULTY_LABELS[exercise.difficulty]}
              </p>
              <h2 className="mt-1 font-semibold">{exercise.title}</h2>
              <p className="mt-2 text-sm whitespace-pre-wrap">{exercise.brief}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
