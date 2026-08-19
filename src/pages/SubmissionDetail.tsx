import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { attemptsFor, useExercises, useSubmissions } from '../hooks/useData';
import { localizeExercise } from '../data/exercises';
import { PASSING_SCORE, effectiveWeights } from '../data/rubric';
import {
  Alert,
  Panel,
  RevisionTimeline,
  RubricBreakdown,
  ScoreRing,
  StatusBadge,
  relativeTime,
} from '../components/ui';
import { FeedbackList } from './ExerciseWorkspace';

/**
 * One attempt in full, in the context of every other attempt at the same
 * exercise. This is where a student sees what they changed between revisions
 * and whether it moved the score.
 */
export default function SubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { session } = useSession();
  const { t, locale } = useLocale();
  const { submissions, loading } = useSubmissions();
  const { byId, loading: exercisesLoading } = useExercises();

  const submission = submissions.find((s) => s.id === submissionId);

  const attempts = useMemo(
    () =>
      submission ? attemptsFor(submissions, submission.studentId, submission.exerciseId) : [],
    [submissions, submission],
  );

  if (!session) return <Navigate to="/signin" replace />;
  if (loading || exercisesLoading) return <div className="h-96 animate-pulse rounded-xl bg-ink-100" />;
  if (!submission) return <Navigate to="/history" replace />;
  // Students only ever see their own work; teachers have their own review page
  // but can follow a link here without being bounced.
  if (session.role === 'student' && submission.studentId !== session.id) {
    return <Navigate to="/history" replace />;
  }

  const canonical = byId[submission.exerciseId];
  const exercise = canonical ? localizeExercise(canonical, locale) : undefined;
  const weights = submission.evaluation?.weights ?? effectiveWeights(exercise?.rubricWeights);
  const index = attempts.findIndex((a) => a.id === submission.id);
  const previous = index > 0 ? attempts[index - 1] : undefined;
  const score = submission.review?.finalScore ?? submission.evaluation?.weightedTotal;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/history" className="text-sm text-ink-500 hover:text-ink-800">
          {t('detail.backToHistory')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">
            {exercise?.title ?? submission.exerciseId}
          </h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {t('detail.attemptOf', {
            n: submission.attempt,
            total: attempts.length,
            when: relativeTime(submission.createdAt),
          })}
        </p>
      </div>

      {attempts.length > 1 && (
        <Panel
          title={t('detail.revisionHistory')}
          subtitle={t('detail.revisionHistorySubtitle')}
        >
          <RevisionTimeline
            attempts={attempts}
            activeId={submission.id}
            linkTo={(s) => `/submission/${s.id}`}
          />
        </Panel>
      )}

      {submission.status === 'error' && <Alert>{submission.error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {previous && (
            <Panel
              title={t('detail.whatWasAskedToFix', { n: previous.attempt })}
              subtitle={t('detail.whatWasAskedSubtitle')}
            >
              <div className="space-y-4">
                <FeedbackList
                  title={t('detail.flaggedOn', { n: previous.attempt })}
                  items={previous.evaluation?.improvements ?? []}
                  tone="amber"
                />
                {previous.review?.comment && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5">
                    <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                      {t('detail.teacherAskedFor')}
                    </p>
                    <p className="text-sm leading-relaxed text-ink-800">{previous.review.comment}</p>
                  </div>
                )}
                <div className="grid gap-3 border-t border-ink-200 pt-4 sm:grid-cols-2">
                  <PromptColumn
                    label={t('common.attemptN', { n: previous.attempt })}
                    text={previous.prompt}
                    muted
                  />
                  <PromptColumn
                    label={t('common.attemptN', { n: submission.attempt })}
                    text={submission.prompt}
                  />
                </div>
              </div>
            </Panel>
          )}

          {submission.evaluation && (
            <Panel
              title={t('detail.claudeFeedback')}
              subtitle={`${submission.evaluation.model} · ${relativeTime(submission.evaluation.evaluatedAt)}`}
            >
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-ink-700">
                  {submission.evaluation.summary}
                </p>
                <RubricBreakdown
                  scores={submission.evaluation.scores}
                  overrides={submission.review?.overrides}
                  rationale={submission.evaluation.rationale}
                  weights={weights}
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
              </div>
            </Panel>
          )}

          {submission.review?.comment && (
            <Panel title={t('common.teacherComment')}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
                {submission.review.comment}
              </p>
              <p className="hint mt-2">
                {submission.review.reviewedBy} · {relativeTime(submission.review.reviewedAt)}
              </p>
            </Panel>
          )}

          {!previous && (
            <Panel title={t('detail.promptYouSubmitted')}>
              <pre className="prose-output scroll-slim max-h-96 overflow-auto rounded-lg bg-ink-50 p-4 font-mono text-ink-800">
                {submission.prompt}
              </pre>
            </Panel>
          )}

          <Panel title={t('detail.whatItProduced')}>
            <pre className="prose-output scroll-slim max-h-96 overflow-auto rounded-lg bg-ink-50 p-4 text-ink-800">
              {submission.output || t('detail.noOutputCaptured')}
            </pre>
          </Panel>

          <Panel title={t('detail.yourReflection')}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
              {submission.reflection || t('detail.leftBlank')}
            </p>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title={t('common.score')}>
            {score !== undefined ? (
              <>
                <div className="mb-4 flex items-center gap-4">
                  <ScoreRing score={score} />
                  <div className="text-sm">
                    <p className="font-medium text-ink-900">
                      {score >= PASSING_SCORE ? t('common.clearsBar') : t('common.belowBar')}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {submission.review ? t('common.teacherReviewed') : t('common.pendingReview')}
                    </p>
                  </div>
                </div>
                {submission.review && submission.evaluation && (
                  <p className="hint">
                    {t('detail.claudeVsTeacher', {
                      claude: submission.evaluation.weightedTotal,
                      teacher: submission.review.finalScore,
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-500">{t('detail.neverScored')}</p>
            )}
          </Panel>

          {exercise && (
            <Panel title={t('detail.theExercise')}>
              <p className="text-sm leading-relaxed text-ink-700">{exercise.task}</p>
              <Link
                to={`/exercise/${exercise.id}`}
                className="mt-3 block text-xs font-medium text-indigo-600 hover:underline"
              >
                {t('detail.openWorkspace')}
              </Link>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function PromptColumn({
  label,
  text,
  muted,
}: {
  label: string;
  text: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="hint mb-1 font-medium">{label}</p>
      <pre
        className={`prose-output scroll-slim max-h-72 overflow-auto rounded-lg border p-3 font-mono ${
          muted ? 'border-ink-200 bg-ink-50 text-ink-500' : 'border-indigo-200 bg-white text-ink-800'
        }`}
      >
        {text}
      </pre>
    </div>
  );
}
