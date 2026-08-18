import { onValue, ref, update, remove } from 'firebase/database';
import { getDb, isFirebaseConfigured } from './firebase';
import type { Student, Submission } from '../types';

/**
 * Data access for students and submissions.
 *
 * Backed by Firebase Realtime Database when it is configured. When it is not,
 * the same interface is served from localStorage with cross-tab sync, so the
 * full student/teacher flow can be exercised offline — useful for local demos
 * and for a first run before a Firebase project exists.
 */

type Listener<T> = (value: T) => void;
type Unsubscribe = () => void;

interface LocalData {
  students: Record<string, Student>;
  submissions: Record<string, Submission>;
}

const LS_KEY = 'aiem:data:v1';
const CHANNEL = 'aiem:changes';

export const storageMode: 'firebase' | 'local' = isFirebaseConfigured ? 'firebase' : 'local';

// --------------------------------------------------------------------------
// localStorage backend
// --------------------------------------------------------------------------

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

const localListeners = new Set<() => void>();

function readLocal(): LocalData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { students: {}, submissions: {} };
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    return { students: parsed.students ?? {}, submissions: parsed.submissions ?? {} };
  } catch {
    return { students: {}, submissions: {} };
  }
}

function writeLocal(data: LocalData) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  localListeners.forEach((fn) => fn());
  channel?.postMessage('changed');
}

if (channel) {
  channel.onmessage = () => localListeners.forEach((fn) => fn());
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) localListeners.forEach((fn) => fn());
  });
}

function subscribeLocal<T>(select: (data: LocalData) => T, cb: Listener<T>): Unsubscribe {
  const emit = () => cb(select(readLocal()));
  localListeners.add(emit);
  emit();
  return () => {
    localListeners.delete(emit);
  };
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

function recordToList<T>(value: unknown): T[] {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, T>);
}

export function subscribeStudents(cb: Listener<Student[]>): Unsubscribe {
  const db = getDb();
  if (!db) return subscribeLocal((d) => Object.values(d.students), cb);
  return onValue(ref(db, 'students'), (snap) => cb(recordToList<Student>(snap.val())));
}

export function subscribeSubmissions(cb: Listener<Submission[]>): Unsubscribe {
  const db = getDb();
  if (!db) return subscribeLocal((d) => Object.values(d.submissions), cb);
  return onValue(ref(db, 'submissions'), (snap) => cb(recordToList<Submission>(snap.val())));
}

export async function upsertStudent(student: Student): Promise<void> {
  const db = getDb();
  if (!db) {
    const data = readLocal();
    const existing = data.students[student.id];
    // Preserve the original createdAt for a returning student.
    data.students[student.id] = {
      ...student,
      createdAt: existing?.createdAt ?? student.createdAt,
    };
    writeLocal(data);
    return;
  }
  await update(ref(db, `students/${student.id}`), student);
}

/** Refresh presence without touching a returning student's `createdAt`. */
export async function touchStudent(id: string, name: string): Promise<void> {
  const db = getDb();
  if (!db) {
    const data = readLocal();
    const existing = data.students[id];
    if (!existing) return;
    data.students[id] = { ...existing, name, lastSeenAt: Date.now() };
    writeLocal(data);
    return;
  }
  await update(ref(db, `students/${id}`), { name, lastSeenAt: Date.now() });
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const db = getDb();
  if (!db) {
    const data = readLocal();
    data.submissions[submission.id] = submission;
    writeLocal(data);
    return;
  }
  await update(ref(db, `submissions/${submission.id}`), stripUndefined(submission));
}

export async function patchSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  const db = getDb();
  if (!db) {
    const data = readLocal();
    const existing = data.submissions[id];
    if (!existing) return;
    data.submissions[id] = { ...existing, ...patch, updatedAt: Date.now() };
    writeLocal(data);
    return;
  }
  await update(ref(db, `submissions/${id}`), stripUndefined({ ...patch, updatedAt: Date.now() }));
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = getDb();
  if (!db) {
    const data = readLocal();
    delete data.submissions[id];
    writeLocal(data);
    return;
  }
  await remove(ref(db, `submissions/${id}`));
}

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
