import { useEffect, useMemo, useState } from 'react';
import {
  subscribeClasses,
  subscribeConnection,
  subscribeExercises,
  subscribeStudents,
  subscribeSubmissions,
} from '../lib/store';
import { useSession } from '../context/SessionContext';
import {
  cacheCustomExercises,
  cacheSubmissions,
  cachedSubmissionsAt,
  readCachedExercises,
  readCachedSubmissions,
} from '../lib/offline';
import { EXERCISES, indexById, mergeExercises } from '../data/exercises';
import { PATHS } from '../data/paths';
import type {
  ClassGroup,
  Exercise,
  ExerciseState,
  PathProgress,
  Submission,
  UserProfile,
} from '../types';

/**
 * Subscriptions and the locking rule.
 *
 * The subscriptions read the session themselves rather than taking a uid,
 * because the shape of the read depends on the role: database rules let a
 * student read `/submissions` only through a query filtered to their own uid.
 * Getting that wrong is a permission error, not a wider result set.
 */

export function useSubmissions(): {
  submissions: Submission[];
  loading: boolean;
  error: string;
  /** True while showing the offline mirror rather than a live snapshot. */
  cached: boolean;
  /** When that mirror was written. Undefined when the data is live. */
  cachedAt?: number;
} {
  const { session } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!session) {
      setSubmissions([]);
      setLoading(false);
      setCached(false);
      return;
    }

    // Paint the mirror first so an offline student sees their work instead of
    // an empty history that resolves minutes later, or never. A live snapshot
    // overwrites this the moment one arrives — the cache is never a source.
    //
    // Students only: a teacher's read is the whole class, and mirroring that
    // would leave every student's work in the localStorage of whatever machine
    // the teacher last marked on.
    if (session.role === 'student') {
      const mirror = readCachedSubmissions(session.id);
      if (mirror.length) {
        setSubmissions(mirror);
        setCached(true);
        setCachedAt(cachedSubmissionsAt(session.id));
        setLoading(false);
      }
    }

    return subscribeSubmissions(
      session.id,
      session.role,
      (list) => {
        const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
        setSubmissions(sorted);
        setError('');
        setLoading(false);
        setCached(false);
        setCachedAt(undefined);
        if (session.role === 'student') cacheSubmissions(session.id, sorted);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [session?.id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return { submissions, loading, error, cached, cachedAt };
}

/**
 * Whether the database is reachable, from `.info/connected` rather than
 * `navigator.onLine` — see subscribeConnection() for why the two differ.
 *
 * Starts optimistic: a false "you are offline" banner on every cold start is
 * worse than a second of silence before a real one.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => subscribeConnection(setOnline), []);
  return online;
}

/**
 * Every class, for the teacher screens. Students never subscribe: the rules
 * deny them `/classes`, and nothing on their side of the app changes with it.
 */
export function useClasses(): { classes: ClassGroup[]; loading: boolean; error: string } {
  const { session } = useSession();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.role !== 'teacher') {
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeClasses(
      (list) => {
        setClasses([...list].sort((a, b) => a.name.localeCompare(b.name)));
        setError('');
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [session?.role]);

  return { classes, loading, error };
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
  // Seeded from the offline mirror so a custom exercise is readable without a
  // connection. The built-in nine need no mirror — they are in the bundle the
  // service worker cached.
  const [custom, setCustom] = useState<Exercise[]>(readCachedExercises);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeExercises((list) => {
      setCustom(list);
      cacheCustomExercises(list);
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
