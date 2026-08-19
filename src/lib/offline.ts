import type { Exercise, Submission } from '../types';

/**
 * The offline read cache.
 *
 * The service worker makes the *app* open without a connection. This makes it
 * open with something in it: the exercise list and the reader's own
 * submissions, mirrored to localStorage on every snapshot and read back when
 * the database subscription has nothing to give.
 *
 * Why not the Firebase SDK's own persistence: the web build of Realtime
 * Database keeps an in-memory cache that dies with the tab. `setPersistence`
 * is a mobile-SDK feature. So a browser-side mirror is the only way a student
 * on a bus reads tomorrow's brief.
 *
 * Three rules hold this together:
 *
 *   1. **The cache is a fallback, never a source.** A live snapshot always
 *      wins and always overwrites. Nothing derives from the cache that is not
 *      also derived from the live data — progress, analytics, and badges are
 *      computed the same way either way.
 *   2. **Submissions are scoped to a uid and dropped on sign-out.** This is a
 *      classroom machine; the next student to sit down must not find the last
 *      one's work in the app. (localStorage is readable in devtools by anyone
 *      at the keyboard, so this is hygiene, not a security boundary — the
 *      boundary is database.rules.json.)
 *   3. **It is bounded.** Submissions carry produced output, which is long.
 *      Writing until the quota throws would break the cache for everything
 *      else, so the newest work is kept and the oldest is dropped.
 */

const PREFIX = 'aiskills.offline';
/** Bump to discard every mirror at once when the cached shape changes. */
const SCHEMA = 1;

const EXERCISES_KEY = `${PREFIX}.${SCHEMA}.exercises`;
const submissionsKey = (uid: string) => `${PREFIX}.${SCHEMA}.submissions.${uid}`;

/**
 * Roughly a third of the usual 5 MB localStorage budget. The playground draft,
 * the language, and the theme live in the same store and must still fit.
 */
const MAX_SUBMISSION_BYTES = 1_500_000;

interface Envelope<T> {
  savedAt: number;
  data: T;
}

function read<T>(key: string): Envelope<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    return parsed && typeof parsed === 'object' && 'data' in parsed ? parsed : null;
  } catch {
    // Corrupt or unreadable (private browsing). An empty cache is a valid one.
    return null;
  }
}

function write<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Quota, or storage disabled. Losing the mirror costs offline reading and
    // nothing else — never let it fail the render that triggered it.
  }
}

function drop(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do, and nothing worth reporting.
  }
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

/**
 * Only the teacher-authored ones are mirrored. The built-in nine ship inside
 * the JS bundle, which the service worker has already cached — mirroring them
 * would be storing the same text twice.
 */
export function cacheCustomExercises(exercises: Exercise[]): void {
  write(EXERCISES_KEY, exercises);
}

export function readCachedExercises(): Exercise[] {
  return read<Exercise[]>(EXERCISES_KEY)?.data ?? [];
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

/**
 * Newest first, trimmed to fit. Trimming by count would still overflow on a
 * class whose exercises produce long transcripts, so it trims by size and
 * reports nothing — an incomplete offline history is better than none, and the
 * live list is complete the moment there is a connection.
 */
export function cacheSubmissions(uid: string, submissions: Submission[]): void {
  const newestFirst = [...submissions].sort((a, b) => b.createdAt - a.createdAt);

  let kept = newestFirst;
  while (kept.length > 0 && JSON.stringify(kept).length > MAX_SUBMISSION_BYTES) {
    kept = kept.slice(0, Math.max(1, Math.floor(kept.length * 0.75)));
    if (kept.length === 1) break;
  }

  write(submissionsKey(uid), kept);
}

export function readCachedSubmissions(uid: string): Submission[] {
  return read<Submission[]>(submissionsKey(uid))?.data ?? [];
}

/** When the cache was last refreshed, so the UI can say how stale it is. */
export function cachedSubmissionsAt(uid: string): number | undefined {
  return read<Submission[]>(submissionsKey(uid))?.savedAt;
}

/**
 * Called on sign-out. Rule 2 above: the next person at this machine opens a
 * clean app.
 */
export function clearOfflineCache(uid?: string): void {
  if (uid) drop(submissionsKey(uid));
  drop(EXERCISES_KEY);
}
