import type { Submission } from '../types';

/**
 * Attempts written while offline, waiting for a connection.
 *
 * A student on a school bus or in a room with one bar can still write a prompt
 * and a reflection. What they cannot do is have it graded: the prompt is run
 * and scored by a Cloud Function, and there is no offline Claude. So the
 * attempt is parked here, and the sync in `hooks/useOutbox.ts` creates it and
 * asks for the grade as soon as the database says it is connected.
 *
 * Two things this deliberately does NOT do:
 *
 *   - **It does not queue the output.** A queued attempt carries the prompt and
 *     the reflection and nothing else; the function still runs the prompt
 *     itself and writes the transcript with admin credentials. Rule 8 does not
 *     get an exception for being offline — an offline queue that carried its
 *     own transcript would be exactly the text box for your own score that the
 *     whole design avoids.
 *   - **It does not renumber.** `attempt` is fixed when the student hits
 *     submit, from what they could see at the time. If they submit the same
 *     exercise from another device before this flushes, two records can share
 *     an attempt number — the revision timeline sorts on `createdAt` as a tie
 *     break and reads correctly either way. Silently renumbering someone's
 *     work to look tidier is the worse trade.
 */

const PREFIX = 'aiskills.outbox';
const SCHEMA = 1;
const key = (uid: string) => `${PREFIX}.${SCHEMA}.${uid}`;

/** A queue this long means something is wrong, not that someone is prolific. */
const MAX_QUEUED = 20;

export interface QueuedAttempt {
  submission: Submission;
  queuedAt: number;
  /** Set when a flush attempt failed, so the reader is told rather than left waiting. */
  lastError?: string;
}

/**
 * The queue is read by the workspace that fills it and by the sync banner that
 * drains it, and localStorage fires no event in the tab that wrote it. A
 * two-line emitter beats threading the queue through a context nothing else
 * would use.
 */
const listeners = new Set<() => void>();

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce(): void {
  for (const listener of listeners) listener();
}

function read(uid: string): QueuedAttempt[] {
  try {
    const raw = window.localStorage.getItem(key(uid));
    const parsed = raw ? (JSON.parse(raw) as QueuedAttempt[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(uid: string, queue: QueuedAttempt[]): void {
  try {
    if (queue.length === 0) window.localStorage.removeItem(key(uid));
    else window.localStorage.setItem(key(uid), JSON.stringify(queue));
  } catch {
    // Quota or disabled storage. The caller has already been told the attempt
    // is queued, so this is the one failure worth surfacing — but throwing
    // here would lose the work outright, and the caller re-reads the queue.
  }
  announce();
}

export function queued(uid: string): QueuedAttempt[] {
  return read(uid).sort((a, b) => a.queuedAt - b.queuedAt);
}

export function queuedCount(uid: string): number {
  return read(uid).length;
}

/** Returns false when the queue is full — the caller must say so, not swallow it. */
export function enqueue(submission: Submission): boolean {
  const queue = read(submission.studentId);
  if (queue.length >= MAX_QUEUED) return false;
  if (queue.some((entry) => entry.submission.id === submission.id)) return true;
  write(submission.studentId, [...queue, { submission, queuedAt: Date.now() }]);
  return true;
}

export function dequeue(uid: string, submissionId: string): void {
  write(
    uid,
    read(uid).filter((entry) => entry.submission.id !== submissionId),
  );
}

/** Records why a flush failed without dropping the work. */
export function markFailed(uid: string, submissionId: string, message: string): void {
  write(
    uid,
    read(uid).map((entry) =>
      entry.submission.id === submissionId ? { ...entry, lastError: message } : entry,
    ),
  );
}

export function clearOutbox(uid: string): void {
  write(uid, []);
}
