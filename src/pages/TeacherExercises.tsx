import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useExercises, useSubmissions } from '../hooks/useData';
import { PATHS } from '../data/paths';
import { RUBRIC, effectiveWeights, hasCustomWeights } from '../data/rubric';
import { deleteExercise, newId, saveExercise } from '../lib/store';
import { describeError } from '../lib/claude';
import {
  Alert,
  DifficultyBadge,
  EmptyState,
  Panel,
  PathChip,
  Spinner,
  relativeTime,
} from '../components/ui';
import type { Difficulty, Exercise, PathId, RubricKey } from '../types';

/** The builder's own state — weights are whole percents here, fractions on save. */
interface Draft {
  id: string | null;
  title: string;
  tagline: string;
  brief: string;
  task: string;
  pathId: PathId;
  difficulty: Difficulty;
  topic: string;
  estimatedMinutes: number;
  maxPromptChars: number;
  requirements: string;
  goodExample: string;
  badExample: string;
  evaluatorNotes: string;
  starterPrompt: string;
  weights: Record<RubricKey, number>;
}

const DEFAULT_PERCENTS = Object.fromEntries(
  RUBRIC.map((d) => [d.key, Math.round(d.weight * 100)]),
) as Record<RubricKey, number>;

function blankDraft(): Draft {
  return {
    id: null,
    title: '',
    tagline: '',
    brief: '',
    task: '',
    pathId: 'domain',
    difficulty: 'core',
    topic: '',
    estimatedMinutes: 20,
    maxPromptChars: 1200,
    requirements: '',
    goodExample: '',
    badExample: '',
    evaluatorNotes: '',
    starterPrompt: '',
    weights: { ...DEFAULT_PERCENTS },
  };
}

function draftFrom(exercise: Exercise): Draft {
  const weights = effectiveWeights(exercise.rubricWeights);
  return {
    id: exercise.id,
    title: exercise.title,
    tagline: exercise.tagline,
    brief: exercise.brief,
    task: exercise.task,
    pathId: exercise.pathId,
    difficulty: exercise.difficulty,
    topic: exercise.topic,
    estimatedMinutes: exercise.estimatedMinutes,
    maxPromptChars: exercise.maxPromptChars ?? 1200,
    requirements: exercise.successCriteria.join('\n'),
    goodExample: exercise.goodExample ?? '',
    badExample: exercise.badExample ?? '',
    evaluatorNotes: exercise.evaluatorNotes,
    starterPrompt: exercise.starterPrompt,
    weights: Object.fromEntries(
      RUBRIC.map((d) => [d.key, Math.round(weights[d.key] * 100)]),
    ) as Record<RubricKey, number>,
  };
}

export default function TeacherExercises() {
  const { session } = useSession();
  const { exercises, loading } = useExercises();
  const { submissions } = useSubmissions();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const custom = exercises.filter((e) => e.source === 'custom');
  const nextOrder = useMemo(
    () => exercises.reduce((max, e) => Math.max(max, e.order), 0) + 1,
    [exercises],
  );

  const weightTotal = draft
    ? RUBRIC.reduce((sum, d) => sum + (draft.weights[d.key] || 0), 0)
    : 100;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!draft || !session) return;
    const requirements = draft.requirements
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!draft.title.trim()) return setError('Give the exercise a title.');
    if (!draft.task.trim()) return setError('Describe the task the student has to do.');
    if (requirements.length === 0) return setError('Add at least one requirement.');

    setError('');
    setBusy(true);
    const now = Date.now();
    const existing = draft.id ? exercises.find((e) => e.id === draft.id) : undefined;

    // Percentages in, fractions out. effectiveWeights() normalises on read, so
    // a set that does not add up to 100 keeps its ratio rather than erroring.
    const rubricWeights = Object.fromEntries(
      RUBRIC.map((d) => [d.key, (draft.weights[d.key] || 0) / 100]),
    ) as Record<RubricKey, number>;

    const exercise: Exercise = {
      id: draft.id ?? newId('ex'),
      order: existing?.order ?? nextOrder,
      title: draft.title.trim(),
      tagline: draft.tagline.trim() || draft.topic.trim() || 'Custom exercise',
      estimatedMinutes: Math.max(1, draft.estimatedMinutes || 20),
      brief: draft.brief.trim() || draft.task.trim(),
      task: draft.task.trim(),
      tips: [],
      successCriteria: requirements,
      starterPrompt: draft.starterPrompt,
      evaluatorNotes: draft.evaluatorNotes.trim(),
      pathId: draft.pathId,
      difficulty: draft.difficulty,
      topic: draft.topic.trim() || 'Custom',
      maxPromptChars: draft.maxPromptChars > 0 ? draft.maxPromptChars : undefined,
      goodExample: draft.goodExample.trim() || undefined,
      badExample: draft.badExample.trim() || undefined,
      rubricWeights,
      source: 'custom',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.createdBy ?? session.name,
    };

    try {
      await saveExercise(exercise);
      setNotice(`Saved "${exercise.title}".`);
      setDraft(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(exercise: Exercise) {
    const attempts = submissions.filter((s) => s.exerciseId === exercise.id).length;
    const warning = attempts
      ? `"${exercise.title}" has ${attempts} submitted attempt${attempts > 1 ? 's' : ''}. Deleting the exercise leaves those submissions without an exercise to render. Delete anyway?`
      : `Delete "${exercise.title}"?`;
    if (!window.confirm(warning)) return;

    setBusy(true);
    try {
      await deleteExercise(exercise.id);
      setNotice(`Deleted "${exercise.title}".`);
      if (draft?.id === exercise.id) setDraft(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Exercises</h1>
          <p className="mt-1 text-sm text-ink-500">
            The built-in exercises plus anything you add. Custom exercises appear on the student
            board in the same locked progression.
          </p>
        </div>
        {!draft && (
          <button onClick={() => setDraft(blankDraft())} className="btn-primary">
            New exercise
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && !error && <Alert tone="success">{notice}</Alert>}

      {draft && (
        <Panel
          title={draft.id ? 'Edit exercise' : 'New exercise'}
          subtitle={
            draft.id
              ? 'Changes apply to every future attempt at this exercise.'
              : `It will be added at position ${nextOrder}, after everything already on the board.`
          }
          action={
            <button onClick={() => setDraft(null)} className="btn-ghost px-2 py-1 text-xs">
              Cancel
            </button>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" hint="Shown on the card and in the review queue.">
                <input
                  className="input"
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Clinical Note Summaries"
                />
              </Field>
              <Field label="Tagline" hint="One line under the title.">
                <input
                  className="input"
                  value={draft.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                  placeholder="Write for the next clinician on shift"
                />
              </Field>
            </div>

            <Field label="Description" hint="What the student is learning, and why it matters.">
              <textarea
                className="input min-h-[6rem] resize-y"
                value={draft.brief}
                onChange={(e) => update('brief', e.target.value)}
              />
            </Field>

            <Field label="Task" hint="The concrete thing to produce. This is what they are graded against.">
              <textarea
                className="input min-h-[5rem] resize-y"
                value={draft.task}
                onChange={(e) => update('task', e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Path">
                <select
                  className="input"
                  value={draft.pathId}
                  onChange={(e) => update('pathId', e.target.value as PathId)}
                >
                  {PATHS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select
                  className="input"
                  value={draft.difficulty}
                  onChange={(e) => update('difficulty', e.target.value as Difficulty)}
                >
                  <option value="intro">Intro</option>
                  <option value="core">Core</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Topic">
                <input
                  className="input"
                  value={draft.topic}
                  onChange={(e) => update('topic', e.target.value)}
                  placeholder="Summarisation"
                />
              </Field>
              <Field label="Minutes">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={draft.estimatedMinutes}
                  onChange={(e) => update('estimatedMinutes', Number(e.target.value))}
                />
              </Field>
            </div>

            <Field
              label="Requirements"
              hint="One per line. Each is checked individually by the evaluator and shown to the student."
            >
              <textarea
                className="input min-h-[7rem] resize-y font-mono text-[13px]"
                value={draft.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                placeholder={'The prompt names the reader and their role\nThe output fits on one screen'}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Good example" hint="A prompt that would satisfy this exercise.">
                <textarea
                  className="input min-h-[6rem] resize-y font-mono text-[13px]"
                  value={draft.goodExample}
                  onChange={(e) => update('goodExample', e.target.value)}
                />
              </Field>
              <Field label="Bad example" hint="A prompt that misses, and is worth recognising.">
                <textarea
                  className="input min-h-[6rem] resize-y font-mono text-[13px]"
                  value={draft.badExample}
                  onChange={(e) => update('badExample', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Prompt length budget"
                hint="Characters. Shown as a live counter while the student types; not enforced."
              >
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={100}
                  value={draft.maxPromptChars}
                  onChange={(e) => update('maxPromptChars', Number(e.target.value))}
                />
              </Field>
              <Field label="Starter prompt" hint="Pre-filled in the editor. Optional.">
                <textarea
                  className="input min-h-[4rem] resize-y font-mono text-[13px]"
                  value={draft.starterPrompt}
                  onChange={(e) => update('starterPrompt', e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Grading guidance"
              hint="Extra instruction for the evaluator. Overrides the general rubric where they conflict."
            >
              <textarea
                className="input min-h-[5rem] resize-y"
                value={draft.evaluatorNotes}
                onChange={(e) => update('evaluatorNotes', e.target.value)}
              />
            </Field>

            <div>
              <p className="label">Rubric weights</p>
              <p className="hint mb-3">
                Percent of the final score per dimension. They are normalised on save, so a set that
                does not add up to 100 keeps its ratio.
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                {RUBRIC.map((dim) => (
                  <div key={dim.key}>
                    <label
                      htmlFor={`weight-${dim.key}`}
                      className="mb-1 block text-xs font-medium text-ink-600"
                    >
                      {dim.label}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`weight-${dim.key}`}
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        value={draft.weights[dim.key]}
                        onChange={(e) =>
                          update('weights', {
                            ...draft.weights,
                            [dim.key]: Number(e.target.value),
                          })
                        }
                      />
                      <span className="text-sm text-ink-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <p className={`text-xs ${weightTotal === 100 ? 'text-ink-500' : 'text-amber-600'}`}>
                  Total {weightTotal}%
                  {weightTotal !== 100 && ' — will be normalised to 100%'}
                </p>
                <button
                  onClick={() => update('weights', { ...DEFAULT_PERCENTS })}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Reset to rubric defaults
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
              <button onClick={save} disabled={busy} className="btn-primary">
                {busy && <Spinner />}
                {draft.id ? 'Save changes' : 'Create exercise'}
              </button>
              <button onClick={() => setDraft(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        title={`Custom exercises (${custom.length})`}
        subtitle="Stored in the database and merged into the board for every student."
      >
        {loading && <div className="h-24 animate-pulse rounded-lg bg-ink-100" />}
        {!loading && custom.length === 0 && (
          <EmptyState title="No custom exercises yet">
            Add one to extend the track past the built-in five.
          </EmptyState>
        )}
        <div className="space-y-2">
          {custom.map((exercise) => (
            <div
              key={exercise.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 px-3.5 py-3"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-100 text-xs font-semibold text-ink-600">
                {exercise.order}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-900">{exercise.title}</span>
                  <PathChip pathId={exercise.pathId} />
                  <DifficultyBadge difficulty={exercise.difficulty} />
                  {hasCustomWeights(exercise.rubricWeights) && (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 uppercase">
                      Reweighted
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-500">{exercise.tagline}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {exercise.successCriteria.length} requirements ·{' '}
                  {submissions.filter((s) => s.exerciseId === exercise.id).length} attempts
                  {exercise.updatedAt && ` · edited ${relativeTime(exercise.updatedAt)}`}
                </p>
              </div>
              <button
                onClick={() => setDraft(draftFrom(exercise))}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => remove(exercise)}
                disabled={busy}
                className="btn-danger px-3 py-1.5 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Built-in exercises" subtitle="Shipped with the app and not editable here.">
        <div className="space-y-2">
          {exercises
            .filter((e) => e.source === 'builtin')
            .map((exercise) => (
              <div
                key={exercise.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 px-3.5 py-2.5"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-ink-100 text-xs font-semibold text-ink-600">
                  {exercise.order}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-700">
                  {exercise.title}
                </span>
                <PathChip pathId={exercise.pathId} />
                <DifficultyBadge difficulty={exercise.difficulty} />
              </div>
            ))}
        </div>
        <p className="hint mt-3">
          Editing these means changing <code className="font-mono">src/data/exercises.ts</code>.{' '}
          <Link to="/evaluator" className="text-indigo-600 hover:underline">
            The evaluator console
          </Link>{' '}
          shows the grading instructions each one produces.
        </p>
      </Panel>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint mt-1">{hint}</p>}
    </div>
  );
}
