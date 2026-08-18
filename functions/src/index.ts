import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, type CallableResponse } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

import { EXERCISE_BY_ID } from '../../src/data/exercises';
import type { Submission, UserProfile } from '../../src/types';
import {
  describeClaudeError,
  evaluateSubmission as gradeSubmission,
  runStudentPrompt,
} from './claude';
import { db, priorAttempts, profileOf, requireString, requireUid, roleOf } from './guards';

/**
 * The server side of the app.
 *
 *   createProfile      — provisions /users/$uid after Firebase Auth sign-up,
 *                        and is the only place the teacher role is granted.
 *   runPrompt          — executes a student's prompt, streamed back to them.
 *   evaluateSubmission — runs the prompt, grades it, and writes both the output
 *                        and the score straight into the database.
 *
 * Two invariants hold everything together:
 *
 *   1. The Anthropic API key lives in Secret Manager and never leaves this
 *      process. Clients call these functions; they never call api.anthropic.com.
 *   2. Scores and produced output are written with admin credentials, so
 *      database rules can deny clients any write to `evaluation` or `output`.
 *      A student cannot invent a score or a transcript, only a prompt.
 */

initializeApp();

// The client SDK defaults to us-central1. Changing this means changing
// VITE_FUNCTIONS_REGION in the web app too, or calls will 404.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const TEACHER_SIGNUP_CODE = defineSecret('TEACHER_SIGNUP_CODE');

const MAX_PROMPT_CHARS = 20000;

/** Anything thrown by the Claude layer becomes a message the student can read. */
function claudeFailure(err: unknown): HttpsError {
  if (err instanceof HttpsError) return err;
  return new HttpsError('internal', describeClaudeError(err));
}

// ---------------------------------------------------------------------------
// createProfile — the role gate
// ---------------------------------------------------------------------------

/**
 * Creates /users/$uid for a freshly signed-up account.
 *
 * The teacher role is granted here and nowhere else: database rules forbid
 * clients from writing the `role` field at all, so the only path to `teacher`
 * is presenting the signing code to this function. That code is a Secret
 * Manager value, not a build-time constant in the bundle like the old
 * VITE_TEACHER_PASSCODE.
 *
 * Calling twice is a no-op that returns the existing profile — sign-up retries
 * must not be able to re-pick a role, and a returning Google user who already
 * has a profile never reaches the teacher-code check below.
 *
 * It is provider-agnostic on purpose: email/password sign-up and Google
 * sign-in both land here, and the only difference is where the display name
 * comes from.
 */
export const createProfile = onCall({ secrets: [TEACHER_SIGNUP_CODE] }, async (request) => {
  const uid = requireUid(request);

  const existing = await profileOf(uid);
  if (existing) return existing;

  // Email/password sign-up types a name into the form; Google sign-in brings
  // one on the ID token. Prefer what the caller sent so the form still wins,
  // and fall back to the provider's so a Google user never has to retype it.
  const typed = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';
  const fromProvider = typeof request.auth?.token.name === 'string' ? request.auth.token.name.trim() : '';
  const displayName = (typed || fromProvider).slice(0, 80);
  if (!displayName) {
    throw new HttpsError(
      'invalid-argument',
      'Your name is required, and your sign-in provider did not supply one.',
    );
  }

  const wantsTeacher = request.data?.role === 'teacher';

  if (wantsTeacher) {
    const expected = (TEACHER_SIGNUP_CODE.value() || '').trim();
    if (!expected) {
      throw new HttpsError(
        'failed-precondition',
        'No teacher signing code is configured on the server, so teacher accounts cannot be created.',
      );
    }
    const supplied = typeof request.data?.teacherCode === 'string' ? request.data.teacherCode.trim() : '';
    if (supplied !== expected) {
      throw new HttpsError('permission-denied', 'That teacher code is not correct.');
    }
  }

  const now = Date.now();
  const profile: UserProfile = {
    uid,
    email: request.auth?.token.email ?? '',
    displayName,
    role: wantsTeacher ? 'teacher' : 'student',
    createdAt: now,
    lastSeenAt: now,
  };

  await db().ref(`users/${uid}`).set(profile);
  logger.info('Provisioned profile', { uid, role: profile.role });
  return profile;
});

// ---------------------------------------------------------------------------
// runPrompt — a student's test run
// ---------------------------------------------------------------------------

/**
 * Runs a prompt and streams the text back. The exercise's fixed test material
 * is attached server-side, so this is not a general-purpose Claude proxy: a
 * caller can only run a prompt against one of the five exercises.
 */
export const runPrompt = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300 },
  async (request, response?: CallableResponse<{ text: string }>) => {
    requireUid(request);

    const prompt = requireString(request.data?.prompt, 'A prompt', MAX_PROMPT_CHARS);
    const exerciseId = requireString(request.data?.exerciseId, 'An exercise', 120);
    const exercise = EXERCISE_BY_ID[exerciseId];
    if (!exercise) throw new HttpsError('not-found', 'That exercise does not exist.');

    // sendChunk is async; chain the sends so deltas arrive in order and the
    // handler can wait for the last one before returning.
    let sending: Promise<unknown> = Promise.resolve();
    const onDelta = (text: string) => {
      sending = sending.then(() => response?.sendChunk({ text }));
    };

    try {
      const result = await runStudentPrompt(ANTHROPIC_API_KEY.value(), exercise, prompt, onDelta);
      await sending;
      return result;
    } catch (err) {
      logger.warn('runPrompt failed', { exerciseId, error: String(err) });
      throw claudeFailure(err);
    }
  },
);

// ---------------------------------------------------------------------------
// evaluateSubmission — run, grade, record
// ---------------------------------------------------------------------------

/**
 * Grades one submission. The caller sends nothing but an id: the prompt, the
 * output, and the attempt number are read from the database, so the graded
 * artifact is the one that was actually recorded.
 *
 * When the submission has no output yet the prompt is run here first, which is
 * what makes the transcript trustworthy — the student's browser never gets to
 * say what their prompt produced.
 */
export const evaluateSubmission = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    const uid = requireUid(request);
    const submissionId = requireString(request.data?.submissionId, 'A submission', 120);

    const ref = db().ref(`submissions/${submissionId}`);
    const snap = await ref.get();
    if (!snap.exists()) throw new HttpsError('not-found', 'That submission no longer exists.');
    const submission = snap.val() as Submission;

    const isOwner = submission.studentId === uid;
    const isTeacher = (await roleOf(uid)) === 'teacher';
    if (!isOwner && !isTeacher) {
      throw new HttpsError('permission-denied', 'That is not your submission.');
    }
    // Teachers can re-run a grade from the console; students only get the one
    // pass their submission was created for, plus a retry if it errored.
    if (!isTeacher && submission.status !== 'evaluating' && submission.status !== 'error') {
      throw new HttpsError('failed-precondition', 'This attempt has already been scored.');
    }

    const exercise = EXERCISE_BY_ID[submission.exerciseId];
    if (!exercise) throw new HttpsError('not-found', 'That exercise does not exist.');

    try {
      let output = submission.output ?? '';
      if (!output) {
        const run = await runStudentPrompt(ANTHROPIC_API_KEY.value(), exercise, submission.prompt);
        output = run.output;
        await ref.update({ output, updatedAt: Date.now() });
      }

      const evaluation = await gradeSubmission(
        ANTHROPIC_API_KEY.value(),
        exercise,
        { ...submission, output },
        await priorAttempts(submission),
      );

      await ref.update({
        output,
        evaluation,
        // A re-run by a teacher must not drag an approved attempt back into
        // the queue; only a first grade moves the status.
        status: submission.status === 'evaluating' || submission.status === 'error'
          ? 'awaiting_review'
          : submission.status,
        error: null,
        updatedAt: Date.now(),
      });

      return { output, evaluation };
    } catch (err) {
      const message = describeClaudeError(err);
      logger.warn('evaluateSubmission failed', { submissionId, error: message });
      if (submission.status === 'evaluating' || submission.status === 'error') {
        await ref.update({ status: 'error', error: message, updatedAt: Date.now() });
      }
      throw claudeFailure(err);
    }
  },
);
