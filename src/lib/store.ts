import { equalTo, onValue, orderByChild, query, ref, remove, set, update } from 'firebase/database';
import { getDb } from './firebase';
import type { ClassGroup, Exercise, Role, Submission, UserProfile } from '../types';

/**
 * Data access for profiles, submissions, and teacher-authored exercises.
 *
 * Reads are scoped by role on purpose. Database rules let a student read
 * `/submissions` only through a query filtered to their own uid, so
 * subscribeSubmissions builds that query rather than reading the collection and
 * filtering in the browser — the old "fetch everything, show what's mine"
 * shape would now be a permission error, which is the point.
 *
 * Writes are narrower still: a student may create their own submission and
 * nothing else, a teacher may write `review`/`status`/`updatedAt` plus the
 * custom exercises under `/exercises`, and `evaluation` and `output` are
 * writable only by the Cloud Function's admin credentials. See
 * database.rules.json.
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
// Custom exercises
// --------------------------------------------------------------------------

/**
 * Teacher-authored exercises. The built-in five are compiled in, so this node
 * only ever holds custom ones — useExercises() merges the two. Every signed-in
 * user may read it; only a teacher may write, which the rules enforce.
 */
export function subscribeExercises(
  cb: Listener<Exercise[]>,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  return onValue(
    ref(db, 'exercises'),
    (snap) => cb(recordToList<Exercise>(snap.val())),
    (err) => onError?.(err),
  );
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  await update(ref(requireDb(), `exercises/${exercise.id}`), stripUndefined(exercise));
}

export async function deleteExercise(id: string): Promise<void> {
  await remove(ref(requireDb(), `exercises/${id}`));
}

// --------------------------------------------------------------------------
// Classes
// --------------------------------------------------------------------------

/**
 * Teacher-run classes. Readable and writable by any teacher, denied to
 * students by the rules — a class is a teacher's own organising tool, and
 * nothing a student sees changes with it.
 *
 * Any teacher may edit any class rather than only their own. That matches how
 * the rest of the app already works (every teacher can read every submission
 * and review any of them) and it is what a covering teacher needs on the day
 * the class's owner is off sick. `teacherName` records who set it up.
 */
export function subscribeClasses(
  cb: Listener<ClassGroup[]>,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  return onValue(
    ref(db, 'classes'),
    (snap) => cb(recordToList<ClassGroup>(snap.val())),
    (err) => onError?.(err),
  );
}

export async function saveClass(group: ClassGroup): Promise<void> {
  await update(ref(requireDb(), `classes/${group.id}`), stripUndefined(group));
}

export async function deleteClass(id: string): Promise<void> {
  await remove(ref(requireDb(), `classes/${id}`));
}

/**
 * Adds or removes one student. A single-key write rather than replacing the
 * roster, so two teachers editing the same class from two rooms do not
 * overwrite each other's changes.
 */
export async function setClassMembership(
  classId: string,
  uid: string,
  member: boolean,
): Promise<void> {
  const target = ref(requireDb(), `classes/${classId}/students/${uid}`);
  if (member) await set(target, true);
  else await remove(target);
  await update(ref(requireDb(), `classes/${classId}`), { updatedAt: Date.now() });
}

// --------------------------------------------------------------------------
// Connectivity
// --------------------------------------------------------------------------

/**
 * Whether writes will actually land, from the database's own `.info/connected`
 * rather than `navigator.onLine`.
 *
 * The two disagree in exactly the case that matters: a laptop attached to a
 * captive-portal wifi reports online and cannot reach anything. `.info` is a
 * client-side node with no rules and no round trip.
 */
export function subscribeConnection(cb: Listener<boolean>): Unsubscribe {
  const db = getDb();
  if (!db) {
    cb(false);
    return () => {};
  }
  return onValue(ref(db, '.info/connected'), (snap) => cb(snap.val() === true));
}

// --------------------------------------------------------------------------

/**
 * Realtime Database rejects `undefined`; drop those keys before writing.
 * Recurses into nested objects because exercise records carry them (rubric
 * weight overrides), and a nested undefined is rejected just the same.
 */
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) ? stripUndefined(v) : v;
  }
  return out as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
