import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { describeError, evaluateSubmission } from '../lib/claude';
import { createSubmission } from '../lib/store';
import { dequeue, markFailed, queued, subscribeOutbox, type QueuedAttempt } from '../lib/outbox';
import { useOnline } from './useData';

/**
 * The flush guard is **module-level, not a ref**, and that is load-bearing.
 *
 * Three components read this hook — the status strip in Layout, the workspace's
 * queued banner, and the Settings readout — so a per-instance guard would let
 * three flushes race and each try to create the same submission. The database
 * would reject the losers (a submission's write rule requires `!data.exists()`)
 * and the student would be told their work failed to send when it had already
 * arrived.
 */
let flushInFlight = false;

/**
 * Drains the offline outbox when the connection comes back.
 *
 * Two things it is careful about beyond the guard above:
 *
 *   - **One at a time.** Each queued attempt is created and then graded, and
 *     grading is a Cloud Function that can run for minutes at effort 'high'.
 *     Firing five of those concurrently from a phone that just reconnected is
 *     how you get five timeouts instead of five scores.
 *   - **A failure keeps the work.** Anything that goes wrong is recorded on the
 *     queued entry and left in the queue, except a submission the database has
 *     already accepted — that one is dequeued even if the grade failed, because
 *     the record exists and re-creating it would duplicate the attempt. The
 *     function writes its own failure onto the submission, so the student sees
 *     it in their history either way.
 *
 * Once started, a flush runs to completion rather than being cancelled on
 * unmount. Half-draining a queue because someone navigated is worse than
 * finishing: the writes are idempotent per entry, and the alternative is a
 * queue that stalls until the next reconnect.
 */
export function useOutbox(): {
  pending: QueuedAttempt[];
  syncing: boolean;
  /** The most recent flush failure, phrased for a student. */
  error: string;
} {
  const { session } = useSession();
  const online = useOnline();
  const [pending, setPending] = useState<QueuedAttempt[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setPending(session?.role === 'student' ? queued(session.id) : []);
  }, [session?.id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every instance subscribes, so a queue mutated by one of them — the
  // workspace enqueueing, the flush below dequeueing — repaints all of them.
  useEffect(() => {
    refresh();
    return subscribeOutbox(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!session || session.role !== 'student' || !online) return;
    if (flushInFlight) return;

    const batch = queued(session.id);
    if (batch.length === 0) return;

    const uid = session.id;
    flushInFlight = true;
    setSyncing(true);
    setError('');

    const report = (message: string) => {
      if (mounted.current) setError(message);
    };

    void (async () => {
      try {
        for (const entry of batch) {
          const { submission } = entry;
          try {
            await createSubmission(submission);
          } catch (err) {
            // Never written, so it stays queued and keeps its place.
            markFailed(uid, submission.id, describeError(err));
            report(describeError(err));
            continue;
          }

          // Past this point the attempt exists in the database. Whatever
          // happens to the grade it must leave the queue, or the next flush
          // creates it again — and the function records its own failures on the
          // record, so the student is not left uninformed either way.
          dequeue(uid, submission.id);
          try {
            await evaluateSubmission(submission.id);
          } catch (err) {
            report(describeError(err));
          }
        }
      } finally {
        flushInFlight = false;
        if (mounted.current) {
          setSyncing(false);
          refresh();
        }
      }
    })();
  }, [session?.id, session?.role, online, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pending, syncing, error };
}
