import { FunctionsError, httpsCallable } from 'firebase/functions';
import { getFns } from './firebase';
import { parsePartialEvaluation } from './partial-json';
import type { PartialEvaluation } from './partial-json';
import type { Evaluation } from '../types';

/**
 * The browser's half of the Claude Evaluator.
 *
 * There is no Anthropic SDK and no API key here. Both capabilities are Cloud
 * Functions (functions/src/index.ts): the key lives in Secret Manager, and the
 * scores and produced output are written server-side with admin credentials so
 * a client cannot fabricate either.
 *
 * Both stream:
 *   runStudentPrompt() — executes a student's prompt so they can see what it
 *                        actually produces, streamed token by token.
 *   evaluateSubmission() — grades a submission against the rubric, streamed so
 *                          the student watches the scores arrive instead of a
 *                          spinner. The deltas are fragments of one structured
 *                          JSON document, which is why the preview goes through
 *                          a lenient reader rather than JSON.parse.
 *
 * The prompt text the evaluator receives is still importable from
 * `./evaluator-prompt` — the console renders it, the function sends it, and
 * both read the same module.
 */

/** Grading at effort 'high' can run for minutes; give it the function's budget. */
const EVALUATE_TIMEOUT_MS = 540_000;
const RUN_TIMEOUT_MS = 300_000;

export class NotConfiguredError extends Error {
  constructor() {
    super(
      'Firebase is not configured, so the Claude Evaluator is unavailable. Set the VITE_FIREBASE_* variables.',
    );
    this.name = 'NotConfiguredError';
  }
}

function fns() {
  const instance = getFns();
  if (!instance) throw new NotConfiguredError();
  return instance;
}

// ---------------------------------------------------------------------------
// 1. Run a student's prompt
// ---------------------------------------------------------------------------

export interface RunResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Runs the student's prompt against the exercise's fixed material and streams
 * the text back as it arrives.
 *
 * Only the exercise id crosses the wire — the material itself is attached
 * server-side, so every attempt at an exercise is judged against identical
 * input and the function is not a general-purpose Claude proxy.
 */
export async function runStudentPrompt(
  exerciseId: string,
  prompt: string,
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<RunResult> {
  const callable = httpsCallable<
    { exerciseId: string; prompt: string },
    RunResult,
    { text: string }
  >(fns(), 'runPrompt', { timeout: RUN_TIMEOUT_MS });

  const { stream, data } = await callable.stream({ exerciseId, prompt }, { signal });

  for await (const chunk of stream) {
    if (chunk?.text) onDelta?.(chunk.text);
  }

  return await data;
}

// ---------------------------------------------------------------------------
// 1b. Run a playground experiment
// ---------------------------------------------------------------------------

/**
 * Runs a free-form prompt against material the student pasted in, streamed.
 *
 * Unlike `runStudentPrompt` this sends the material as well as the prompt —
 * there is no exercise to look it up from. The function it calls is quota'd per
 * user for exactly that reason, and a run leaves no record anywhere.
 */
export async function runPlaygroundPrompt(
  prompt: string,
  material: string,
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<RunResult> {
  const callable = httpsCallable<
    { prompt: string; material: string },
    RunResult,
    { text: string }
  >(fns(), 'runPlayground', { timeout: RUN_TIMEOUT_MS });

  const { stream, data } = await callable.stream({ prompt, material }, { signal });

  for await (const chunk of stream) {
    if (chunk?.text) onDelta?.(chunk.text);
  }

  return await data;
}

// ---------------------------------------------------------------------------
// 2. Grade a submission
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  output: string;
  evaluation: Evaluation;
}

/**
 * Grades a submission that has already been written to the database. Nothing
 * but the id is sent: the function reads the prompt it will grade, runs it, and
 * records the output and the score itself.
 */
export interface EvaluateOptions {
  signal?: AbortSignal;
  /**
   * Called with whatever is legible in the partial response so far, so the
   * student sees scores and feedback appear rather than a spinner. The value is
   * a preview only — the returned Evaluation is the one the function computed
   * and wrote, and it is what the teacher reviews.
   */
  onPartial?: (partial: PartialEvaluation) => void;
}

export async function evaluateSubmission(
  submissionId: string,
  options: EvaluateOptions = {},
): Promise<EvaluationResult> {
  const { signal, onPartial } = options;
  const callable = httpsCallable<{ submissionId: string }, EvaluationResult, { text: string }>(
    fns(),
    'evaluateSubmission',
    { timeout: EVALUATE_TIMEOUT_MS },
  );

  const { stream, data } = await callable.stream({ submissionId }, { signal });

  let buffer = '';
  for await (const chunk of stream) {
    if (!chunk?.text) continue;
    buffer += chunk.text;
    onPartial?.(parsePartialEvaluation(buffer));
  }

  return await data;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Human-readable message for anything thrown by the calls above.
 *
 * The functions already phrase their failures for a student — including
 * refusals, which are surfaced verbatim rather than silently retried on a
 * fallback model — so in most cases this just unwraps the message.
 */
export function describeError(err: unknown): string {
  if (err instanceof NotConfiguredError) return err.message;
  if (err instanceof FunctionsError) {
    switch (err.code) {
      case 'functions/unauthenticated':
        return 'Your session expired. Sign in again to continue.';
      case 'functions/permission-denied':
        return err.message || 'You do not have access to that.';
      case 'functions/resource-exhausted':
        // The playground quota. The function phrases this one for a student,
        // including which paths are unaffected, so pass it through.
        return err.message || 'You have run out of runs for now. Try again shortly.';
      case 'functions/deadline-exceeded':
        return 'Claude took too long to respond. Try again.';
      case 'functions/unavailable':
        return 'Could not reach the evaluator. Check your network connection.';
      default:
        return err.message || 'The evaluator returned an error.';
    }
  }
  if (err instanceof DOMException && err.name === 'AbortError') return 'Cancelled.';
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
