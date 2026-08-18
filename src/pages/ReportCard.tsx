import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { useExercises, useStudents, useSubmissions } from '../hooks/useData';
import { PASSING_SCORE, RUBRIC_KEYS } from '../data/rubric';
import { formatDuration, studentAnalytics } from '../lib/analytics';
import { BarChart, TrendLine } from '../components/charts';
import { EmptyState, relativeTime, scoreTone } from '../components/ui';

/**
 * A one-page progress report for a parent or guardian.
 *
 * "Export as PDF" is the browser's own print-to-PDF rather than a bundled PDF
 * library. That is a deliberate trade: a client-side renderer would add a large
 * dependency, and — more to the point — it would have to re-implement the
 * layout, so the PDF would drift from the page as soon as either changed. The
 * print stylesheet in index.css means what is exported is exactly what is on
 * screen, and the charts are inline SVG precisely so they survive the trip.
 *
 * The audience is not the student. There are no rubric internals, no evaluator
 * mechanics and no integrity signals here — a report a guardian reads should
 * say what the student did and how they progressed, and nothing about how the
 * grading machinery works.
 *
 * It follows the reader's language, and that matters more here than anywhere
 * else in the app: this is the one page that leaves the building. A guardian
 * who reads Spanish should not be handed an English PDF about their child.
 */
export default function ReportCard() {
  const { studentId } = useParams<{ studentId: string }>();
  const { session } = useSession();
  const { t, tn, locale } = useLocale();
  const { submissions, loading } = useSubmissions();
  const { students } = useStudents();
  const { exercises, loading: exercisesLoading } = useExercises();

  // A student can only ever read their own submissions — the database rules
  // see to that — so sending them to their own report is a redirect, not a
  // permission check. The real boundary is in database.rules.json.
  const isTeacher = session?.role === 'teacher';
  const targetId = isTeacher ? studentId : session?.id;

  const name = useMemo(() => {
    if (!isTeacher) return session?.name ?? '';
    return students.find((s) => s.uid === targetId)?.displayName ?? 'Student';
  }, [isTeacher, session, students, targetId]);

  const data = useMemo(
    () => (targetId ? studentAnalytics(targetId, name, submissions, exercises) : null),
    [targetId, name, submissions, exercises],
  );

  if (!session) return <Navigate to="/signin" replace />;
  if (!targetId) return <Navigate to="/" replace />;
  if (loading || exercisesLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-ink-100" />;
  }
  if (!data) return null;

  const attempted = data.exercises.filter((e) => e.attempts > 0);
  const approved = data.exercises.filter((e) => e.approved);
  const generated = new Date();

  return (
    <div className="space-y-6">
      {/* Toolbar — excluded from the printed page. */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          to={isTeacher ? '/teacher/analytics' : '/progress'}
          className="text-sm text-ink-500 hover:text-ink-800"
        >
          {t('report.back')}
        </Link>
        <button onClick={() => window.print()} className="btn-primary px-4 py-2 text-sm">
          {t('report.saveAsPdf')}
        </button>
      </div>

      {attempted.length === 0 ? (
        <EmptyState title={t('report.empty')}>
          {isTeacher ? t('report.emptyTeacher') : t('report.emptyStudent')}
        </EmptyState>
      ) : (
        <article className="print-sheet card space-y-8 p-8">
          <header className="border-b border-ink-200 pb-5">
            <p className="text-xs tracking-widest text-ink-500 uppercase">{t('report.kicker')}</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink-900">{name}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {generated.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </header>

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              {t('report.atAGlance')}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure
                label={t('report.exercisesCompleted')}
                value={`${approved.length}/${data.exercises.length}`}
              />
              <Figure label={t('report.averageScore')} value={data.averageScore || '—'} />
              <Figure label={t('report.submissions')} value={data.totalAttempts} />
              <Figure
                label={t('report.turnaround')}
                value={formatDuration(data.medianTimeToApproval)}
                small
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              {t('report.whatThisTeaches')}
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-700">
              {t('report.whatThisTeachesBody')}
            </p>
          </section>

          {data.trend.length > 1 && (
            <section className="break-inside-avoid">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
                {t('report.scoresAcross')}
              </h2>
              <div className="mt-3">
                <TrendLine
                  points={data.trend.map((point) => ({
                    label: String(point.order),
                    sublabel: point.title,
                    value: Math.round(point.score),
                  }))}
                  barLabel={t('report.passingLabel', { score: PASSING_SCORE })}
                />
              </div>
            </section>
          )}

          {data.velocity && (
            <section className="break-inside-avoid">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
                {t('report.improvement')}
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-700">
                {tn('report.improvementLine', data.velocity.sample, {
                  name: name.split(' ')[0],
                  first: data.velocity.firstMean,
                  approved: data.velocity.approvedMean,
                })}
                {data.velocity.gain > 0 && t('report.improvementGain', { n: data.velocity.gain })}.{' '}
                {data.velocity.perAttempt === null
                  ? t('report.improvementFirstTime')
                  : t('report.improvementPerAttempt', { n: data.velocity.perAttempt })}
              </p>
            </section>
          )}

          <section className="break-inside-avoid">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              {t('report.skills')}
            </h2>
            <div className="mt-3">
              <BarChart
                data={RUBRIC_KEYS.map((key) => ({
                  label: t(`rubric.${key}.label`),
                  value: Math.round(data.dimensionMeans[key]),
                  tone: 'score' as const,
                }))}
                labelWidth="w-36"
              />
            </div>
            <dl className="mt-4 space-y-2">
              {RUBRIC_KEYS.map((key) => (
                <div key={key} className="text-sm">
                  <dt className="inline font-medium text-ink-800">{t(`rubric.${key}.label`)}: </dt>
                  <dd className="inline text-ink-600">{t(`rubric.${key}.description`)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="break-inside-avoid">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              {t('report.exerciseByExercise')}
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left">
                  <th className="py-2 pr-4 font-medium text-ink-500">{t('common.exercise')}</th>
                  <th className="py-2 pr-4 font-medium text-ink-500">{t('common.attempts')}</th>
                  <th className="py-2 pr-4 font-medium text-ink-500">{t('common.score')}</th>
                  <th className="py-2 font-medium text-ink-500">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {attempted.map((e) => (
                  <tr key={e.exerciseId} className="border-b border-ink-100 last:border-0">
                    <td className="py-2 pr-4 text-ink-800">
                      <span className="text-ink-400">{e.order}.</span> {e.title}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-ink-700">{e.attempts}</td>
                    <td
                      className={`py-2 pr-4 font-medium tabular-nums ${
                        e.bestScore !== undefined ? scoreTone(e.bestScore) : 'text-ink-400'
                      }`}
                    >
                      {e.bestScore !== undefined ? Math.round(e.bestScore) : '—'}
                    </td>
                    <td className="py-2 text-ink-600">
                      {e.approved ? t('report.completed') : t('report.inProgress')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer className="border-t border-ink-200 pt-4">
            <p className="text-xs leading-relaxed text-ink-500">
              {t('report.footer')}
              {data.lastActivityAt !== null && (
                <> {t('report.lastActivity', { when: relativeTime(data.lastActivityAt) })}</>
              )}
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}

function Figure({
  label,
  value,
  small,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-xs tracking-wide text-ink-500 uppercase">{label}</p>
      <p className={`mt-1 font-semibold text-ink-900 ${small ? 'text-base' : 'text-2xl'}`}>
        {value}
      </p>
    </div>
  );
}
