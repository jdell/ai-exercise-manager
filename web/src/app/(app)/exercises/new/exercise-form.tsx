"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { DIFFICULTY_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { createExercise, type CreateExerciseState } from "./actions";

const fieldClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export function ExerciseForm() {
  const [state, formAction, pending] = useActionState<CreateExerciseState, FormData>(
    createExercise,
    {}
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="mt-8 max-w-2xl space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input id="title" name="title" required className={fieldClass} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">Type</label>
          <select id="type" name="type" required className={fieldClass}>
            {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium">Difficulty</label>
          <select id="difficulty" name="difficulty" required className={fieldClass}>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="timeLimitMinutes" className="block text-sm font-medium">Time limit (minutes)</label>
          <input id="timeLimitMinutes" name="timeLimitMinutes" type="number" min={5} max={480} className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="brief" className="block text-sm font-medium">Brief</label>
        <p className="text-xs text-zinc-500">What the candidate is asked to do. Markdown is supported.</p>
        <textarea id="brief" name="brief" required rows={8} className={fieldClass} />
      </div>

      <div>
        <label htmlFor="starterContent" className="block text-sm font-medium">Starter material</label>
        <p className="text-xs text-zinc-500">Optional code, logs, schema or data the candidate starts from.</p>
        <textarea id="starterContent" name="starterContent" rows={8} className={`${fieldClass} font-mono`} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" className="size-4" />
        Publish now (available for new assessments)
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Create exercise"}
      </button>
    </form>
  );
}
