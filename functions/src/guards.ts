import { getDatabase } from 'firebase-admin/database';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { EXERCISE_BY_ID } from '../../src/data/exercises';
import type { Exercise, Role, Submission, UserProfile } from '../../src/types';

/** Small shared checks. Every callable starts by running these. */

export const db = () => getDatabase();

export function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return uid;
}

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  const trimmed = value.trim();
  if (!trimmed) throw new HttpsError('invalid-argument', `${field} is required.`);
  if (trimmed.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} is longer than ${maxLength} characters.`);
  }
  return trimmed;
}

/**
 * The exercise being run or graded: the built-in five first, then the
 * teacher-authored ones under `/exercises`.
 *
 * Reading the custom ones here rather than accepting them from the caller is
 * the same rule as everything else in this file — the client sends an id, the
 * server decides what that id means. A student cannot invent an exercise with a
 * friendlier rubric by putting one in the request body.
 */
export async function exerciseOf(exerciseId: string): Promise<Exercise> {
  const builtin = EXERCISE_BY_ID[exerciseId];
  if (builtin) return builtin;

  const snap = await db().ref(`exercises/${exerciseId}`).get();
  if (!snap.exists()) throw new HttpsError('not-found', 'That exercise does not exist.');
  return snap.val() as Exercise;
}

export async function profileOf(uid: string): Promise<UserProfile | null> {
  const snap = await db().ref(`users/${uid}`).get();
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function roleOf(uid: string): Promise<Role | null> {
  const profile = await profileOf(uid);
  return profile?.role ?? null;
}

/**
 * A student's earlier scored attempts at the same exercise, oldest first. The
 * evaluator needs these to score Growth.
 */
export async function priorAttempts(submission: Submission): Promise<Submission[]> {
  const snap = await db()
    .ref('submissions')
    .orderByChild('studentId')
    .equalTo(submission.studentId)
    .get();

  return Object.values((snap.val() ?? {}) as Record<string, Submission>)
    .filter(
      (s) =>
        s.exerciseId === submission.exerciseId &&
        s.attempt < submission.attempt &&
        Boolean(s.evaluation),
    )
    .sort((a, b) => a.attempt - b.attempt);
}
