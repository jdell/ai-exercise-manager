import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { pathProgress, useExercises, useStudentProgress, useSubmissions } from '../hooks/useData';
import { PASSING_SCORE } from '../data/rubric';
import { localizeExercise } from '../data/exercises';
import { achievementsFor, earnedCount } from '../lib/achievements';
import {
  AchievementGrid,
  DifficultyBadge,
  Panel,
  PathChip,
  RubricLegend,
  ScoreRing,
  StateBadge,
  relativeTime,
} from '../components/ui';
import type { PathId } from '../types';

export default function StudentDashboard() {
  const { session } = useSession();
  const { t, tn, locale } = useLocale();
  const { submissions, loading } = useSubmissions();
  const { exercises, loading: exercisesLoading } = useExercises();
  const progress = useStudentProgress(session?.id, submissions, exercises);
  const [selectedPath, setSelectedPath] = useState<PathId | 'all'>('all');

  const achievements = useMemo(
    () => (session ? achievementsFor(session.id, submissions, exercises) : []),
    [session, submissions, exercises],
  );

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
            {t('dashboard.welcome', { name: session?.name.split(' ')[0] ?? '' })}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {exercises.length > 0 && approvedCount === exercises.length
              ? t('dashboard.allApproved')
              : t('dashboard.approvedOf', { approved: approvedCount, total: exercises.length })}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-400 uppercase">
              {t('dashboard.averageScore')}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-ink-900">
              {average || '—'}
              {average > 0 && <span className="text-base font-normal text-ink-400">/100</span>}
            </p>
          </div>
          <div className="h-11 w-px bg-ink-200" />
          <div className="text-right">
            <p className="text-xs tracking-wide text-ink-400 uppercase">
              {t('dashboard.progress')}
            </p>
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
                <span className="font-medium text-ink-900">{t(`path.${path.id}.title`)}</span>
                <span className="text-xs tabular-nums text-ink-500">
                  {approved}/{total}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                {t(`path.${path.id}.blurb`)}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-400">
                {approved === total
                  ? t('dashboard.pathComplete')
                  : pathAverage > 0
                    ? t('dashboard.pathAverage', { score: pathAverage })
                    : t('dashboard.notStarted')}
              </p>
            </button>
          );
        })}
      </div>

      {selectedPath !== 'all' && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span>{tn('dashboard.showingInPath', visible.length)}</span>
          <button
            onClick={() => setSelectedPath('all')}
            className="text-indigo-600 hover:underline"
          >
            {t('dashboard.showAll')}
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
            visible.map((canonical) => {
              // The board reads the student's language; the lock, the score,
              // and the grade all still key off the canonical record.
              const exercise = localizeExercise(canonical, locale);
              const entry = progress.get(exercise.id);
              const state = entry?.state ?? 'locked';
              const locked = state === 'locked';
              const latest = entry?.attempts?.[entry.attempts.length - 1];
              // Narrowed by hand rather than by a lookup table: only these
              // three states have a hint key, and the union has to prove it.
              const hint =
                state === 'locked' || state === 'in_review' || state === 'revision'
                  ? t(`state.hint.${state}`)
                  : null;

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
                      {hint ?? t('dashboard.aboutMinutes', { n: exercise.estimatedMinutes })}
                      {latest &&
                        ` · ${t('dashboard.attemptWhen', {
                          n: latest.attempt,
                          when: relativeTime(latest.createdAt),
                        })}`}
                    </p>
                  </div>

                  {(entry?.best ?? 0) > 0 ? (
                    <ScoreRing score={entry!.best} size={56} />
                  ) : (
                    !locked && (
                      <span className="hidden text-sm font-medium text-indigo-600 sm:block">
                        {state === 'revision' ? t('dashboard.tryAgain') : t('dashboard.start')}
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
          {earnedCount(achievements) > 0 && (
            <Panel
              title={t('achievements.title')}
              subtitle={t('achievements.subtitle', {
                earned: earnedCount(achievements),
                total: achievements.length,
              })}
              action={
                <Link to="/progress" className="text-xs font-medium text-indigo-600 hover:underline">
                  {t('achievements.viewAll')}
                </Link>
              }
            >
              {/* The dashboard shows the most recent few; the progress page has
                  the full set, earned and not. */}
              <AchievementGrid achievements={achievements} limit={3} columns={1} />
            </Panel>
          )}

          <Panel title={t('dashboard.howScored')}>
            <RubricLegend />
            <p className="mt-4 border-t border-ink-200 pt-3 text-xs leading-relaxed text-ink-500">
              {t('dashboard.passNote', { passing: PASSING_SCORE })}
            </p>
          </Panel>

          <Panel title={t('dashboard.howProgression')}>
            <ul className="space-y-2.5 text-xs leading-relaxed text-ink-600">
              {(['dashboard.step1', 'dashboard.step2', 'dashboard.step3', 'dashboard.step4'] as const).map(
                (key, i) => (
                  <li key={key}>
                    <span className="font-medium text-ink-800">{i + 1}.</span> {t(key)}
                  </li>
                ),
              )}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
