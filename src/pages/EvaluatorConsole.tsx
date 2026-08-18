import { useMemo, useState } from 'react';
import { useExercises, useSubmissions } from '../hooks/useData';
import { PASSING_SCORE, RUBRIC, RUBRIC_KEYS, effectiveWeights } from '../data/rubric';
import { describeError, evaluateSubmission } from '../lib/claude';
import { buildEvaluatorSystemPrompt } from '../lib/evaluator-prompt';
import { DISAGREEMENT_THRESHOLD, calibration } from '../lib/calibration';
import { Alert, EmptyState, Panel, Spinner, relativeTime, scoreTone } from '../components/ui';
import type { RubricKey } from '../types';

export default function EvaluatorConsole() {
  const { submissions, loading } = useSubmissions();
  const { exercises, byId } = useExercises();
  const [selected, setSelected] = useState(exercises[0]?.id ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const exercise = byId[selected] ?? exercises[0];
  const systemPrompt = useMemo(
    () => (exercise ? buildEvaluatorSystemPrompt(exercise) : ''),
    [exercise],
  );

  const evaluated = submissions.filter((s) => s.evaluation);

  const stats = useMemo(() => {
    if (!evaluated.length) return null;
    const perDimension = RUBRIC.map((dim) => {
      const values = evaluated.map((s) => s.evaluation!.scores[dim.key as RubricKey]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return { key: dim.key, label: dim.label, mean: Math.round(mean * 10) / 10 };
    });
    const overridden = evaluated.filter(
      (s) => s.review && Object.keys(s.review.overrides ?? {}).length > 0,
    );
    const drift = overridden.length
      ? Math.round(
          (overridden.reduce(
            (sum, s) => sum + (s.review!.finalScore - s.evaluation!.weightedTotal),
            0,
          ) /
            overridden.length) *
            10,
        ) / 10
      : 0;
    const agreed = evaluated.filter((s) => s.review).length - overridden.length;
    return { perDimension, overridden: overridden.length, drift, agreed, total: evaluated.length };
  }, [evaluated]);

  const calib = useMemo(() => calibration(submissions), [submissions]);

  /** Agreement between the two models, across every submission that has both. */
  const modelStats = useMemo(() => {
    const pairs = evaluated.filter((s) => s.evaluation?.secondOpinion?.error === undefined && s.evaluation?.secondOpinion);
    if (!pairs.length) return { count: 0, meanAbs: 0, contested: 0 };
    const gaps = pairs.map((s) =>
      Math.abs(s.evaluation!.secondOpinion!.weightedTotal - s.evaluation!.weightedTotal),
    );
    const contested = pairs.filter((s) =>
      RUBRIC_KEYS.some(
        (k) =>
          Math.abs(
            (s.evaluation!.secondOpinion!.scores[k] ?? 0) - (s.evaluation!.scores[k] ?? 0),
          ) >= DISAGREEMENT_THRESHOLD,
      ),
    ).length;
    return {
      count: pairs.length,
      meanAbs: Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10,
      contested,
    };
  }, [evaluated]);

  // The function re-reads the submission, re-grades it, and writes the result
  // itself — the console only needs the id.
  async function reEvaluate(submissionId: string) {
    setError('');
    setBusyId(submissionId);
    try {
      await evaluateSubmission(submissionId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Evaluator console</h1>
        <p className="mt-1 text-sm text-ink-500">
          The grading instructions Claude receives, and how its scores have compared to teacher
          judgement.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-4">
        {/*
          The model is chosen server-side, so the console reports what the last
          grade actually ran on rather than a build-time constant that could
          disagree with it.
        */}
        <Stat label="Model" value={evaluated[0]?.evaluation?.model ?? '—'} mono />
        <Stat label="Evaluations run" value={String(evaluated.length)} />
        <Stat label="Teacher agreed" value={stats ? String(stats.agreed) : '—'} />
        <Stat
          label="Avg override drift"
          value={stats && stats.overridden ? `${stats.drift > 0 ? '+' : ''}${stats.drift}` : '—'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Rubric calibration"
            subtitle="How far teachers land from Claude when they score without seeing its numbers."
          >
            {calib.count === 0 ? (
              <EmptyState title="No blind scores yet">
                Open a submission in the review queue and choose <strong>Score blind</strong>. The
                delta is only meaningful when the teacher scored first — an override entered next
                to Claude's number measures anchoring, not judgement.
              </EmptyState>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat
                    label="Mean gap"
                    value={`${calib.meanDelta > 0 ? '+' : ''}${calib.meanDelta}`}
                  />
                  <Stat label="Mean distance" value={String(calib.meanAbsDelta)} />
                  <Stat label="Within 5 points" value={`${Math.round(calib.withinFive * 100)}%`} />
                </div>

                <p className="text-sm leading-relaxed text-ink-600">
                  {calib.count} of {calib.reviewed} review{calib.reviewed === 1 ? '' : 's'} scored
                  blind.{' '}
                  {calib.meanDelta > 2
                    ? 'Teachers are running more generous than Claude.'
                    : calib.meanDelta < -2
                      ? 'Teachers are running harsher than Claude.'
                      : 'Teachers and Claude are broadly aligned on the total.'}
                </p>

                <div>
                  <p className="mb-2.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    Where the disagreement sits
                  </p>
                  <div className="space-y-2">
                    {RUBRIC.map((dim) => {
                      const bias = calib.perDimension[dim.key];
                      return (
                        <div key={dim.key} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-ink-700">{dim.label}</span>
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              Math.abs(bias) >= 10
                                ? 'text-amber-600'
                                : Math.abs(bias) >= 5
                                  ? 'text-ink-700'
                                  : 'text-ink-400'
                            }`}
                          >
                            {bias > 0 ? '+' : ''}
                            {bias}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="hint mt-2.5">
                    Teacher minus Claude, averaged. A large number on one dimension usually means
                    its criteria read differently to a human than they do to the model — that is a
                    rubric problem worth fixing, not a teacher problem.
                  </p>
                </div>

                {calib.trend && (
                  <div className="rounded-lg border border-ink-200 px-3.5 py-3">
                    <p className="text-sm text-ink-700">
                      Distance moved from <strong>{calib.trend.early}</strong> to{' '}
                      <strong>{calib.trend.late}</strong> between the first and second half of
                      blind reviews —{' '}
                      {calib.trend.closing ? 'converging.' : 'diverging.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Model agreement"
            subtitle="Where the fast second reader and the grading model diverge."
          >
            {modelStats.count === 0 ? (
              <EmptyState title="No second opinions recorded">
                The second pass runs alongside grading when <code>SECOND_OPINION_MODEL</code> is
                set on the function. Existing scores are unaffected.
              </EmptyState>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Compared" value={String(modelStats.count)} />
                  <Stat label="Mean total gap" value={String(modelStats.meanAbs)} />
                  <Stat label="Contested" value={String(modelStats.contested)} />
                </div>
                <p className="text-sm leading-relaxed text-ink-600">
                  {modelStats.contested === 0
                    ? 'The two readers have agreed within a few points on every submission so far.'
                    : `${modelStats.contested} submission${modelStats.contested === 1 ? '' : 's'} had at least one dimension more than ${DISAGREEMENT_THRESHOLD} points apart. Those are the ones worth a human read.`}
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Grading instructions"
            subtitle="Sent as the cached system prompt for every submission to this exercise."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="rounded-lg border border-ink-300 bg-white px-2.5 py-1.5 text-xs text-ink-700"
                  aria-label="Exercise"
                >
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.order}. {e.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(systemPrompt);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            }
          >
            <pre className="scroll-slim max-h-[32rem] overflow-auto rounded-lg bg-ink-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-100">
              {systemPrompt}
            </pre>
            <p className="hint mt-3">
              Scores come back through a JSON schema, so they always parse. The weighted total is
              computed in the app from the rubric weights — the model never supplies it.
            </p>
          </Panel>

          <Panel title="Evaluation log" subtitle="Every score Claude has produced, newest first.">
            {loading && <div className="h-32 animate-pulse rounded-lg bg-ink-100" />}
            {!loading && evaluated.length === 0 && (
              <EmptyState title="No evaluations yet">
                Scores appear here as students submit work.
              </EmptyState>
            )}
            <div className="space-y-2">
              {evaluated.slice(0, 40).map((s) => {
                const ex = byId[s.exerciseId];
                const claude = s.evaluation!.weightedTotal;
                const final = s.review?.finalScore;
                const delta = final !== undefined ? Math.round((final - claude) * 10) / 10 : null;
                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 px-3.5 py-2.5"
                  >
                    <span className={`w-10 shrink-0 text-sm font-semibold tabular-nums ${scoreTone(claude)}`}>
                      {claude}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-800">
                        <span className="font-medium">{s.studentName}</span>
                        <span className="mx-1.5 text-ink-300">/</span>
                        {ex?.title ?? s.exerciseId}
                        <span className="ml-1.5 text-xs text-ink-400">attempt {s.attempt}</span>
                      </p>
                      <p className="truncate text-xs text-ink-500">{s.evaluation!.summary}</p>
                    </div>
                    {delta !== null && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                          delta === 0
                            ? 'bg-ink-100 text-ink-500'
                            : delta > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}
                        title="Teacher adjustment"
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? 'agreed' : delta}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-ink-400">
                      {relativeTime(s.evaluation!.evaluatedAt)}
                    </span>
                    <button
                      onClick={() => reEvaluate(s.id)}
                      disabled={busyId !== null}
                      className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                    >
                      {busyId === s.id ? <Spinner className="h-3 w-3" /> : 'Re-run'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel
            title="Rubric"
            subtitle={`Passing threshold: ${PASSING_SCORE} · weights for ${exercise?.title ?? 'this exercise'}`}
          >
            <div className="space-y-4">
              {RUBRIC.map((dim) => {
                const mean = stats?.perDimension.find((d) => d.key === dim.key)?.mean;
                const weight = effectiveWeights(exercise?.rubricWeights)[dim.key];
                return (
                  <div key={dim.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink-800">{dim.label}</span>
                      <span className="text-xs text-ink-400">{Math.round(weight * 100)}%</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{dim.description}</p>
                    {mean !== undefined && (
                      <p className="mt-1 text-xs text-ink-500">
                        Class mean:{' '}
                        <span className={`font-semibold tabular-nums ${scoreTone(mean)}`}>{mean}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="How this role works">
            <ul className="space-y-2.5 text-xs leading-relaxed text-ink-600">
              <li>
                The evaluator sees the student's prompt, the output it produced, their reflection,
                and every earlier attempt — that history is what makes the Growth dimension
                meaningful.
              </li>
              <li>
                Student text is passed as tagged data with an explicit instruction that anything
                inside those tags is never an instruction, so a submission cannot talk its way to a
                higher score.
              </li>
              <li>
                Scores are advisory. Nothing reaches a student's record until a teacher approves
                it, and any dimension can be overridden.
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs tracking-wide text-ink-500 uppercase">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold text-ink-900 ${mono ? 'font-mono text-sm' : 'tabular-nums'}`}>
        {value}
      </p>
    </div>
  );
}
