import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useExercises, useStudents, useSubmissions } from '../hooks/useData';
import { useClassFilter } from '../context/ClassContext';
import { classAnalytics, formatDuration, formatPercent, studentAnalytics } from '../lib/analytics';
import { BarChart, DivergingBars } from '../components/charts';
import { ClassScopeNote, EmptyState, Panel, SkeletonPage, scoreTone } from '../components/ui';

/**
 * Class-level analytics. Everything is derived from /submissions on read.
 *
 * The framing throughout is that a low number is a signal about the *exercise*
 * or the *rubric*, not about the students — an exercise nobody passes first
 * time is usually under-specified, and a dimension where teachers consistently
 * overrule Claude is usually a criteria-wording problem.
 */
export default function TeacherAnalytics() {
  const { submissions: allSubmissions, loading } = useSubmissions();
  const { students: allStudents } = useStudents();
  const { exercises, loading: exercisesLoading } = useExercises();
  const { filterStudents, filterSubmissions } = useClassFilter();
  const [showTable, setShowTable] = useState(false);

  // The class lens is applied to the *inputs*, not to the figures. Every number
  // below is still derived by the same functions over the same shape of data —
  // a filtered class analytic is the analytic of a smaller class, not a
  // different calculation. See ClassContext.
  const students = useMemo(() => filterStudents(allStudents), [filterStudents, allStudents]);
  const submissions = useMemo(
    () => filterSubmissions(allSubmissions),
    [filterSubmissions, allSubmissions],
  );

  const studentIds = useMemo(() => students.map((s) => s.uid), [students]);
  const data = useMemo(
    () => classAnalytics(submissions, exercises, studentIds),
    [submissions, exercises, studentIds],
  );

  const perStudent = useMemo(
    () =>
      students
        .map((s) => studentAnalytics(s.uid, s.displayName, submissions, exercises))
        .filter((s) => s.totalAttempts > 0)
        .sort((a, b) => (b.velocity?.gain ?? -Infinity) - (a.velocity?.gain ?? -Infinity)),
    [students, submissions, exercises],
  );

  if (loading || exercisesLoading) {
    return <SkeletonPage panels={3} />;
  }

  const attempted = data.exercises.filter((e) => e.attempted > 0);
  const diverging = data.exercises.filter((e) => e.divergenceSample > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Class analytics</h1>
        <p className="mt-1 text-sm text-ink-500">
          Where the track is working, where Claude and the teachers disagree, and how fast students
          are improving.
        </p>
        <ClassScopeNote count={students.length} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Students active" value={perStudent.length} />
        <Stat
          label="Median time to approval"
          value={formatDuration(data.medianTimeToApproval)}
          small
        />
        <Stat
          label="Mean override"
          value={
            data.divergenceSample
              ? `${data.meanDivergence > 0 ? '+' : ''}${data.meanDivergence}`
              : '—'
          }
        />
        <Stat
          label="Mean gain to approval"
          value={data.velocity ? `+${data.velocity.gain}` : '—'}
        />
      </div>

      {!attempted.length && (
        <EmptyState title="No submissions yet">
          Analytics fill in as students work through the track.
        </EmptyState>
      )}

      {attempted.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            <Panel
              title="Hardest exercises"
              subtitle="Lowest pass rate first, counting only students who have attempted each one."
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
                      <th className="py-2 pr-4 font-medium text-ink-500">Pass</th>
                      <th className="py-2 pr-4 font-medium text-ink-500">First time</th>
                      <th className="py-2 pr-4 font-medium text-ink-500">Mean</th>
                      <th className="py-2 font-medium text-ink-500">Median time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hardest.map((e) => (
                      <tr key={e.exerciseId} className="border-b border-ink-100 last:border-0">
                        <td className="py-2 pr-4 text-ink-800">
                          <span className="text-ink-400">{e.order}.</span> {e.title}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-ink-700">
                          {e.approved}/{e.attempted}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-ink-700">
                          {formatPercent(e.firstTimeRate)}
                        </td>
                        <td className={`py-2 pr-4 tabular-nums ${scoreTone(e.meanScore)}`}>
                          {e.meanScore || '—'}
                        </td>
                        <td className="py-2 text-ink-600">
                          {formatDuration(e.medianTimeToApproval)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <BarChart
                  data={data.hardest.map((e) => ({
                    label: e.title,
                    value: Math.round(e.passRate * 100),
                    display: `${formatPercent(e.passRate)} · ${e.approved}/${e.attempted}`,
                  }))}
                />
              )}
              <p className="hint mt-3">
                A low pass rate is usually a signal about the exercise rather than the students —
                under-specified success criteria are the most common cause.
              </p>
            </Panel>

            <Panel
              title="Claude versus teachers"
              subtitle="Mean adjustment per exercise, across reviews where a teacher moved a dimension."
            >
              {diverging.length === 0 ? (
                <EmptyState title="No overrides recorded">
                  Teachers have accepted Claude's scores on every review so far.
                </EmptyState>
              ) : (
                <>
                  <DivergingBars
                    data={diverging.map((e) => ({
                      label: e.title,
                      value: e.divergence,
                    }))}
                    negativeLabel="Teachers scored lower"
                    positiveLabel="Teachers scored higher"
                  />
                  <p className="hint mt-4">
                    Reviews where a teacher accepted Claude's score are excluded — averaging those
                    in would wash out the signal. A large bar on one exercise usually means its
                    grading guidance reads differently to a human than it does to the model.
                  </p>
                </>
              )}
            </Panel>

            <Panel
              title="Time to approval"
              subtitle="Median elapsed time from a student's first attempt to the approving review."
            >
              <BarChart
                data={attempted
                  .filter((e) => e.medianTimeToApproval !== null)
                  .map((e) => ({
                    label: e.title,
                    value: e.medianTimeToApproval!,
                    display: formatDuration(e.medianTimeToApproval),
                  }))}
                max={Math.max(
                  1,
                  ...attempted.map((e) => e.medianTimeToApproval ?? 0),
                )}
              />
              <p className="hint mt-3">
                This measures the whole loop, including how long submissions waited in the review
                queue — a long bar is not necessarily a hard exercise.
              </p>
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel title="Learning velocity" subtitle="Improvement between first attempt and approval.">
              {!data.velocity ? (
                <EmptyState title="Not enough history">
                  Fills in once students have exercises approved.
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-ink-700">
                    Across {data.velocity.sample} student
                    {data.velocity.sample === 1 ? '' : 's'}, first attempts average{' '}
                    <strong className="tabular-nums">{data.velocity.firstMean}</strong> and approved
                    work averages{' '}
                    <strong className="tabular-nums">{data.velocity.approvedMean}</strong>.
                  </p>
                  <p className="text-sm leading-relaxed text-ink-600">
                    That is <strong>+{data.velocity.gain}</strong> points over{' '}
                    {data.velocity.attemptsToApproval} attempts on average
                    {data.velocity.perAttempt !== null
                      ? `, or ${data.velocity.perAttempt} points per revision.`
                      : '.'}
                  </p>
                  <p className="hint">
                    Averaged per student rather than pooled, so a prolific student cannot dominate
                    the figure.
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="Per student" subtitle="Sorted by gain to approval.">
              <div className="space-y-2">
                {perStudent.map((s) => (
                  <Link
                    key={s.studentId}
                    to={`/report/${s.studentId}`}
                    className="flex items-center gap-3 rounded-lg border border-ink-200 px-3 py-2.5 transition-colors hover:border-indigo-300 hover:bg-ink-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                      {s.studentName}
                    </span>
                    <span className="shrink-0 text-xs text-ink-500 tabular-nums">
                      {s.approvedCount}/{s.exercises.length}
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${
                        s.velocity && s.velocity.gain > 0 ? 'text-emerald-600' : 'text-ink-400'
                      }`}
                    >
                      {s.velocity ? `${s.velocity.gain > 0 ? '+' : ''}${s.velocity.gain}` : '—'}
                    </span>
                  </Link>
                ))}
              </div>
              <p className="hint mt-3">Opens a printable report for that student.</p>
            </Panel>
          </aside>
        </div>
      )}
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
