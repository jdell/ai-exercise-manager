import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { useExercises, useOnline, useStudentProgress, useSubmissions } from '../hooks/useData';
import { useOutbox } from '../hooks/useOutbox';
import { localizeExercise } from '../data/exercises';
import { describeError, evaluateSubmission, runStudentPrompt } from '../lib/claude';
import { createSubmission, newId } from '../lib/store';
import { enqueue } from '../lib/outbox';
import { EMPTY_PARTIAL } from '../lib/partial-json';
import type { PartialEvaluation } from '../lib/partial-json';
import {
  Alert,
  CharCounter,
  CopyButton,
  DifficultyBadge,
  EmptyState,
  KeyHint,
  LiveEvaluation,
  Panel,
  PathChip,
  RevisionTimeline,
  RubricBreakdown,
  ScoreRing,
  SkeletonPage,
  Spinner,
  StatusBadge,
  relativeTime,
} from '../components/ui';
import { useEscapeToGoBack, useSubmitHotkey } from '../hooks/useHotkeys';
import { feedbackToText } from '../lib/feedback-text';
import { PASSING_SCORE, effectiveWeights } from '../data/rubric';
import type { Submission } from '../types';

const MIN_REFLECTION = 40;

export default function ExerciseWorkspace() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { session } = useSession();
  const { t, locale } = useLocale();
  const { submissions, loading } = useSubmissions();
  const { exercises, byId, loading: exercisesLoading } = useExercises();
  const progress = useStudentProgress(session?.id, submissions, exercises);
  const online = useOnline();
  const { pending } = useOutbox();

  // Everything the student reads is localised; what gets submitted and graded
  // is keyed to the canonical exercise, which is why only `exercise` moves.
  const canonical = exerciseId ? byId[exerciseId] : undefined;
  const exercise = useMemo(
    () => (canonical ? localizeExercise(canonical, locale) : undefined),
    [canonical, locale],
  );
  const entry = exerciseId ? progress.get(exerciseId) : undefined;

  const attempts = useMemo(
    () => (entry?.attempts ?? []).slice().sort((a, b) => b.attempt - a.attempt),
    [entry],
  );
  const oldestFirst = useMemo(() => attempts.slice().reverse(), [attempts]);
  const latest = attempts[0];

  const [prompt, setPrompt] = useState('');
  const [reflection, setReflection] = useState('');
  const [output, setOutput] = useState('');
  /** True once a test run has produced output for the prompt currently shown. */
  const [outputFor, setOutputFor] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState('');
  /** Claude's evaluation as it streams in. Cleared once the attempt is stored. */
  const [partial, setPartial] = useState<PartialEvaluation | null>(null);
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

  const state = entry?.state ?? 'available';
  // A queued attempt is submitted work that has not reached the server yet, so
  // the editor locks the same way an in-review one does. Letting a student
  // rewrite a prompt that is already on its way would grade text they can no
  // longer see.
  const queuedHere = pending.find((p) => p.submission.exerciseId === exerciseId);
  const readOnly = state === 'in_review' || state === 'approved' || Boolean(queuedHere);
  const reflectionShort = reflection.trim().length < MIN_REFLECTION;
  const canSubmit = prompt.trim().length > 0 && !reflectionShort && !submitting && !running;

  // Bound to the same condition as the button, so the shortcut can never do
  // something the button would refuse. `handleSubmit` is a hoisted function
  // declaration, which is why it can be named above where it is written.
  useSubmitHotkey(() => void handleSubmit(), canSubmit && !readOnly);
  // Escape leaves only when leaving costs nothing. A prompt in the editor is
  // unsaved work that does not survive unmounting, so while there is one the
  // shortcut is inert — see useEscapeToGoBack.
  useEscapeToGoBack('/', readOnly || (!prompt.trim() && !reflection.trim()));

  if (!session) return <Navigate to="/signin" replace />;

  // The lock is derived from submissions and the exercise list is fetched, so
  // neither is meaningful until both have loaded — checking early would bounce
  // a deep link to a custom or newly unlocked exercise.
  if (loading || exercisesLoading) return <SkeletonPage panels={3} />;
  if (!exercise) return <Navigate to="/" replace />;
  if (entry?.state === 'locked') return <Navigate to="/" replace />;

  const weights = effectiveWeights(exercise.rubricWeights);

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
      // Recorded so the evaluator writes back in the language this attempt was
      // written in, whatever the reader's UI is set to when the feedback is
      // read. The rules accept only 'en' or 'es'.
      locale,
    };

    // Offline: park it and stop. There is no offline grader — the prompt is run
    // and scored by a Cloud Function — so the honest thing is to keep the work
    // and say plainly that nothing is scored yet. The queue carries the prompt
    // and the reflection only; the function still runs the prompt itself when
    // it flushes, so rule 8 holds offline too.
    if (!online) {
      setSubmitting(false);
      if (!enqueue(submission)) setError(t('workspace.queueFull'));
      return;
    }

    try {
      await createSubmission(submission);

      // The test-run output is deliberately discarded here: the function re-runs
      // the recorded prompt itself. The scores still stream back, so the student
      // watches the evaluation arrive rather than a spinner.
      setStage(t('workspace.evaluatingStage'));
      setOutput('');
      setOutputFor(null);
      setPartial(EMPTY_PARTIAL);
      const result = await evaluateSubmission(submission.id, { onPartial: setPartial });
      setOutput(result.output);
      setStage('');
      setPartial(null);
    } catch (err) {
      // The function records the failure on the submission itself, so the
      // attempt shows as errored in both dashboards without a second write
      // from here.
      setError(describeError(err));
      setStage('');
      setPartial(null);
    } finally {
      setSubmitting(false);
    }
  }

  const nextEx = exercises.find((e) => e.order > exercise.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/" className="text-sm text-ink-500 hover:text-ink-800">
          {t('workspace.allExercises')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">
            <span className="text-ink-400">{exercise.order}.</span> {exercise.title}
          </h1>
          {latest && <StatusBadge status={latest.status} />}
        </div>
        <p className="mt-1 text-sm text-ink-500">{exercise.tagline}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <PathChip pathId={exercise.pathId} />
          <DifficultyBadge difficulty={exercise.difficulty} />
          <span className="text-xs text-ink-400">{exercise.topic}</span>
          <span className="text-xs text-ink-400">
            {t('workspace.aboutMinutes', { n: exercise.estimatedMinutes })}
          </span>
        </div>
      </div>

      {state === 'approved' && (
        <Alert tone="success">
          {t('workspace.approvedNext')}{' '}
          {nextEx ? (
            <Link to={`/exercise/${nextEx.id}`} className="font-medium underline">
              {t('workspace.continueTo', {
                title: localizeExercise(nextEx, locale).title,
              })}
            </Link>
          ) : (
            t('workspace.trackFinished')
          )}
        </Alert>
      )}

      {queuedHere && (
        <Alert tone="warning">
          <span className="font-medium">
            {t('workspace.queuedTitle', { n: queuedHere.submission.attempt })}
          </span>{' '}
          {t('workspace.queuedBody')}
        </Alert>
      )}

      {state === 'in_review' && (
        <Alert tone="info">{t('workspace.inReview', { n: latest?.attempt ?? 1 })}</Alert>
      )}

      {state === 'revision' && latest?.review?.comment && (
        <Alert tone="warning">
          <span className="font-medium">{t('workspace.revisionAsked')}</span>{' '}
          {latest.review.comment}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Brief */}
          <Panel
            title={t('workspace.theExercise')}
            action={
              <button onClick={() => setShowBrief((v) => !v)} className="btn-ghost px-2 py-1 text-xs">
                {showBrief ? t('common.hide') : t('common.show')}
              </button>
            }
          >
            {showBrief ? (
              <div className="space-y-4">
                {/* Real-world challenges lead with the situation: the brief
                    below only makes sense once you know who is waiting for the
                    output. The evaluator is told the same thing. */}
                {exercise.scenario && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4">
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-teal-800 uppercase">
                      {t('workspace.situation')}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-800">
                      {exercise.scenario.context}
                    </p>
                    <dl className="mt-3 space-y-1.5 border-t border-teal-200/70 pt-3 text-xs leading-relaxed">
                      <ScenarioRow
                        label={t('workspace.scenarioRole')}
                        value={exercise.scenario.role}
                      />
                      <ScenarioRow
                        label={t('workspace.scenarioStakeholder')}
                        value={exercise.scenario.stakeholder}
                      />
                      <ScenarioRow
                        label={t('workspace.scenarioAtStake')}
                        value={exercise.scenario.atStake}
                      />
                    </dl>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-ink-700">{exercise.brief}</p>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
                  <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                    {t('workspace.yourTask')}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-800">{exercise.task}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    {t('workspace.requirements')}
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

                {(exercise.goodExample || exercise.badExample) && (
                  <div className="grid gap-3 border-t border-ink-200 pt-4 sm:grid-cols-2">
                    {exercise.goodExample && (
                      <ExampleCard
                        tone="good"
                        title={t('workspace.closerToIt')}
                        text={exercise.goodExample}
                      />
                    )}
                    {exercise.badExample && (
                      <ExampleCard
                        tone="bad"
                        title={t('workspace.notThis')}
                        text={exercise.badExample}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="truncate text-sm text-ink-500">{exercise.task}</p>
            )}
          </Panel>

          {/* Prompt editor */}
          <Panel
            title={t('workspace.yourPrompt')}
            subtitle={
              exercise.testInput
                ? t('workspace.runsAgainstMaterial')
                : t('workspace.runsAsWritten')
            }
            action={
              <div className="flex items-center gap-2">
                {running ? (
                  <button onClick={() => abortRef.current?.abort()} className="btn-secondary px-3 py-1.5 text-xs">
                    {t('workspace.stop')}
                  </button>
                ) : (
                  <button
                    onClick={handleTestRun}
                    disabled={!prompt.trim() || submitting || readOnly}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {t('workspace.testRun')}
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
              placeholder={t('workspace.promptPlaceholder')}
              aria-label={t('workspace.yourPrompt')}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="hint">{t('workspace.testRunsFree')}</p>
              <CharCounter used={prompt.length} limit={exercise.maxPromptChars} />
            </div>

            {exercise.testInput && (
              <details className="mt-4 rounded-lg border border-ink-200 bg-ink-50">
                <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-700">
                  {t('workspace.material')}
                </summary>
                <pre className="scroll-slim max-h-64 overflow-auto border-t border-ink-200 px-3.5 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-600">
                  {exercise.testInput}
                </pre>
              </details>
            )}
          </Panel>

          {/* Output */}
          <Panel
            title={t('workspace.whatClaudeProduced')}
            subtitle={
              running
                ? t('workspace.streaming')
                : outputFor
                  ? t('workspace.fromLatestRun')
                  : undefined
            }
            action={
              running ? (
                <Spinner className="h-4 w-4 text-indigo-500" />
              ) : output ? (
                <CopyButton text={() => output} label={t('common.copyOutput')} />
              ) : undefined
            }
          >
            {output || running ? (
              <pre className="scroll-slim prose-output max-h-[28rem] overflow-auto rounded-lg bg-ink-50 p-4 text-ink-800">
                {output}
                {running && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-indigo-500 align-text-bottom" />}
              </pre>
            ) : (
              <EmptyState title={t('workspace.noOutput')}>
                {t('workspace.noOutputHint')}
              </EmptyState>
            )}
          </Panel>

          {/* Reflection + submit */}
          <Panel
            title={t('workspace.reflection')}
            subtitle={t('workspace.reflectionSubtitle', {
              percent: Math.round(weights.understanding * 100),
            })}
          >
            <textarea
              className="input min-h-[9rem] resize-y"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              disabled={readOnly || submitting}
              placeholder={t('workspace.reflectionPlaceholder')}
              aria-label={t('workspace.reflection')}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className={`hint ${reflectionShort && reflection.length > 0 ? 'text-amber-600' : ''}`}>
                {reflectionShort
                  ? t('workspace.reflectionShort', {
                      min: MIN_REFLECTION,
                      n: reflection.trim().length,
                    })
                  : t('workspace.reflectionHint')}
              </p>
            </div>

            {error && (
              <div className="mt-4">
                <Alert>{error}</Alert>
              </div>
            )}

            {partial && (
              <div className="mt-4">
                <LiveEvaluation partial={partial} stage={stage} weights={weights} />
              </div>
            )}

            {!readOnly && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
                <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
                  {submitting && <Spinner />}
                  {submitting
                    ? t('workspace.submitting')
                    : t(online ? 'workspace.submitAttempt' : 'workspace.queueAttempt', {
                        n: (entry?.attempts.length ?? 0) + 1,
                      })}
                </button>
                {!submitting && canSubmit && <KeyHint keys="submit" />}
                {stage && !partial && <span className="text-sm text-ink-500">{stage}</span>}
                {!submitting && (
                  <span className="hint">
                    {online ? t('workspace.submitHint') : t('workspace.queueHint')}
                  </span>
                )}
              </div>
            )}
          </Panel>

          {/* Revision history */}
          {attempts.length > 0 && (
            <Panel
              title={t('workspace.yourAttempts', { n: attempts.length })}
              subtitle={attempts.length > 1 ? t('workspace.attemptsKept') : undefined}
            >
              <div className="space-y-5">
                <RevisionTimeline
                  attempts={oldestFirst}
                  linkTo={(s) => `/submission/${s.id}`}
                />
                <div className="space-y-4">
                  {attempts.map((a) => (
                    <AttemptCard key={a.id} submission={a} exerciseTitle={exercise.title} />
                  ))}
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {exercise.tips.length > 0 && (
            <Panel title={t('workspace.tips')}>
              <ul className="space-y-2.5">
                {exercise.tips.map((tip) => (
                  <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                    <span aria-hidden="true" className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {latest?.evaluation && (
            <Panel title={t('workspace.attemptScore', { n: latest.attempt })}>
              <div className="mb-4 flex items-center gap-4">
                <ScoreRing score={latest.review?.finalScore ?? latest.evaluation.weightedTotal} />
                <div className="text-sm">
                  <p className="font-medium text-ink-900">
                    {(latest.review?.finalScore ?? latest.evaluation.weightedTotal) >= PASSING_SCORE
                      ? t('common.clearsBar')
                      : t('common.belowBar')}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {latest.review ? t('common.teacherReviewed') : t('common.pendingReview')}
                  </p>
                </div>
              </div>
              <RubricBreakdown
                scores={latest.evaluation.scores}
                overrides={latest.review?.overrides}
                weights={latest.evaluation.weights ?? weights}
              />
              <Link
                to={`/submission/${latest.id}`}
                className="mt-4 block text-xs font-medium text-indigo-600 hover:underline"
              >
                {t('workspace.openFullFeedback')}
              </Link>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

/** One line of the scenario card: who, to whom, at what cost. */
function ScenarioRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold tracking-wide text-teal-800 uppercase">{label}</dt>
      <dd className="text-ink-700">{value}</dd>
    </div>
  );
}

function ExampleCard({ tone, title, text }: { tone: 'good' | 'bad'; title: string; text: string }) {
  const styles =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
      : 'border-rose-200 bg-rose-50/60 text-rose-800';
  return (
    <div className={`rounded-lg border p-3.5 ${styles}`}>
      <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">{title}</p>
      <p className="prose-output text-ink-700">{text}</p>
    </div>
  );
}

function AttemptCard({
  submission,
  exerciseTitle,
}: {
  submission: Submission;
  exerciseTitle: string;
}) {
  const { t } = useLocale();
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-ink-700">
                  {submission.evaluation.summary}
                </p>
                <CopyButton
                  className="btn-secondary shrink-0 px-2 py-1 text-xs"
                  label={t('common.copyFeedback')}
                  text={() => feedbackToText(submission, { exerciseTitle, t })}
                />
              </div>
              <RubricBreakdown
                scores={submission.evaluation.scores}
                overrides={submission.review?.overrides}
                rationale={submission.evaluation.rationale}
                weights={submission.evaluation.weights}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FeedbackList
                  title={t('common.strengths')}
                  items={submission.evaluation.strengths}
                  tone="emerald"
                />
                <FeedbackList
                  title={t('common.nextTime')}
                  items={submission.evaluation.improvements}
                  tone="amber"
                />
              </div>
            </>
          )}

          {submission.review?.comment && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5">
              <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                {t('common.teacherComment')}
              </p>
              <p className="text-sm leading-relaxed text-ink-800">{submission.review.comment}</p>
            </div>
          )}

          <Link
            to={`/submission/${submission.id}`}
            className="inline-block text-xs font-medium text-indigo-600 hover:underline"
          >
            {t('workspace.compareAttempts')}
          </Link>

          <details className="rounded-lg border border-ink-200 bg-ink-50">
            <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-700">
              {t('workspace.promptAndOutput')}
            </summary>
            <div className="space-y-3 border-t border-ink-200 px-3.5 py-3">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="hint font-medium">{t('workspace.prompt')}</p>
                  <CopyButton text={() => submission.prompt} />
                </div>
                <pre className="prose-output rounded bg-white p-3 font-mono text-ink-700">
                  {submission.prompt}
                </pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="hint font-medium">{t('workspace.output')}</p>
                  {submission.output && <CopyButton text={() => submission.output} />}
                </div>
                <pre className="prose-output scroll-slim max-h-72 overflow-auto rounded bg-white p-3 text-ink-700">
                  {submission.output || t('workspace.noneCaptured')}
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
