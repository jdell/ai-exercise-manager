import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { pathProgress, useExercises, useStudentProgress, useSubmissions } from '../hooks/useData';
import { PASSING_SCORE } from '../data/rubric';
import {
  DifficultyBadge,
  Panel,
  PathChip,
  RubricLegend,
  ScoreRing,
  StateBadge,
  relativeTime,
} from '../components/ui';
import type { ExerciseState, PathId } from '../types';

const LOCK_HINT: Record<ExerciseState, string | null> = {
  locked: 'Unlocks when the previous exercise is approved',
  available: null,
  in_review: 'Submitted — waiting on your teacher',
  revision: 'Your teacher asked for another attempt',
  approved: null,
};

export default function StudentDashboard() {
  const { session } = useSession();
  const { submissions, loading } = useSubmissions();
  const { exercises, loading: exercisesLoading } = useExercises();
  const progress = useStudentProgress(session?.id, submissions, exercises);
  const [selectedPath, setSelectedPath] = useState<PathId | 'all'>('all');

  const paths = pathProgress(exercises, progress);
  const approvedCount = exercises.filter((e) => progress.get(e.id)?.state === 'approved').length;
  const scored = exercises.map((e) => progress.get(e.id)?.best ?? 0).filter((s) => s > 0);
  const average = scored.length
    ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
    : 0;

  const visible =
    selectedPath === 'all' ? exercises : exercises.filter((e) => e.pathId === selectedPath);
  const busy = loading || exercisesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            Welcome back, {session?.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {exercises.length > 0 && approvedCount === exercises.length
              ? 'Every exercise approved. Nicely done.'
              : `${approvedCount} of ${exercises.length} approved — keep going.`}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-400 uppercase">Average score</p>
            <p className="text-2xl font-semibold tabular-nums text-ink-900">
              {average || '—'}
              {average > 0 && <span className="text-base font-normal text-ink-400">/100</span>}
            </p>
          </div>
          <div className="h-11 w-px bg-ink-200" />
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-400 uppercase">Progress</p>
            <p className="text-2xl font-semibold tabular-nums text-ink-900">
              {approvedCount}
              <span className="text-base font-normal text-ink-400">/{exercises.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Learning paths */}
      <div className="grid gap-3 sm:grid-cols-3">
        {paths.map(({ path, approved, total, average: pathAverage }) => {
          const active = selectedPath === path.id;
          const pct = total ? (approved / total) * 100 : 0;
          return (
            <button
              key={path.id}
              onClick={() => setSelectedPath(active ? 'all' : path.id)}
              aria-pressed={active}
              className={`card p-4 text-left transition-all hover:-translate-y-px hover:shadow-sm ${
                active ? 'border-indigo-400 ring-2 ring-indigo-100' : 'hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink-900">{path.title}</span>
                <span className="text-xs tabular-nums text-ink-500">
                  {approved}/{total}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{path.blurb}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-400">
                {approved === total
                  ? 'Path complete'
                  : pathAverage > 0
                    ? `Average ${pathAverage}`
                    : 'Not started'}
              </p>
            </button>
          );
        })}
      </div>

      {selectedPath !== 'all' && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span>
            Showing <span className="font-medium text-ink-800">{visible.length}</span> exercise
            {visible.length === 1 ? '' : 's'} in this path.
          </span>
          <button
            onClick={() => setSelectedPath('all')}
            className="text-indigo-600 hover:underline"
          >
            Show all
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {busy && (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-xl bg-ink-100" />
              ))}
            </div>
          )}

          {!busy &&
            visible.map((exercise) => {
              const entry = progress.get(exercise.id);
              const state = entry?.state ?? 'locked';
              const locked = state === 'locked';
              const latest = entry?.attempts?.[entry.attempts.length - 1];
              const hint = LOCK_HINT[state];

              const card = (
                <article
                  className={`card animate-in flex items-center gap-5 p-5 transition-all ${
                    locked
                      ? 'opacity-60'
                      : 'hover:-translate-y-px hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                      state === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : locked
                          ? 'bg-ink-100 text-ink-400'
                          : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {state === 'approved' ? '✓' : locked ? '🔒' : exercise.order}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-ink-900">{exercise.title}</h2>
                      <StateBadge state={state} />
                      {selectedPath === 'all' && <PathChip pathId={exercise.pathId} />}
                      <DifficultyBadge difficulty={exercise.difficulty} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-500">{exercise.tagline}</p>
                    <p className="mt-1.5 text-xs text-ink-400">
                      {hint ?? `About ${exercise.estimatedMinutes} min`}
                      {latest && ` · attempt ${latest.attempt} ${relativeTime(latest.createdAt)}`}
                    </p>
                  </div>

                  {(entry?.best ?? 0) > 0 ? (
                    <ScoreRing score={entry!.best} size={56} />
                  ) : (
                    !locked && (
                      <span className="hidden text-sm font-medium text-indigo-600 sm:block">
                        {state === 'revision' ? 'Try again →' : 'Start →'}
                      </span>
                    )
                  )}
                </article>
              );

              return locked ? (
                <div key={exercise.id} aria-disabled="true">
                  {card}
                </div>
              ) : (
                <Link key={exercise.id} to={`/exercise/${exercise.id}`} className="block">
                  {card}
                </Link>
              );
            })}
        </div>

        <aside className="space-y-6">
          <Panel title="How you're scored">
            <RubricLegend />
            <p className="mt-4 border-t border-ink-200 pt-3 text-xs leading-relaxed text-ink-500">
              A weighted total of {PASSING_SCORE} or above clears the bar. Your teacher makes the
              final call and can adjust any score. Some exercises weight the dimensions
              differently — the workspace shows that exercise's own weights.
            </p>
          </Panel>

          <Panel title="How progression works">
            <ul className="space-y-2.5 text-xs leading-relaxed text-ink-600">
              <li>
                <span className="font-medium text-ink-800">1.</span> Write and test your prompt as
                many times as you like — test runs are not graded.
              </li>
              <li>
                <span className="font-medium text-ink-800">2.</span> Submit with a reflection.
                Claude scores it immediately.
              </li>
              <li>
                <span className="font-medium text-ink-800">3.</span> Your teacher reviews the score
                and either approves it or asks for another attempt.
              </li>
              <li>
                <span className="font-medium text-ink-800">4.</span> Approval unlocks the next
                exercise, whichever path it is in.
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
