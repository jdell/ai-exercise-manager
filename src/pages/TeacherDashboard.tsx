import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useExercises, useStudents, useSubmissions } from '../hooks/useData';
import { PASSING_SCORE } from '../data/rubric';
import {
  EmptyState,
  IntegrityBadge,
  Panel,
  ScoreRing,
  StatusBadge,
  relativeTime,
  scoreTone,
} from '../components/ui';
import type { Submission, SubmissionStatus } from '../types';

type Filter = 'queue' | 'all' | SubmissionStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'queue', label: 'Needs review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_revision', label: 'Revisions' },
  { value: 'error', label: 'Failed' },
  { value: 'all', label: 'All' },
];

export default function TeacherDashboard() {
  const { submissions, loading } = useSubmissions();
  const { students } = useStudents();
  const { exercises, byId } = useExercises();
  const [filter, setFilter] = useState<Filter>('queue');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const queue = submissions.filter((s) => s.status === 'awaiting_review').length;
    const graded = submissions.filter((s) => s.evaluation);
    const average = graded.length
      ? Math.round(
          (graded.reduce(
            (sum, s) => sum + (s.review?.finalScore ?? s.evaluation!.weightedTotal),
            0,
          ) /
            graded.length) *
            10,
        ) / 10
      : 0;
    const belowBar = graded.filter(
      (s) => (s.review?.finalScore ?? s.evaluation!.weightedTotal) < PASSING_SCORE,
    ).length;
    return { queue, average, belowBar, total: submissions.length };
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      const matchesFilter =
        filter === 'all' ? true : filter === 'queue' ? s.status === 'awaiting_review' : s.status === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      const exercise = byId[s.exerciseId]?.title ?? '';
      return (
        s.studentName.toLowerCase().includes(q) ||
        exercise.toLowerCase().includes(q) ||
        s.prompt.toLowerCase().includes(q)
      );
    });
  }, [submissions, filter, query, byId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Review queue</h1>
        <p className="mt-1 text-sm text-ink-500">
          Claude has scored these. Nothing counts until you approve it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Awaiting review" value={counts.queue} accent={counts.queue > 0} />
        <Stat label="Active students" value={students.length} />
        <Stat label="Class average" value={counts.average || '—'} />
        <Stat label="Below the bar" value={counts.belowBar} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {f.label}
              {f.value === 'queue' && counts.queue > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-amber-950">
                  {counts.queue}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          className="input ml-auto max-w-xs"
          placeholder="Search student, exercise, prompt…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search submissions"
        />
      </div>

      {loading && <div className="h-64 animate-pulse rounded-xl bg-ink-100" />}

      {!loading && filtered.length === 0 && (
        <EmptyState title={filter === 'queue' ? 'Queue is clear' : 'Nothing matches that filter'}>
          {filter === 'queue' && 'Every submitted attempt has been reviewed.'}
        </EmptyState>
      )}

      <div className="space-y-3">
        {filtered.map((s) => (
          <SubmissionRow
            key={s.id}
            submission={s}
            exerciseTitle={byId[s.exerciseId]?.title ?? s.exerciseId}
          />
        ))}
      </div>

      <Panel
        title="Coverage by exercise"
        subtitle="How the class is distributed across the track, custom exercises included."
      >
        <div className="space-y-3">
          {exercises.map((ex) => {
            const forEx = submissions.filter((s) => s.exerciseId === ex.id);
            const approved = new Set(
              forEx.filter((s) => s.status === 'approved').map((s) => s.studentId),
            ).size;
            const waiting = forEx.filter((s) => s.status === 'awaiting_review').length;
            const pct = students.length ? (approved / students.length) * 100 : 0;
            return (
              <div key={ex.id} className="flex items-center gap-4">
                <span className="w-44 shrink-0 truncate text-sm text-ink-700">
                  <span className="text-ink-400">{ex.order}.</span> {ex.title}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-xs text-ink-500 tabular-nums">
                  {approved}/{students.length} approved
                  {waiting > 0 && <span className="ml-1 text-amber-600">· {waiting} waiting</span>}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? 'border-amber-300 bg-amber-50' : ''}`}>
      <p className="text-xs tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{value}</p>
    </div>
  );
}

function SubmissionRow({
  submission,
  exerciseTitle,
}: {
  submission: Submission;
  exerciseTitle: string;
}) {
  const score = submission.review?.finalScore ?? submission.evaluation?.weightedTotal;

  return (
    <Link
      to={`/teacher/review/${submission.id}`}
      className="card animate-in flex items-center gap-4 p-4 transition-all hover:-translate-y-px hover:border-indigo-300 hover:shadow-sm"
    >
      {score !== undefined ? (
        <ScoreRing score={score} size={52} />
      ) : (
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border-2 border-dashed border-ink-300 text-xs text-ink-400">
          —
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink-900">{submission.studentName}</span>
          <span className="text-sm text-ink-400">·</span>
          <span className="text-sm text-ink-600">{exerciseTitle}</span>
          <span className="text-xs text-ink-400">attempt {submission.attempt}</span>
          <StatusBadge status={submission.status} />
          <IntegrityBadge report={submission.evaluation?.integrity} />
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-ink-500">
          {submission.evaluation?.summary ?? submission.prompt.slice(0, 140)}
        </p>
        <p className="mt-1 text-xs text-ink-400">{relativeTime(submission.createdAt)}</p>
      </div>

      {submission.evaluation && (
        <div className="hidden shrink-0 text-right lg:block">
          <p className="text-xs text-ink-400">Claude</p>
          <p className={`text-sm font-medium tabular-nums ${scoreTone(submission.evaluation.weightedTotal)}`}>
            {submission.evaluation.weightedTotal}
          </p>
        </div>
      )}
    </Link>
  );
}
