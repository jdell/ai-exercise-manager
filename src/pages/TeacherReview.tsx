import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useSubmissions } from '../hooks/useData';
import { EXERCISE_BY_ID } from '../data/exercises';
import { PASSING_SCORE, RUBRIC, weightedTotal } from '../data/rubric';
import { describeError, evaluateSubmission } from '../lib/claude';
import { saveReview } from '../lib/store';
import {
  Alert,
  Panel,
  ScoreRing,
  Spinner,
  StatusBadge,
  relativeTime,
  scoreTone,
} from '../components/ui';
import { FeedbackList } from './ExerciseWorkspace';
import type { RubricKey } from '../types';

export default function TeacherReview() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { session } = useSession();
  const navigate = useNavigate();
  const { submissions, loading } = useSubmissions();

  const submission = submissions.find((s) => s.id === submissionId);
  const [overrides, setOverrides] = useState<Partial<Record<RubricKey, number>>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'approve' | 'revision' | 'reeval' | null>(null);
  const [error, setError] = useState('');
  const [seededFrom, setSeededFrom] = useState<string | null>(null);

  // Seed the form from an existing review when opening a reviewed submission.
  if (submission && seededFrom !== submission.id) {
    setSeededFrom(submission.id);
    setOverrides(submission.review?.overrides ?? {});
    setComment(submission.review?.comment ?? '');
  }

  const priorAttempts = useMemo(
    () =>
      submissions
        .filter(
          (s) =>
            submission &&
            s.studentId === submission.studentId &&
            s.exerciseId === submission.exerciseId &&
            s.attempt < submission.attempt,
        )
        .sort((a, b) => a.attempt - b.attempt),
    [submissions, submission],
  );

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-ink-100" />;
  if (!submission) return <Navigate to="/teacher" replace />;

  const exercise = EXERCISE_BY_ID[submission.exerciseId];
  const claudeScores = submission.evaluation?.scores;
  const effective = RUBRIC.reduce<Record<RubricKey, number>>(
    (acc, dim) => {
      acc[dim.key] = overrides[dim.key] ?? claudeScores?.[dim.key] ?? 0;
      return acc;
    },
    {} as Record<RubricKey, number>,
  );
  const finalScore = weightedTotal(effective);
  const changed = Object.keys(overrides).length > 0;

  async function decide(decision: 'approved' | 'revision') {
    if (!submission || !session) return;
    if (decision === 'revision' && !comment.trim()) {
      setError('Tell the student what to change before requesting a revision.');
      return;
    }
    setError('');
    setBusy(decision === 'approved' ? 'approve' : 'revision');
    try {
      await saveReview(submission.id, {
        status: decision === 'approved' ? 'approved' : 'needs_revision',
        review: {
          overrides,
          finalScore,
          comment: comment.trim(),
          reviewedAt: Date.now(),
          reviewedBy: session.name,
          decision,
        },
      });
      navigate('/teacher');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  // Re-grading is server-side: the function reads the recorded prompt and
  // output and writes the new evaluation itself, so there is nothing to save
  // from here. The subscription picks up the change.
  async function reEvaluate() {
    if (!submission) return;
    setError('');
    setBusy('reeval');
    try {
      await evaluateSubmission(submission.id);
      setOverrides({});
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher" className="text-sm text-ink-500 hover:text-ink-800">
          ← Review queue
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">{submission.studentName}</h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {exercise?.title ?? submission.exerciseId} · attempt {submission.attempt} ·{' '}
          {relativeTime(submission.createdAt)}
          {priorAttempts.length > 0 && ` · ${priorAttempts.length} earlier attempt${priorAttempts.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {submission.status === 'error' && (
        <Alert tone="warning">
          This attempt failed before it was scored: {submission.error}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left: the work */}
        <div className="min-w-0 space-y-6">
          <Panel title="What the student was asked to do">
            <p className="text-sm leading-relaxed text-ink-700">{exercise?.task}</p>
            <ul className="mt-3 space-y-1.5 border-t border-ink-200 pt-3">
              {exercise?.successCriteria.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-ink-600">
                  <span aria-hidden="true" className="mt-0.5 text-ink-400">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Their prompt">
            <pre className="prose-output scroll-slim max-h-96 overflow-auto rounded-lg bg-ink-50 p-4 font-mono text-ink-800">
              {submission.prompt}
            </pre>
          </Panel>

          <Panel title="What it produced">
            <pre className="prose-output scroll-slim max-h-96 overflow-auto rounded-lg bg-ink-50 p-4 text-ink-800">
              {submission.output || '(no output captured)'}
            </pre>
          </Panel>

          <Panel title="Their reflection">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
              {submission.reflection || '(left blank)'}
            </p>
          </Panel>

          {submission.evaluation && (
            <Panel
              title="Claude's assessment"
              subtitle={`${submission.evaluation.model} · ${relativeTime(submission.evaluation.evaluatedAt)}`}
              action={
                <button onClick={reEvaluate} disabled={busy !== null} className="btn-secondary px-3 py-1.5 text-xs">
                  {busy === 'reeval' && <Spinner className="h-3 w-3" />}
                  Re-evaluate
                </button>
              }
            >
              <p className="text-sm leading-relaxed text-ink-700">{submission.evaluation.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FeedbackList title="Strengths" items={submission.evaluation.strengths} tone="emerald" />
                <FeedbackList title="Improvements" items={submission.evaluation.improvements} tone="amber" />
              </div>
            </Panel>
          )}

          {priorAttempts.length > 0 && (
            <Panel title="Earlier attempts">
              <div className="space-y-2">
                {priorAttempts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-ink-200 px-3.5 py-2.5"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-ink-100 text-xs font-semibold text-ink-600">
                      {p.attempt}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-600">
                      {p.evaluation?.summary ?? '(not scored)'}
                    </span>
                    {p.evaluation && (
                      <span
                        className={`text-sm font-semibold tabular-nums ${scoreTone(p.review?.finalScore ?? p.evaluation.weightedTotal)}`}
                      >
                        {Math.round(p.review?.finalScore ?? p.evaluation.weightedTotal)}
                      </span>
                    )}
                    <Link to={`/teacher/review/${p.id}`} className="text-xs text-indigo-600 hover:underline">
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right: scoring */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Panel title="Final score" subtitle={changed ? 'Adjusted from Claude' : "Claude's scores"}>
            <div className="mb-5 flex items-center gap-4">
              <ScoreRing score={finalScore} size={80} />
              <div>
                <p className={`text-sm font-medium ${finalScore >= PASSING_SCORE ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {finalScore >= PASSING_SCORE ? 'Clears the bar' : `Below ${PASSING_SCORE}`}
                </p>
                {submission.evaluation && (
                  <p className="mt-0.5 text-xs text-ink-500">
                    Claude: {submission.evaluation.weightedTotal}
                    {changed && ` → you: ${finalScore}`}
                  </p>
                )}
                {changed && (
                  <button
                    onClick={() => setOverrides({})}
                    className="mt-1.5 text-xs text-indigo-600 hover:underline"
                  >
                    Reset to Claude's scores
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {RUBRIC.map((dim) => {
                const claude = claudeScores?.[dim.key] ?? 0;
                const value = overrides[dim.key] ?? claude;
                const isOverride = overrides[dim.key] !== undefined;
                return (
                  <div key={dim.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <label htmlFor={`score-${dim.key}`} className="text-sm font-medium text-ink-700">
                        {dim.label}
                        <span className="ml-1.5 text-xs font-normal text-ink-400">
                          {Math.round(dim.weight * 100)}%
                        </span>
                      </label>
                      <span className={`text-sm font-semibold tabular-nums ${scoreTone(value)}`}>
                        {value}
                        {isOverride && (
                          <span className="ml-1 text-xs font-normal text-ink-400">was {claude}</span>
                        )}
                      </span>
                    </div>
                    <input
                      id={`score-${dim.key}`}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={value}
                      onChange={(e) =>
                        setOverrides((prev) => ({ ...prev, [dim.key]: Number(e.target.value) }))
                      }
                      className="w-full accent-indigo-600"
                    />
                    {submission.evaluation?.rationale?.[dim.key] && (
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">
                        {submission.evaluation.rationale[dim.key]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Comment to the student" subtitle="Required when requesting a revision.">
            <textarea
              className="input min-h-[7rem] resize-y"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What specifically should change on the next attempt?"
              aria-label="Comment to the student"
            />
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => decide('approved')}
                disabled={busy !== null}
                className="btn-success w-full"
              >
                {busy === 'approve' && <Spinner />}
                Approve &amp; unlock next
              </button>
              <button
                onClick={() => decide('revision')}
                disabled={busy !== null}
                className="btn-danger w-full"
              >
                {busy === 'revision' && <Spinner />}
                Request a revision
              </button>
            </div>
            <p className="hint mt-3">
              Approving records the score above and opens the next exercise for this student.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
