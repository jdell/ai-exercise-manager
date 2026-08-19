import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { useExercises, useSubmissions } from '../hooks/useData';
import { RUBRIC_KEYS } from '../data/rubric';
import { achievementsFor, earnedCount } from '../lib/achievements';
import { formatDuration, studentAnalytics } from '../lib/analytics';
import { BarChart, Dumbbell, TrendLine } from '../components/charts';
import {
  AchievementGrid,
  EmptyState,
  Panel,
  SkeletonPage,
} from '../components/ui';

/**
 * The student's own analytics. Everything here is derived on read from their
 * submissions — see src/lib/analytics.ts.
 *
 * Each chart ships with a table view. Partly for screen readers, partly for
 * the amber marks, which sit below 3:1 against the card and so must never be
 * the only thing carrying a value.
 */
export default function StudentProgress() {
  const { session } = useSession();
  const { t, tn } = useLocale();
  const { submissions, loading } = useSubmissions();
  const { exercises, loading: exercisesLoading } = useExercises();
  const [showTable, setShowTable] = useState(false);

  const data = useMemo(
    () =>
      session
        ? studentAnalytics(session.id, session.name, submissions, exercises)
        : null,
    [session, submissions, exercises],
  );

  const achievements = useMemo(
    () => (session ? achievementsFor(session.id, submissions, exercises) : []),
    [session, submissions, exercises],
  );

  if (loading || exercisesLoading) {
    return <SkeletonPage panels={3} />;
  }
  if (!data) return null;

  const attempted = data.exercises.filter((e) => e.attempts > 0);

  if (!attempted.length) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState title={t('progress.empty')}>
          {t('progress.emptyHint')}{' '}
          <Link to="/" className="text-indigo-600 hover:underline">
            {t('progress.backToExercises')}
          </Link>
          .
        </EmptyState>
      </div>
    );
  }

  const velocityPairs = data.exercises
    .filter((e) => e.approved && e.firstScore !== undefined && e.approvedScore !== undefined)
    .map((e) => ({ label: e.title, from: Math.round(e.firstScore!), to: Math.round(e.approvedScore!) }));

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat
          label={t('progress.approved')}
          value={`${data.approvedCount}/${data.exercises.length}`}
        />
        <Stat label={t('progress.averageScore')} value={data.averageScore || '—'} />
        <Stat label={t('progress.attempts')} value={data.totalAttempts} />
        <Stat
          label={t('progress.turnaround')}
          value={formatDuration(data.medianTimeToApproval)}
          small
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel
            title={t('progress.scoreAcrossTrack')}
            subtitle={t('progress.scoreAcrossTrackSubtitle')}
            action={
              <button
                onClick={() => setShowTable((v) => !v)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {showTable ? t('common.showChart') : t('common.showTable')}
              </button>
            }
          >
            {showTable ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left">
                    <th className="py-2 pr-4 font-medium text-ink-500">{t('common.exercise')}</th>
                    <th className="py-2 pr-4 font-medium text-ink-500">{t('progress.best')}</th>
                    <th className="py-2 pr-4 font-medium text-ink-500">{t('common.attempts')}</th>
                    <th className="py-2 font-medium text-ink-500">
                      {t('progress.timeToApproval')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attempted.map((e) => (
                    <tr key={e.exerciseId} className="border-b border-ink-100 last:border-0">
                      <td className="py-2 pr-4 text-ink-800">
                        <span className="text-ink-400">{e.order}.</span> {e.title}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-ink-700">
                        {e.bestScore ?? '—'}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-ink-700">{e.attempts}</td>
                      <td className="py-2 text-ink-600">{formatDuration(e.timeToApproval)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <TrendLine
                points={data.trend.map((t) => ({
                  label: String(t.order),
                  sublabel: t.title,
                  value: Math.round(t.score),
                }))}
              />
            )}
          </Panel>

          <Panel title={t('progress.velocity')} subtitle={t('progress.velocitySubtitle')}>
            {velocityPairs.length === 0 ? (
              <EmptyState title={t('progress.velocityEmpty')}>
                {t('progress.velocityEmptyHint')}
              </EmptyState>
            ) : (
              <div className="space-y-5">
                <Dumbbell data={velocityPairs} />
                {data.velocity && (
                  <div className="rounded-lg border border-ink-200 px-4 py-3">
                    <p className="text-sm leading-relaxed text-ink-700">
                      {tn('progress.velocityLine', data.velocity.sample, {
                        first: data.velocity.firstMean,
                        approved: data.velocity.approvedMean,
                      })}
                      {data.velocity.gain > 0 && t('progress.velocityGain', { n: data.velocity.gain })}
                      .
                    </p>
                    <p className="hint mt-1.5">
                      {data.velocity.perAttempt !== null
                        ? t('progress.velocityPerAttempt', { n: data.velocity.perAttempt })
                        : t('progress.velocityNoRevisions')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel title={t('progress.effort')} subtitle={t('progress.effortSubtitle')}>
            <BarChart
              data={attempted.map((e) => ({
                label: e.title,
                value: e.attempts,
                display: tn('progress.attemptCount', e.attempts),
              }))}
              max={Math.max(...attempted.map((e) => e.attempts))}
            />
            <p className="hint mt-3">{t('progress.effortHint')}</p>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel
            title={t('achievements.title')}
            subtitle={t('achievements.subtitle', {
              earned: earnedCount(achievements),
              total: achievements.length,
            })}
          >
            <AchievementGrid achievements={achievements} columns={1} />
          </Panel>

          <Panel title={t('progress.dimensions')} subtitle={t('progress.dimensionsSubtitle')}>
            <BarChart
              data={RUBRIC_KEYS.map((key) => ({
                label: t(`rubric.${key}.label`),
                value: Math.round(data.dimensionMeans[key]),
                tone: 'score' as const,
              }))}
              labelWidth="w-32"
            />
            {data.strongest && data.weakest && data.strongest !== data.weakest && (
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                {t('progress.strongestWeakest', {
                  strongest: t(`rubric.${data.strongest}.label`),
                  weakest: t(`rubric.${data.weakest}.label`),
                })}{' '}
                {t(`rubric.${data.weakest}.description`)}
              </p>
            )}
          </Panel>

          <Panel title={t('progress.report')} subtitle={t('progress.reportSubtitle')}>
            <p className="text-sm leading-relaxed text-ink-600">{t('progress.reportBody')}</p>
            <Link
              to={`/report/${session?.id}`}
              className="btn-secondary mt-4 inline-flex w-full justify-center"
            >
              {t('progress.openReport')}
            </Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Header() {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">{t('progress.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('progress.subtitle')}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs tracking-wide text-ink-500 uppercase">{label}</p>
      <p
        className={`mt-1 font-semibold text-ink-900 ${small ? 'text-lg' : 'text-2xl tabular-nums'}`}
      >
        {value}
      </p>
    </div>
  );
}
