import { equalTo, onValue, orderByChild, query, ref, set, update } from 'firebase/database';
import { getDb } from './firebase';
import type { Role, Submission, UserProfile } from '../types';

/**
 * Data access for profiles and submissions.
 *
 * Reads are scoped by role on purpose. Database rules let a student read
 * `/submissions` only through a query filtered to their own uid, so
 * subscribeSubmissions builds that query rather than reading the collection and
 * filtering in the browser — the old "fetch everything, show what's mine"
 * shape would now be a permission error, which is the point.
 *
 * Writes are narrower still: a student may create their own submission and
 * nothing else, a teacher may write `review`/`status`/`updatedAt`, and
 * `evaluation` and `output` are writable only by the Cloud Function's admin
 * credentials. See database.rules.json.
 */

type Listener<T> = (value: T) => void;
type Unsubscribe = () => void;

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* variables.');
  return db;
}

function recordToList<T>(value: unknown): T[] {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, T>);
}

// --------------------------------------------------------------------------
// Submissions
// --------------------------------------------------------------------------

export function subscribeSubmissions(
  uid: string,
  role: Role,
  cb: Listener<Submission[]>,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }

  const target =
    role === 'teacher'
      ? ref(db, 'submissions')
      : query(ref(db, 'submissions'), orderByChild('studentId'), equalTo(uid));

  return onValue(
    target,
    (snap) => cb(recordToList<Submission>(snap.val())),
    (err) => onError?.(err),
  );
}

/** Creates an attempt. The student's own writes stop here — see the note above. */
export async function createSubmission(submission: Submission): Promise<void> {
  await set(ref(requireDb(), `submissions/${submission.id}`), stripUndefined(submission));
}

/** A teacher's decision. Rules allow these three fields and no others. */
export async function saveReview(
  id: string,
  patch: Pick<Submission, 'status' | 'review'>,
): Promise<void> {
  await update(
    ref(requireDb(), `submissions/${id}`),
    stripUndefined({ ...patch, updatedAt: Date.now() }),
  );
}

// --------------------------------------------------------------------------
// Profiles
// --------------------------------------------------------------------------

export function subscribeProfile(
  uid: string,
  cb: Listener<UserProfile | null>,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb(null);
    return () => {};
  }
  return onValue(
    ref(db, `users/${uid}`),
    (snap) => cb(snap.exists() ? (snap.val() as UserProfile) : null),
    (err) => onError?.(err),
  );
}

/** The class roster. Only a teacher can read `/users`; students get denied. */
export function subscribeStudents(
  cb: Listener<UserProfile[]>,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  return onValue(
    ref(db, 'users'),
    (snap) => cb(recordToList<UserProfile>(snap.val()).filter((u) => u.role === 'student')),
    (err) => onError?.(err),
  );
}

/** Refresh presence so teachers see who is active. Never touches `role`. */
export async function touchProfile(uid: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await update(ref(db, `users/${uid}`), { lastSeenAt: Date.now() });
}

// --------------------------------------------------------------------------

/** Realtime Database rejects `undefined`; drop those keys before writing. */
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
