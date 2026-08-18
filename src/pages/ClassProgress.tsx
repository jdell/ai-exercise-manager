import { Link } from 'react-router-dom';
import { computeProgress, useStudents, useSubmissions } from '../hooks/useData';
import { EXERCISES } from '../data/exercises';
import { EmptyState, Panel, relativeTime, scoreTone } from '../components/ui';
import type { ExerciseState } from '../types';

const CELL: Record<ExerciseState, { className: string; glyph: string; title: string }> = {
  locked: { className: 'bg-ink-100 text-ink-300', glyph: '·', title: 'Locked' },
  available: { className: 'bg-white text-ink-300 border border-dashed border-ink-300', glyph: '', title: 'Available, not started' },
  in_review: { className: 'bg-amber-100 text-amber-700', glyph: '⋯', title: 'Awaiting review' },
  revision: { className: 'bg-rose-100 text-rose-700', glyph: '↻', title: 'Revision requested' },
  approved: { className: 'bg-emerald-500 text-white', glyph: '✓', title: 'Approved' },
};

export default function ClassProgress() {
  const { students, loading } = useStudents();
  const { submissions } = useSubmissions();

  const rows = students.map((student) => {
    const progress = computeProgress(student.id, submissions);
    const approved = EXERCISES.filter((e) => progress.get(e.id)?.state === 'approved').length;
    const scores = EXERCISES.map((e) => progress.get(e.id)?.best ?? 0).filter((s) => s > 0);
    const average = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
    const pending = EXERCISES.filter((e) => progress.get(e.id)?.state === 'in_review').length;
    return { student, progress, approved, average, pending };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Class progress</h1>
        <p className="mt-1 text-sm text-ink-500">
          Where each student sits in the locked progression.
        </p>
      </div>

      {loading && <div className="h-64 animate-pulse rounded-xl bg-ink-100" />}

      {!loading && students.length === 0 && (
        <EmptyState title="No students yet">
          Students appear here as soon as they sign in.
        </EmptyState>
      )}

      {students.length > 0 && (
        <Panel>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left">
                  <th className="py-2.5 pr-4 font-medium text-ink-500">Student</th>
                  {EXERCISES.map((e) => (
                    <th
                      key={e.id}
                      className="px-1.5 py-2.5 text-center text-xs font-medium text-ink-500"
                      title={e.title}
                    >
                      {e.order}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-medium text-ink-500">Avg</th>
                  <th className="py-2.5 pl-3 text-right font-medium text-ink-500">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, progress, approved, average, pending }) => (
                  <tr key={student.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-ink-900">{student.name}</span>
                      <span className="ml-2 text-xs text-ink-400">
                        {approved}/{EXERCISES.length}
                        {pending > 0 && <span className="ml-1 text-amber-600">· {pending} in review</span>}
                      </span>
                    </td>
                    {EXERCISES.map((e) => {
                      const entry = progress.get(e.id);
                      const state = entry?.state ?? 'locked';
                      const cell = CELL[state];
                      const target = entry?.attempts?.[entry.attempts.length - 1];
                      const content = (
                        <span
                          className={`mx-auto grid h-7 w-7 place-items-center rounded-md text-xs font-semibold ${cell.className}`}
                          title={`${e.title} — ${cell.title}${entry?.best ? ` (${Math.round(entry.best)})` : ''}`}
                        >
                          {cell.glyph}
                        </span>
                      );
                      return (
                        <td key={e.id} className="px-1.5 py-2.5 text-center">
                          {target ? (
                            <Link to={`/teacher/review/${target.id}`}>{content}</Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${average ? scoreTone(average) : 'text-ink-300'}`}>
                      {average || '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-xs text-ink-400">
                      {relativeTime(student.lastSeenAt ?? student.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-ink-200 pt-4">
            {(Object.keys(CELL) as ExerciseState[]).map((state) => (
              <span key={state} className="flex items-center gap-2 text-xs text-ink-500">
                <span
                  className={`grid h-5 w-5 place-items-center rounded text-[10px] font-semibold ${CELL[state].className}`}
                >
                  {CELL[state].glyph}
                </span>
                {CELL[state].title}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
