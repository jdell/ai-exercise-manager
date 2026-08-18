import { useEffect, useMemo, useState } from 'react';
import { subscribeStudents, subscribeSubmissions } from '../lib/store';
import { useSession } from '../context/SessionContext';
import { EXERCISES } from '../data/exercises';
import type { Exercise, ExerciseState, Submission, UserProfile } from '../types';

/**
 * Subscriptions and the locking rule.
 *
 * The subscriptions read the session themselves rather than taking a uid,
 * because the shape of the read depends on the role: database rules let a
 * student read `/submissions` only through a query filtered to their own uid.
 * Getting that wrong is a permission error, not a wider result set.
 */

export function useSubmissions(): { submissions: Submission[]; loading: boolean; error: string } {
  const { session } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeSubmissions(
      session.id,
      session.role,
      (list) => {
        setSubmissions([...list].sort((a, b) => b.createdAt - a.createdAt));
        setError('');
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [session?.id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return { submissions, loading, error };
}

/** The class roster. Teacher-only — the rules deny `/users` to students. */
export function useStudents(): { students: UserProfile[]; loading: boolean; error: string } {
  const { session } = useSession();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.role !== 'teacher') {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeStudents(
      (list) => {
        setStudents([...list].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        setError('');
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [session?.role]);

  return { students, loading, error };
}

/**
 * Per-exercise state for one student, applying the locked progression:
 * exercise N is available only once exercise N-1 has been teacher-approved.
 */
export function computeProgress(
  studentId: string,
  submissions: Submission[],
): Map<string, { state: ExerciseState; attempts: Submission[]; best: number }> {
  const mine = submissions
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const result = new Map<string, { state: ExerciseState; attempts: Submission[]; best: number }>();
  let previousApproved = true; // exercise 1 is always open

  for (const exercise of EXERCISES) {
    const attempts = mine.filter((s) => s.exerciseId === exercise.id);
    const approved = attempts.some((s) => s.status === 'approved');
    const inReview = attempts.some(
      (s) => s.status === 'awaiting_review' || s.status === 'evaluating',
    );
    const latest = attempts[attempts.length - 1];

    let state: ExerciseState;
    if (!previousApproved) state = 'locked';
    else if (approved) state = 'approved';
    else if (inReview) state = 'in_review';
    else if (latest?.status === 'needs_revision') state = 'revision';
    else state = 'available';

    const best = attempts.reduce((max, s) => {
      const score = s.review?.finalScore ?? s.evaluation?.weightedTotal ?? 0;
      return Math.max(max, score);
    }, 0);

    result.set(exercise.id, { state, attempts, best });
    previousApproved = approved;
  }

  return result;
}

export type ProgressMap = Map<
  string,
  { state: ExerciseState; attempts: Submission[]; best: number }
>;

export function useStudentProgress(
  studentId: string | undefined,
  submissions: Submission[],
): ProgressMap {
  return useMemo<ProgressMap>(
    () => (studentId ? computeProgress(studentId, submissions) : new Map()),
    [studentId, submissions],
  );
}

/** The exercise a student should work on next, or undefined when all are done. */
export function nextExercise(
  progress: Map<string, { state: ExerciseState }>,
): Exercise | undefined {
  return EXERCISES.find((e) => {
    const state = progress.get(e.id)?.state;
    return state === 'available' || state === 'revision';
  });
}
