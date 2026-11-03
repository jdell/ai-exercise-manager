"use client";

import { useActionState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Panel } from "@/components/ui";
import { DIFFICULTY_LABELS, EXERCISE_TYPE_LABELS, TIME_LIMIT_MINUTES } from "@/lib/constants";
import { createExercise, type CreateExerciseState } from "./actions";

export function ExerciseForm() {
  const [state, formAction, pending] = useActionState<CreateExerciseState, FormData>(createExercise, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate>
      <Panel className="flex flex-col gap-5 p-6">
        {state.error && (
          <p role="alert" className="rounded-md bg-soft px-3 py-2.5 text-sm text-warn">
            {state.error}
          </p>
        )}

        <Field label="Title" error={err.title}>
          <input name="title" className="field" defaultValue={v.title} placeholder="Migrate the billing service to TypeScript" />
        </Field>

        <Field label="Brief" hint="What the candidate is asked to do, as they'll read it." error={err.description}>
          <textarea name="description" rows={6} className="field" defaultValue={v.description} />
        </Field>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Type" error={err.type}>
            <select name="type" className="field" defaultValue={v.type ?? ""}>
              <option value="" disabled>
                Choose…
              </option>
              {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty" error={err.difficulty}>
            <select name="difficulty" className="field" defaultValue={v.difficulty ?? ""}>
              <option value="" disabled>
                Choose…
              </option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time limit (minutes)" error={err.timeMinutes}>
            <input
              name="timeMinutes"
              type="number"
              inputMode="numeric"
              min={TIME_LIMIT_MINUTES.min}
              max={TIME_LIMIT_MINUTES.max}
              className="field"
              defaultValue={v.timeMinutes ?? "60"}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Target stack" hint="Optional, e.g. Node 22, PostgreSQL." error={err.targetStack}>
            <input name="targetStack" className="field" defaultValue={v.targetStack} />
          </Field>
          <Field label="Allowed AI tools" hint="Comma-separated, e.g. claude, copilot." error={err.allowedTools}>
            <input name="allowedTools" className="field" defaultValue={v.allowedTools} />
          </Field>
        </div>

        <Field label="Rubric notes" hint="Optional. For scorers only — candidates never see this." error={err.rubricNotes}>
          <textarea name="rubricNotes" rows={4} className="field" defaultValue={v.rubricNotes} />
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="isTemplate" defaultChecked={v.isTemplate === "on"} className="size-4 accent-[var(--accent)]" />
          Save as a template other exercises can start from
        </label>

        <div className="flex justify-end border-t border-line pt-5">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Create exercise
          </button>
        </div>
      </Panel>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-warn">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}
