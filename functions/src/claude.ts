import Anthropic from '@anthropic-ai/sdk';
import type {
  Evaluation,
  Exercise,
  Locale,
  RubricKey,
  SecondOpinion,
  Submission,
} from '../../src/types';
import { effectiveWeights, weightedTotal } from '../../src/data/rubric';
import { checkIntegrity } from '../../src/lib/integrity';
import {
  EVALUATION_SCHEMA,
  SECOND_OPINION_SCHEMA,
  buildEvaluationRequest,
  buildEvaluatorSystemPrompt,
  buildRunInput,
  buildSecondOpinionSystemPrompt,
  clampScore,
  type RawEvaluation,
  type RawSecondOpinion,
} from '../../src/lib/evaluator-prompt';

/**
 * Every Anthropic API call in the system. This runs on Cloud Functions, never
 * in a browser: the API key comes from Secret Manager and is not present in any
 * client bundle, which is the whole point of the module living here.
 *
 * `dangerouslyAllowBrowser` is deliberately absent — if it ever comes back,
 * something has moved to the wrong side of the trust boundary.
 */

export const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';

/**
 * The second reader. Haiku is chosen for speed and cost: it runs concurrently
 * with the Opus grade and adds a few seconds, not a second minute.
 *
 * Set `SECOND_OPINION_MODEL` to '' (or 'off') on the function to disable the
 * pass entirely — the primary grade is unaffected either way.
 */
export const SECOND_OPINION_MODEL = (() => {
  const configured = process.env.SECOND_OPINION_MODEL;
  if (configured === undefined) return 'claude-haiku-4-5';
  const trimmed = configured.trim();
  return trimmed === '' || trimmed.toLowerCase() === 'off' ? null : trimmed;
})();

export class RefusalError extends Error {
  constructor(category: string | null | undefined, explanation?: string | null) {
    super(
      `Claude declined this request${category ? ` (category: ${category})` : ''}.` +
        (explanation ? ` ${explanation}` : ''),
    );
    this.name = 'RefusalError';
  }
}

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, maxRetries: 2 });
}

/** Concatenate every text block; thinking blocks carry no text by default. */
function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
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
 * Executes the student's prompt verbatim. The exercise's test input is looked
 * up server-side rather than accepted from the caller, so every attempt at an
 * exercise is judged against identical material.
 */
export async function runStudentPrompt(
  apiKey: string,
  exercise: Exercise,
  prompt: string,
  onDelta?: (chunk: string) => void,
): Promise<RunResult> {
  const stream = client(apiKey).messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: buildRunInput(prompt, exercise.testInput) }],
  });

  if (onDelta) stream.on('text', onDelta);

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new RefusalError(message.stop_details?.category, message.stop_details?.explanation);
  }

  return {
    output: textOf(message.content),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

// ---------------------------------------------------------------------------
// 1b. Run a playground experiment
// ---------------------------------------------------------------------------

/**
 * A free-form run for the prompt playground.
 *
 * Every other call here is bounded by something the server chose: an exercise
 * id resolves to material the caller cannot supply, a submission id resolves to
 * a prompt already written to the database. This one is not — the caller
 * supplies both the prompt and the material, which makes it the closest thing
 * in the system to a general-purpose Claude proxy.
 *
 * That is the price of a playground, and it is paid for deliberately: a course
 * about prompting in which you cannot try a prompt is a worse course. The
 * compensating controls are all in the callable that wraps this one —
 * authentication, character caps, and a per-user quota, which the graded paths
 * do not have. Do not call this from anywhere else.
 *
 * Nothing is written to the database. A playground run leaves no record, which
 * is what lets students experiment without it looking like work being marked.
 */
export async function runPlaygroundPrompt(
  apiKey: string,
  prompt: string,
  material: string,
  onDelta?: (chunk: string) => void,
): Promise<RunResult> {
  const stream = client(apiKey).messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    // Cheaper than a graded run on purpose: the student is comparing two
    // outputs against each other, and depth is not the variable under test.
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: buildRunInput(prompt, material || undefined) }],
  });

  if (onDelta) stream.on('text', onDelta);

  const message = await stream.finalMessage();

  // Same rule as every other call site: stop_reason before content.
  if (message.stop_reason === 'refusal') {
    throw new RefusalError(message.stop_details?.category, message.stop_details?.explanation);
  }

  return {
    output: textOf(message.content),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

// ---------------------------------------------------------------------------
// 2. Grade a submission
// ---------------------------------------------------------------------------

export async function evaluateSubmission(
  apiKey: string,
  exercise: Exercise,
  submission: Pick<Submission, 'prompt' | 'reflection' | 'output' | 'attempt' | 'locale'>,
  priorAttempts: Submission[] = [],
  onDelta?: (chunk: string) => void,
): Promise<Evaluation> {
  // The language the student was working in, taken from the stored submission
  // rather than the request, and narrowed here so an unrecognised value cannot
  // reach the prompt.
  const locale: Locale = submission.locale === 'es' ? 'es' : 'en';

  // Streamed so the student can watch the evaluation arrive. The structured
  // output still lands as one JSON document; the deltas are fragments of it,
  // which is why the client previews them with a lenient reader.
  const stream = client(apiKey).messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 16000,
    system: [
      {
        type: 'text',
        text: buildEvaluatorSystemPrompt(exercise, locale),
        // The system prompt is identical for every submission to this
        // exercise in this language, so it caches across the whole class —
        // a bilingual class simply keeps two entries warm instead of one.
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      effort: 'high',
      format: {
        type: 'json_schema',
        schema: EVALUATION_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [
      {
        role: 'user',
        content: buildEvaluationRequest(exercise, submission, priorAttempts),
      },
    ],
  });

  if (onDelta) stream.on('text', onDelta);

  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new RefusalError(message.stop_details?.category, message.stop_details?.explanation);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The evaluation was cut off before it finished. Try submitting again.');
  }

  const raw = textOf(message.content);
  let parsed: RawEvaluation;
  try {
    parsed = JSON.parse(raw) as RawEvaluation;
  } catch {
    throw new Error(`The evaluator returned output that was not valid JSON: ${raw.slice(0, 200)}`);
  }

  const scores: Record<RubricKey, number> = {
    promptQuality: clampScore(parsed.promptQuality),
    understanding: clampScore(parsed.understanding),
    execution: clampScore(parsed.execution),
    growth: clampScore(parsed.growth),
  };

  // The exercise's own weights, not the rubric defaults — a teacher can
  // reweight a custom exercise. Recorded on the evaluation so an attempt graded
  // before a later reweighting still explains its own total.
  const weights = effectiveWeights(exercise.rubricWeights);

  // Deterministic gaming checks, merged with the evaluator's own read. Both are
  // advisory: neither touches `scores`, and the teacher decides what they mean.
  const now = Date.now();
  const integrity = checkIntegrity(
    { prompt: submission.prompt, reflection: submission.reflection, output: submission.output },
    exercise,
    now,
  );
  if (parsed.gaming?.suspected) {
    integrity.modelSuspects = true;
    integrity.modelNote = parsed.gaming.note ?? '';
    // A model that spotted something the heuristics missed still deserves the
    // teacher's attention, so it floors the concern score rather than adding to it.
    integrity.concern = Math.max(integrity.concern, 35);
  }

  return {
    scores,
    weightedTotal: weightedTotal(scores, weights),
    weights,
    integrity,
    summary: parsed.summary ?? '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    rationale: {
      promptQuality: parsed.rationale?.promptQuality ?? '',
      understanding: parsed.rationale?.understanding ?? '',
      execution: parsed.rationale?.execution ?? '',
      growth: parsed.rationale?.growth ?? '',
    },
    meetsBar: Boolean(parsed.meetsBar),
    model: message.model,
    evaluatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// 3. Second opinion
// ---------------------------------------------------------------------------

/**
 * Grades the same submission on a faster model so the teacher can see where two
 * readers disagree. Runs concurrently with the primary grade.
 *
 * Three things differ from the primary call and all three are deliberate:
 *
 *   - No `output_config.effort`. The effort parameter is rejected on Haiku 4.5
 *     — a request carrying it fails outright. Structured outputs *are*
 *     supported there, which is the part that matters.
 *   - No thinking parameter. Omitting it means no thinking on this model
 *     generation, which is the point: this pass buys speed, and depth is what
 *     the Opus grade is already for.
 *   - No prior attempts. Growth is scored from the work in front of it, so the
 *     two readers are judging the same artifact rather than the same history.
 */
export async function secondOpinion(
  apiKey: string,
  exercise: Exercise,
  submission: Pick<Submission, 'prompt' | 'reflection' | 'output' | 'attempt'>,
): Promise<SecondOpinion> {
  const model = SECOND_OPINION_MODEL;
  if (!model) throw new Error('The second opinion is disabled on this deployment.');

  const message = await client(apiKey).messages.create({
    model,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: buildSecondOpinionSystemPrompt(exercise),
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: SECOND_OPINION_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [
      { role: 'user', content: buildEvaluationRequest(exercise, submission, []) },
    ],
  });

  // Same rule as every other call site: stop_reason before content.
  if (message.stop_reason === 'refusal') {
    throw new RefusalError(message.stop_details?.category, message.stop_details?.explanation);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The second opinion was cut off before it finished.');
  }

  const raw = textOf(message.content);
  let parsed: RawSecondOpinion;
  try {
    parsed = JSON.parse(raw) as RawSecondOpinion;
  } catch {
    throw new Error(`The second reader returned output that was not valid JSON: ${raw.slice(0, 200)}`);
  }

  const scores: Record<RubricKey, number> = {
    promptQuality: clampScore(parsed.promptQuality),
    understanding: clampScore(parsed.understanding),
    execution: clampScore(parsed.execution),
    growth: clampScore(parsed.growth),
  };

  // Scored with the same weights as the primary read, or the totals would
  // differ for a reason that has nothing to do with disagreement.
  const weights = effectiveWeights(exercise.rubricWeights);

  return {
    model: message.model,
    scores,
    weightedTotal: weightedTotal(scores, weights),
    meetsBar: Boolean(parsed.meetsBar),
    note: parsed.note ?? '',
    evaluatedAt: Date.now(),
  };
}

/**
 * Human-readable message for anything thrown above. Refusals are surfaced
 * verbatim rather than retried on a fallback model — for a course about
 * prompting, "Claude declined this prompt" is information worth seeing.
 */
export function describeClaudeError(err: unknown): string {
  if (err instanceof RefusalError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) {
    return 'The server\'s Anthropic API key was rejected. Ask your teacher to check ANTHROPIC_API_KEY.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the Anthropic API. Wait a moment and try again.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'The server could not reach the Anthropic API. Try again shortly.';
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${err.status ?? 'unknown'}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong while talking to Claude.';
}
