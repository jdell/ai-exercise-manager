import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useStudentProgress, useSubmissions } from '../hooks/useData';
import { EXERCISE_BY_ID, EXERCISES } from '../data/exercises';
import { describeError, evaluateSubmission, runStudentPrompt } from '../lib/claude';
import { createSubmission, newId } from '../lib/store';
import {
  Alert,
  EmptyState,
  Panel,
  RubricBreakdown,
  ScoreRing,
  Spinner,
  StatusBadge,
  relativeTime,
} from '../components/ui';
import { PASSING_SCORE } from '../data/rubric';
import type { Submission } from '../types';

const MIN_REFLECTION = 40;

export default function ExerciseWorkspace() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { session } = useSession();
  const { submissions, loading } = useSubmissions();
  const progress = useStudentProgress(session?.id, submissions);

  const exercise = exerciseId ? EXERCISE_BY_ID[exerciseId] : undefined;
  const entry = exerciseId ? progress.get(exerciseId) : undefined;

  const attempts = useMemo(
    () => (entry?.attempts ?? []).slice().sort((a, b) => b.attempt - a.attempt),
    [entry],
  );
  const latest = attempts[0];

  const [prompt, setPrompt] = useState('');
  const [reflection, setReflection] = useState('');
  const [output, setOutput] = useState('');
  /** True once a test run has produced output for the prompt currently shown. */
  const [outputFor, setOutputFor] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [showBrief, setShowBrief] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const seeded = useRef(false);

  // Seed the editor once submissions have loaded: from the last attempt if
  // there is one, else the exercise's starter scaffold.
  useEffect(() => {
    if (seeded.current || !exercise || loading) return;
    seeded.current = true;
    setPrompt(latest?.prompt ?? exercise.starterPrompt);
    setReflection(latest?.status === 'needs_revision' ? (latest.reflection ?? '') : '');
  }, [exercise, loading, latest]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!exercise) return <Navigate to="/" replace />;
  if (!session) return <Navigate to="/signin" replace />;

  // The lock is derived from submissions, so it is meaningless until they have
  // loaded — checking early would bounce a deep link to an unlocked exercise.
  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-ink-100" />;
  if (entry?.state === 'locked') return <Navigate to="/" replace />;

  const state = entry?.state ?? 'available';
  const readOnly = state === 'in_review' || state === 'approved';
  const reflectionShort = reflection.trim().length < MIN_REFLECTION;
  const canSubmit = prompt.trim().length > 0 && !reflectionShort && !submitting && !running;

  async function handleTestRun() {
    if (!exercise) return;
    setError('');
    setOutput('');
    setOutputFor(null);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const promptSnapshot = prompt;
    try {
      const result = await runStudentPrompt(
        exercise.id,
        promptSnapshot,
        (chunk) => setOutput((prev) => prev + chunk),
        controller.signal,
      );
      setOutput(result.output);
      setOutputFor(promptSnapshot);
    } catch (err) {
      if (!controller.signal.aborted) setError(describeError(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  /**
   * Submitting writes the attempt, then hands its id to the evaluator.
   *
   * The browser deliberately does not send the output it saw during a test run.
   * The function re-runs the recorded prompt itself and writes both the
   * transcript and the score with admin credentials, so what gets graded is
   * what was actually submitted — a student cannot paste in a better answer
   * than their prompt produced.
   */
  async function handleSubmit() {
    if (!exercise || !session) return;
    setError('');
    setSubmitting(true);

    const attemptNumber = (entry?.attempts.length ?? 0) + 1;
    const now = Date.now();
    const submission: Submission = {
      id: newId('sub'),
      studentId: session.id,
      studentName: session.name,
      exerciseId: exercise.id,
      exerciseOrder: exercise.order,
      attempt: attemptNumber,
      prompt,
      reflection: reflection.trim(),
      output: '',
      status: 'evaluating',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createSubmission(submission);

      setStage('Running your prompt and scoring it…');
      setOutput('');
      setOutputFor(null);
      const result = await evaluateSubmission(submission.id);
      setOutput(result.output);
      setStage('');
    } catch (err) {
      // The function records the failure on the submission itself, so the
      // attempt shows as errored in both dashboards without a second write
      // from here.
      setError(describeError(err));
      setStage('');
    } finally {
      setSubmitting(false);
    }
  }

  const nextEx = EXERCISES.find((e) => e.order === exercise.order + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/" className="text-sm text-ink-500 hover:text-ink-800">
          ← All exercises
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">
            <span className="text-ink-400">{exercise.order}.</span> {exercise.title}
          </h1>
          {latest && <StatusBadge status={latest.status} />}
        </div>
        <p className="mt-1 text-sm text-ink-500">{exercise.tagline}</p>
      </div>

      {state === 'approved' && (
        <Alert tone="success">
          This exercise is approved.{' '}
          {nextEx ? (
            <Link to={`/exercise/${nextEx.id}`} className="font-medium underline">
              Continue to {nextEx.title}
            </Link>
          ) : (
            'You have finished the whole track.'
          )}
        </Alert>
      )}

      {state === 'in_review' && (
        <Alert tone="info">
          Attempt {latest?.attempt} is submitted and waiting for your teacher. You will be able to
          submit again if they ask for a revision.
        </Alert>
      )}

      {state === 'revision' && latest?.review?.comment && (
        <Alert tone="warning">
          <span className="font-medium">Your teacher asked for another attempt:</span>{' '}
          {latest.review.comment}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Brief */}
          <Panel
            title="The exercise"
            action={
              <button onClick={() => setShowBrief((v) => !v)} className="btn-ghost px-2 py-1 text-xs">
                {showBrief ? 'Hide' : 'Show'}
              </button>
            }
          >
            {showBrief ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-ink-700">{exercise.brief}</p>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
                  <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                    Your task
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-800">{exercise.task}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    What good looks like
                  </h3>
                  <ul className="space-y-1.5">
                    {exercise.successCriteria.map((c) => (
                      <li key={c} className="flex gap-2 text-sm text-ink-700">
                        <span aria-hidden="true" className="mt-0.5 text-emerald-500">
                          ✓
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="truncate text-sm text-ink-500">{exercise.task}</p>
            )}
          </Panel>

          {/* Prompt editor */}
          <Panel
            title="Your prompt"
            subtitle={
              exercise.testInput
                ? 'Runs against the fixed material shown below, so every attempt is comparable.'
                : 'Runs exactly as written.'
            }
            action={
              <div className="flex items-center gap-2">
                {running ? (
                  <button onClick={() => abortRef.current?.abort()} className="btn-secondary px-3 py-1.5 text-xs">
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleTestRun}
                    disabled={!prompt.trim() || submitting || readOnly}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Test run
                  </button>
                )}
              </div>
            }
          >
            <textarea
              className="textarea min-h-[16rem]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={readOnly || submitting}
              spellCheck={false}
              placeholder="Write your prompt here…"
              aria-label="Your prompt"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="hint">Test runs are unlimited and are never graded.</p>
              <p className="hint tabular-nums">{prompt.length} chars</p>
            </div>

            {exercise.testInput && (
              <details className="mt-4 rounded-lg border border-ink-200 bg-ink-50">
                <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-700">
                  Material your prompt runs against
                </summary>
                <pre className="scroll-slim max-h-64 overflow-auto border-t border-ink-200 px-3.5 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-600">
                  {exercise.testInput}
                </pre>
              </details>
            )}
          </Panel>

          {/* Output */}
          <Panel
            title="What Claude produced"
            subtitle={running ? 'Streaming…' : outputFor ? 'From your latest test run' : undefined}
            action={running ? <Spinner className="h-4 w-4 text-indigo-500" /> : undefined}
          >
            {output || running ? (
              <pre className="scroll-slim prose-output max-h-[28rem] overflow-auto rounded-lg bg-ink-50 p-4 text-ink-800">
                {output}
                {running && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-indigo-500 align-text-bottom" />}
              </pre>
            ) : (
              <EmptyState title="No output yet">
                Hit <span className="font-medium">Test run</span> to see what your prompt produces.
              </EmptyState>
            )}
          </Panel>

          {/* Reflection + submit */}
          <Panel
            title="Reflection"
            subtitle="Explain why your prompt works — this is 30% of your score."
          >
            <textarea
              className="input min-h-[9rem] resize-y"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              disabled={readOnly || submitting}
              placeholder="What techniques did you use, and why does each one change the output? What did you try that didn't work? Where would this prompt break?"
              aria-label="Reflection"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className={`hint ${reflectionShort && reflection.length > 0 ? 'text-amber-600' : ''}`}>
                {reflectionShort
                  ? `At least ${MIN_REFLECTION} characters — currently ${reflection.trim().length}.`
                  : 'Naming the mechanism scores higher than describing the result.'}
              </p>
            </div>

            {error && (
              <div className="mt-4">
                <Alert>{error}</Alert>
              </div>
            )}

            {!readOnly && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
                <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
                  {submitting && <Spinner />}
                  {submitting ? 'Submitting…' : `Submit attempt ${(entry?.attempts.length ?? 0) + 1}`}
                </button>
                {stage && <span className="text-sm text-ink-500">{stage}</span>}
                {!submitting && (
                  <span className="hint">
                    Submitting re-runs your prompt on the server, then scores what it produced.
                  </span>
                )}
              </div>
            )}
          </Panel>

          {/* Attempt history */}
          {attempts.length > 0 && (
            <Panel title={`Your attempts (${attempts.length})`}>
              <div className="space-y-4">
                {attempts.map((a) => (
                  <AttemptCard key={a.id} submission={a} />
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Panel title="Tips">
            <ul className="space-y-2.5">
              {exercise.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                  <span aria-hidden="true" className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>

          {latest?.evaluation && (
            <Panel title={`Attempt ${latest.attempt} score`}>
              <div className="mb-4 flex items-center gap-4">
                <ScoreRing score={latest.review?.finalScore ?? latest.evaluation.weightedTotal} />
                <div className="text-sm">
                  <p className="font-medium text-ink-900">
                    {(latest.review?.finalScore ?? latest.evaluation.weightedTotal) >= PASSING_SCORE
                      ? 'Clears the bar'
                      : 'Below the bar'}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {latest.review ? 'Teacher-reviewed' : 'Claude score, pending review'}
                  </p>
                </div>
              </div>
              <RubricBreakdown
                scores={latest.evaluation.scores}
                overrides={latest.review?.overrides}
              />
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function AttemptCard({ submission }: { submission: Submission }) {
  const [open, setOpen] = useState(false);
  const score = submission.review?.finalScore ?? submission.evaluation?.weightedTotal ?? 0;

  return (
    <div className="rounded-lg border border-ink-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-100 text-xs font-semibold text-ink-600">
          {submission.attempt}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={submission.status} />
            <span className="text-xs text-ink-400">{relativeTime(submission.createdAt)}</span>
          </div>
        </div>
        {submission.evaluation && (
          <span className="text-sm font-semibold tabular-nums text-ink-700">{Math.round(score)}</span>
        )}
        <span aria-hidden="true" className="text-ink-400">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="animate-in space-y-4 border-t border-ink-200 px-4 py-4">
          {submission.status === 'error' && <Alert>{submission.error}</Alert>}

          {submission.evaluation && (
            <>
              <p className="text-sm leading-relaxed text-ink-700">{submission.evaluation.summary}</p>
              <RubricBreakdown
                scores={submission.evaluation.scores}
                overrides={submission.review?.overrides}
                rationale={submission.evaluation.rationale}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FeedbackList
                  title="Strengths"
                  items={submission.evaluation.strengths}
                  tone="emerald"
                />
                <FeedbackList
                  title="Next time"
                  items={submission.evaluation.improvements}
                  tone="amber"
                />
              </div>
            </>
          )}

          {submission.review?.comment && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5">
              <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                Teacher comment
              </p>
              <p className="text-sm leading-relaxed text-ink-800">{submission.review.comment}</p>
            </div>
          )}

          <details className="rounded-lg border border-ink-200 bg-ink-50">
            <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-700">
              Prompt and output from this attempt
            </summary>
            <div className="space-y-3 border-t border-ink-200 px-3.5 py-3">
              <div>
                <p className="hint mb-1 font-medium">Prompt</p>
                <pre className="prose-output rounded bg-white p-3 font-mono text-ink-700">
                  {submission.prompt}
                </pre>
              </div>
              <div>
                <p className="hint mb-1 font-medium">Output</p>
                <pre className="prose-output scroll-slim max-h-72 overflow-auto rounded bg-white p-3 text-ink-700">
                  {submission.output || '(none)'}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'emerald' | 'amber';
}) {
  if (!items.length) return null;
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
            <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
