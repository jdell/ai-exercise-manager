import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useExercises, useSubmissions } from '../hooks/useData';
import { EmptyState, Panel, RubricBreakdown, StatusBadge, relativeTime, scoreTone } from '../components/ui';
import { FeedbackList } from './ExerciseWorkspace';

export default function StudentHistory() {
  const { session } = useSession();
  const { submissions, loading } = useSubmissions();
  const { byId } = useExercises();
  const mine = submissions.filter((s) => s.studentId === session?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">History</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every attempt you have submitted, newest first.
        </p>
      </div>

      {loading && <div className="h-40 animate-pulse rounded-xl bg-ink-100" />}

      {!loading && mine.length === 0 && (
        <EmptyState title="Nothing submitted yet">
          <Link to="/" className="font-medium text-indigo-600 underline">
            Start your first exercise
          </Link>
        </EmptyState>
      )}

      <div className="space-y-4">
        {mine.map((s) => {
          const exercise = byId[s.exerciseId];
          const score = s.review?.finalScore ?? s.evaluation?.weightedTotal;
          return (
            <Panel
              key={s.id}
              title={`${exercise?.title ?? s.exerciseId} — attempt ${s.attempt}`}
              subtitle={relativeTime(s.createdAt)}
              action={
                <div className="flex items-center gap-3">
                  {score !== undefined && (
                    <span className={`text-lg font-semibold tabular-nums ${scoreTone(score)}`}>
                      {Math.round(score)}
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                </div>
              }
            >
              {s.evaluation ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-ink-700">{s.evaluation.summary}</p>
                  <RubricBreakdown
                    scores={s.evaluation.scores}
                    overrides={s.review?.overrides}
                    rationale={s.evaluation.rationale}
                    weights={s.evaluation.weights}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FeedbackList title="Strengths" items={s.evaluation.strengths} tone="emerald" />
                    <FeedbackList title="Next time" items={s.evaluation.improvements} tone="amber" />
                  </div>
                  <Link
                    to={`/submission/${s.id}`}
                    className="inline-block text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Revision history and full feedback →
                  </Link>
                  {s.review?.comment && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5">
                      <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-800 uppercase">
                        Teacher comment
                      </p>
                      <p className="text-sm leading-relaxed text-ink-800">{s.review.comment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-500">
                    {s.status === 'error' ? s.error : 'No evaluation recorded for this attempt.'}
                  </p>
                  <Link
                    to={`/submission/${s.id}`}
                    className="inline-block text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Open this attempt →
                  </Link>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
