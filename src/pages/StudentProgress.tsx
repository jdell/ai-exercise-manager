import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useExercises, useSubmissions } from '../hooks/useData';
import { RUBRIC_BY_KEY } from '../data/rubric';
import { formatDuration, studentAnalytics } from '../lib/analytics';
import { BarChart, Dumbbell, TrendLine } from '../components/charts';
import { EmptyState, Panel } from '../components/ui';

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

  if (loading || exercisesLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-ink-100" />;
  }
  if (!data) return null;

  const attempted = data.exercises.filter((e) => e.attempts > 0);

  if (!attempted.length) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState title="Nothing to chart yet">
          Submit your first exercise and your progress will show up here.{' '}
          <Link to="/" className="text-indigo-600 hover:underline">
            Back to your exercises
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
        <Stat label="Approved" value={`${data.approvedCount}/${data.exercises.length}`} />
        <Stat label="Average score" value={data.averageScore || '—'} />
        <Stat label="Attempts" value={data.totalAttempts} />
        <Stat
          label="Typical turnaround"
          value={formatDuration(data.medianTimeToApproval)}
          small
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Score across the track"
            subtitle="Your best score on each exercise you have attempted, in order."
            action={
              <button
                onClick={() => setShowTable((v) => !v)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {showTable ? 'Show chart' : 'Show table'}
              </button>
            }
          >
            {showTable ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left">
                    <th className="py-2 pr-4 font-medium text-ink-500">Exercise</th>
                    <th className="py-2 pr-4 font-medium text-ink-500">Best</th>
                    <th className="py-2 pr-4 font-medium text-ink-500">Attempts</th>
                    <th className="py-2 font-medium text-ink-500">Time to approval</th>
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

          <Panel
            title="Learning velocity"
            subtitle="Where each exercise started and where it was approved."
          >
            {velocityPairs.length === 0 ? (
              <EmptyState title="No approved exercises yet">
                This fills in once a teacher approves your first submission.
              </EmptyState>
            ) : (
              <div className="space-y-5">
                <Dumbbell data={velocityPairs} />
                {data.velocity && (
                  <div className="rounded-lg border border-ink-200 px-4 py-3">
                    <p className="text-sm leading-relaxed text-ink-700">
                      Across {data.velocity.sample} approved exercise
                      {data.velocity.sample === 1 ? '' : 's'} you moved from an average of{' '}
                      <strong className="tabular-nums">{data.velocity.firstMean}</strong> on the
                      first attempt to{' '}
                      <strong className="tabular-nums">{data.velocity.approvedMean}</strong> when
                      approved
                      {data.velocity.gain > 0 ? (
                        <>
                          {' '}
                          — a gain of{' '}
                          <strong className="tabular-nums">{data.velocity.gain}</strong> points
                        </>
                      ) : (
                        ''
                      )}
                      .
                    </p>
                    {data.velocity.perAttempt !== null && (
                      <p className="hint mt-1.5">
                        That works out at {data.velocity.perAttempt} points per revision.
                      </p>
                    )}
                    {data.velocity.perAttempt === null && (
                      <p className="hint mt-1.5">
                        Every exercise was approved first time, so there is no revision rate to
                        report.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Effort per exercise"
            subtitle="Attempts made, and how long each exercise took end to end."
          >
            <BarChart
              data={attempted.map((e) => ({
                label: e.title,
                value: e.attempts,
                display: `${e.attempts} ${e.attempts === 1 ? 'attempt' : 'attempts'}`,
              }))}
              max={Math.max(...attempted.map((e) => e.attempts))}
            />
            <p className="hint mt-3">
              More attempts is not worse. Revisions are where most of the learning shows up — the
              velocity chart above is the one to read for that.
            </p>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Rubric dimensions" subtitle="Your average on each, across every attempt.">
            <BarChart
              data={Object.entries(data.dimensionMeans).map(([key, value]) => ({
                label: RUBRIC_BY_KEY[key as keyof typeof RUBRIC_BY_KEY].label,
                value: Math.round(value),
                tone: 'score' as const,
              }))}
              labelWidth="w-32"
            />
            {data.strongest && data.weakest && data.strongest !== data.weakest && (
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                Strongest on <strong>{RUBRIC_BY_KEY[data.strongest].label}</strong>, weakest on{' '}
                <strong>{RUBRIC_BY_KEY[data.weakest].label}</strong>.{' '}
                {RUBRIC_BY_KEY[data.weakest].description}
              </p>
            )}
          </Panel>

          <Panel title="Report" subtitle="A printable summary to share.">
            <p className="text-sm leading-relaxed text-ink-600">
              Generates a one-page summary of your progress that can be saved as a PDF.
            </p>
            <Link
              to={`/report/${session?.id}`}
              className="btn-secondary mt-4 inline-flex w-full justify-center"
            >
              Open report
            </Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Your progress</h1>
      <p className="mt-1 text-sm text-ink-500">
        How your scores have moved across the track, and where your time has gone.
      </p>
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
