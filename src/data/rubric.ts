import type { RubricDimension, RubricKey } from '../types';

/**
 * The grading rubric. Weights must sum to 1. Scores are 0–100 per dimension;
 * the weighted total is computed here, never taken from the model's output.
 */
export const RUBRIC: RubricDimension[] = [
  {
    key: 'promptQuality',
    label: 'Prompt Quality',
    weight: 0.4,
    description:
      'Is the prompt itself well built? Clear task, useful context, stated constraints, defined output shape.',
    criteria: [
      '90-100: Unambiguous task, necessary context supplied, explicit constraints and output format, no filler. A competent stranger could run it and get the intended result.',
      '75-89: Clear and workable with one soft spot — a vague constraint, a missing edge case, or slight redundancy.',
      '60-74: The intent is recoverable but the prompt leans on the model to guess format, scope, or audience.',
      '40-59: Ambiguous or contradictory instructions; output shape undefined; likely to produce something off-target.',
      '0-39: Barely a prompt — a bare keyword, a question with no framing, or instructions that fight each other.',
    ].join('\n'),
  },
  {
    key: 'understanding',
    label: 'Understanding',
    weight: 0.3,
    description:
      'Does the reflection show you know WHY the prompt works, not just that it did?',
    criteria: [
      '90-100: Names the specific techniques used and explains the mechanism — why this phrasing changes the output. Anticipates where it would break.',
      '75-89: Correct explanation of what was done and why, but stays descriptive rather than causal.',
      '60-74: Restates the prompt in other words; technique names appear without explanation.',
      '40-59: Vague or partly wrong account of why the prompt behaves as it does.',
      '0-39: No reflection, or a reflection unrelated to the prompt written.',
    ].join('\n'),
  },
  {
    key: 'execution',
    label: 'Execution',
    weight: 0.2,
    description:
      "Did the prompt actually produce what the exercise asked for when it was run?",
    criteria: [
      "90-100: Output fully satisfies every success criterion, in the requested shape, with no cleanup needed.",
      '75-89: Output meets the goal with a minor deviation — small format slip or one criterion partially met.',
      '60-74: Roughly on target but needs manual fixing to be usable.',
      '40-59: Output misses the point of the exercise or ignores the required format.',
      '0-39: Output is empty, an error, or unrelated to the task.',
    ].join('\n'),
  },
  {
    key: 'growth',
    label: 'Growth',
    weight: 0.1,
    description:
      'Compared to your earlier attempts, did this one move forward? First attempts are judged on ambition, not deltas.',
    criteria: [
      'When prior attempts exist: 90-100 fixes the exact weaknesses previously flagged and adds something beyond them; 60-74 shows small edits without addressing the flagged issues; below 40 is a resubmission with no meaningful change.',
      'When this is the first attempt: score the ambition and care of the work on its own — a thoughtful, deliberate first attempt earns 80-90. Do not penalise the absence of history, and never score above 90 without evidence of iteration.',
    ].join('\n'),
  },
];

export const RUBRIC_BY_KEY: Record<RubricKey, RubricDimension> = Object.fromEntries(
  RUBRIC.map((d) => [d.key, d]),
) as Record<RubricKey, RubricDimension>;

export const RUBRIC_KEYS: RubricKey[] = RUBRIC.map((d) => d.key);

/** Score at or above which a submission is considered to clear the bar. */
export const PASSING_SCORE = 75;

/** Weighted 0–100 total. Missing or out-of-range dimensions are clamped to 0–100. */
export function weightedTotal(scores: Partial<Record<RubricKey, number>>): number {
  const total = RUBRIC.reduce((sum, dim) => {
    const raw = scores[dim.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    return sum + Math.min(100, Math.max(0, value)) * dim.weight;
  }, 0);
  return Math.round(total * 10) / 10;
}
