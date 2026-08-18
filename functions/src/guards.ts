import { getDatabase } from 'firebase-admin/database';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { Role, Submission, UserProfile } from '../../src/types';

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
