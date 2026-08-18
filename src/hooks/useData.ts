import { useEffect, useMemo, useState } from 'react';
import { subscribeExercises, subscribeStudents, subscribeSubmissions } from '../lib/store';
import { useSession } from '../context/SessionContext';
import { EXERCISES, indexById, mergeExercises } from '../data/exercises';
import { PATHS } from '../data/paths';
import type { Exercise, ExerciseState, PathProgress, Submission, UserProfile } from '../types';

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
 * The full exercise list: the built-in five plus any teacher-authored ones, in
 * unlock order. Everything that renders or grades an exercise reads this
 * rather than the EXERCISES constant, or custom exercises go missing.
 *
 * It starts from the built-ins so the board renders on the first frame instead
 * of flashing empty while the subscription connects.
 */
export function useExercises(): {
  exercises: Exercise[];
  byId: Record<string, Exercise>;
  loading: boolean;
} {
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeExercises((list) => {
      setCustom(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return useMemo(() => {
    const exercises = custom.length ? mergeExercises(custom) : EXERCISES;
    return { exercises, byId: indexById(exercises), loading };
  }, [custom, loading]);
}

/**
 * Per-exercise state for one student, applying the locked progression:
 * exercise N is available only once exercise N-1 has been teacher-approved.
 *
 * The chain runs over the whole ordered list, custom exercises included.
 * Learning paths group that list for display; they do not fork it.
 */
export function computeProgress(
  studentId: string,
  submissions: Submission[],
  exercises: Exercise[] = EXERCISES,
): Map<string, { state: ExerciseState; attempts: Submission[]; best: number }> {
  const mine = submissions
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const result = new Map<string, { state: ExerciseState; attempts: Submission[]; best: number }>();
  let previousApproved = true; // exercise 1 is always open

  for (const exercise of exercises) {
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
  exercises: Exercise[] = EXERCISES,
): ProgressMap {
  return useMemo<ProgressMap>(
    () => (studentId ? computeProgress(studentId, submissions, exercises) : new Map()),
    [studentId, submissions, exercises],
  );
}

/** The exercise a student should work on next, or undefined when all are done. */
export function nextExercise(
  progress: Map<string, { state: ExerciseState }>,
  exercises: Exercise[] = EXERCISES,
): Exercise | undefined {
  return exercises.find((e) => {
    const state = progress.get(e.id)?.state;
    return state === 'available' || state === 'revision';
  });
}

/**
 * Completion per learning path, derived from the same progress map the board
 * renders from. Empty paths are dropped so a track a teacher has not populated
 * does not show up as "0 of 0 approved".
 */
export function pathProgress(exercises: Exercise[], progress: ProgressMap): PathProgress[] {
  return PATHS.map((path) => {
    const inPath = exercises.filter((e) => e.pathId === path.id);
    const scored = inPath.map((e) => progress.get(e.id)?.best ?? 0).filter((s) => s > 0);
    return {
      path,
      exercises: inPath,
      approved: inPath.filter((e) => progress.get(e.id)?.state === 'approved').length,
      total: inPath.length,
      average: scored.length
        ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
        : 0,
    };
  }).filter((entry) => entry.total > 0);
}

/** Every attempt at one exercise by one student, oldest first. */
export function attemptsFor(
  submissions: Submission[],
  studentId: string,
  exerciseId: string,
): Submission[] {
  return submissions
    .filter((s) => s.studentId === studentId && s.exerciseId === exerciseId)
    .sort((a, b) => a.attempt - b.attempt || a.createdAt - b.createdAt);
}
