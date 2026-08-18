import Anthropic from '@anthropic-ai/sdk';
import type { Evaluation, Exercise, RubricKey, Submission } from '../../src/types';
import { effectiveWeights, weightedTotal } from '../../src/data/rubric';
import {
  EVALUATION_SCHEMA,
  buildEvaluationRequest,
  buildEvaluatorSystemPrompt,
  buildRunInput,
  clampScore,
  type RawEvaluation,
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
// 2. Grade a submission
// ---------------------------------------------------------------------------

export async function evaluateSubmission(
  apiKey: string,
  exercise: Exercise,
  submission: Pick<Submission, 'prompt' | 'reflection' | 'output' | 'attempt'>,
  priorAttempts: Submission[] = [],
  onDelta?: (chunk: string) => void,
): Promise<Evaluation> {
  // Streamed so the student can watch the evaluation arrive. The structured
  // output still lands as one JSON document; the deltas are fragments of it,
  // which is why the client previews them with a lenient reader.
  const stream = client(apiKey).messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 16000,
    system: [
      {
        type: 'text',
        text: buildEvaluatorSystemPrompt(exercise),
        // The system prompt is identical for every submission to this
        // exercise, so it caches across the whole class.
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

  return {
    scores,
    weightedTotal: weightedTotal(scores, weights),
    weights,
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
