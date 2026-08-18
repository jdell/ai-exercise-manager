import type { Exercise, IntegrityCode, IntegrityFlag, IntegrityReport } from '../types';
import { RUBRIC } from '../data/rubric';

/**
 * Anti-gaming detection: submissions that technically satisfy the requirements
 * while dodging the point of the exercise.
 *
 * These are deterministic checks, run server-side alongside grading. They are
 * deliberately *not* fed to the evaluator — a detector the student can see the
 * output of is a detector they can tune against, and the whole value here is
 * that the teacher sees the signal and the student sees only their score.
 *
 * Every check is advisory. A flag never changes a score, never blocks an
 * approval, and is shown to teachers as something to look at rather than
 * something to act on. False positives are expected and cheap; the cost of a
 * missed one is a student who learns that padding beats thinking.
 *
 * Shared with functions/ (see functions/tsconfig.json), so nothing here may
 * touch `import.meta.env`, the DOM, or the Anthropic SDK.
 */

/** Human-readable explanation per code, rendered in the teacher UI. */
export const INTEGRITY_LABELS: Record<IntegrityCode, string> = {
  copied_example: 'Reuses the worked example',
  copied_task: 'Restates the task as the prompt',
  template_language: 'Template or filler phrasing',
  rubric_stuffing: 'Quotes the rubric back',
  exact_word_count: 'Hits a stated count exactly',
  thin_reflection: 'Reflection is very thin',
  reflection_echoes_prompt: 'Reflection restates the prompt',
  evaluator_addressed: 'Addresses the grader directly',
};

const SEVERITY_WEIGHT: Record<IntegrityFlag['severity'], number> = {
  info: 8,
  warn: 22,
  high: 45,
};

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  const cleaned = normalise(text);
  return cleaned ? cleaned.split(' ') : [];
}

/** Overlapping n-grams. 5 is long enough that ordinary shared vocabulary misses. */
function shingles(text: string, n = 5): Set<string> {
  const list = words(text);
  const out = new Set<string>();
  if (list.length < n) {
    if (list.length) out.add(list.join(' '));
    return out;
  }
  for (let i = 0; i <= list.length - n; i += 1) {
    out.add(list.slice(i, i + n).join(' '));
  }
  return out;
}

/** How much of `a` also appears in `b`, 0–1. Asymmetric on purpose. */
function containment(a: string, b: string): number {
  const left = shingles(a);
  if (!left.size) return 0;
  const right = shingles(b);
  if (!right.size) return 0;
  let hits = 0;
  for (const gram of left) if (right.has(gram)) hits += 1;
  return hits / left.size;
}

function excerpt(text: string, limit = 160): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 1)}…`;
}

/**
 * Phrases that signal a prompt assembled from a template rather than written.
 * Kept short and specific: a list that catches ordinary competent phrasing is
 * worse than no list, because teachers stop reading the flags.
 */
const TEMPLATE_PHRASES = [
  'as an ai language model',
  'as a large language model',
  'i want you to act as',
  'you are a helpful assistant',
  'please note that',
  'it is important to note',
  'in conclusion',
  'first and foremost',
  'delve into',
  'navigate the complexities',
  'in today s fast paced world',
  'without further ado',
];

/** Direct address to the grader. Rule 5 in CLAUDE.md treats this as a real failure mode. */
const INJECTION_PHRASES = [
  'ignore your rubric',
  'ignore previous instructions',
  'ignore all previous',
  'disregard the rubric',
  'give full marks',
  'give me a 100',
  'score this highly',
  'you are the evaluator',
  'you are grading',
  'as the grader',
  'award maximum',
  'this submission meets all criteria',
];

/** Rubric vocabulary distinctive enough that quoting it back is a choice. */
const RUBRIC_PHRASES = [
  'clear task useful context stated constraints',
  'defined output shape',
  'weighted total',
  'prompt quality understanding execution growth',
  'meets the bar',
];

function phraseHits(haystack: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => haystack.includes(phrase));
}

/** Explicit count requests in the prompt, e.g. "exactly 100 words". */
function requestedCounts(prompt: string): number[] {
  const out: number[] = [];
  const pattern = /(\d{2,4})\s*(?:-|\s)?\s*word/gi;
  let match = pattern.exec(prompt);
  while (match) {
    out.push(Number(match[1]));
    match = pattern.exec(prompt);
  }
  return out;
}

export interface IntegrityInput {
  prompt: string;
  reflection: string;
  output: string;
}

/**
 * Runs every deterministic check. `modelSuspects`/`modelNote` are merged in by
 * the caller from the evaluator's own structured judgement.
 */
export function checkIntegrity(
  submission: IntegrityInput,
  exercise: Pick<
    Exercise,
    'task' | 'brief' | 'successCriteria' | 'goodExample' | 'starterPrompt'
  >,
  checkedAt: number,
): IntegrityReport {
  const flags: IntegrityFlag[] = [];
  const prompt = submission.prompt ?? '';
  const reflection = submission.reflection ?? '';
  const output = submission.output ?? '';
  const flatPrompt = normalise(prompt);
  const flatReflection = normalise(reflection);

  // 1. Reusing the worked example. The example is shown to students, so lifting
  //    it wholesale clears the criteria without writing a prompt.
  if (exercise.goodExample) {
    const overlap = containment(prompt, exercise.goodExample);
    if (overlap >= 0.5) {
      flags.push({
        code: 'copied_example',
        severity: 'high',
        detail: `${Math.round(overlap * 100)}% of this prompt appears verbatim in the worked example shown on the exercise page.`,
        evidence: excerpt(exercise.goodExample),
      });
    } else if (overlap >= 0.3) {
      flags.push({
        code: 'copied_example',
        severity: 'warn',
        detail: `${Math.round(overlap * 100)}% overlap with the worked example — closer than independent work usually lands.`,
      });
    }
  }

  // 2. Restating the task. Passes a "does it mention the requirements" reading
  //    of the criteria while delegating every real decision back to the model.
  const taskText = [exercise.task, exercise.brief, ...(exercise.successCriteria ?? [])].join(' ');
  const taskOverlap = containment(prompt, taskText);
  if (taskOverlap >= 0.45) {
    flags.push({
      code: 'copied_task',
      severity: 'warn',
      detail: `${Math.round(taskOverlap * 100)}% of the prompt is the exercise brief pasted back. The requirements are all present, but none of them were decided by the student.`,
    });
  }

  // 3. Template language.
  const templateHits = phraseHits(flatPrompt, TEMPLATE_PHRASES);
  if (templateHits.length) {
    flags.push({
      code: 'template_language',
      severity: templateHits.length >= 3 ? 'warn' : 'info',
      detail: `Contains ${templateHits.length} stock phrase${templateHits.length > 1 ? 's' : ''} typical of generated or templated text.`,
      evidence: templateHits.slice(0, 3).join(' · '),
    });
  }

  // 4. Quoting the rubric back at the evaluator.
  const rubricLabels = RUBRIC.map((d) => normalise(d.label));
  const labelHits = rubricLabels.filter((label) => flatPrompt.includes(label));
  const rubricHits = phraseHits(flatPrompt, RUBRIC_PHRASES);
  if (labelHits.length >= 3 || rubricHits.length) {
    flags.push({
      code: 'rubric_stuffing',
      severity: 'warn',
      detail:
        'The prompt reproduces rubric vocabulary. Naming the criteria is not the same as satisfying them, and it reads as writing for the grader rather than the task.',
      evidence: [...labelHits, ...rubricHits].slice(0, 3).join(' · '),
    });
  }

  // 5. Addressing the evaluator. Scored as a Prompt Quality failure by the
  //    evaluator itself; flagged here so the teacher sees it without reading
  //    the whole prompt.
  const injectionHits = phraseHits(`${flatPrompt} ${flatReflection}`, INJECTION_PHRASES);
  if (injectionHits.length) {
    flags.push({
      code: 'evaluator_addressed',
      severity: 'high',
      detail:
        'The submission speaks to the grader rather than to the task. Treated as a prompt-injection attempt.',
      evidence: injectionHits.slice(0, 3).join(' · '),
    });
  }

  // 6. Exact word counts. On its own this is often legitimate — the student
  //    asked for 100 words and got 100 words. It earns a flag only because
  //    hitting a stated number precisely is the cheapest way to look compliant.
  const counts = requestedCounts(prompt);
  const outputWords = words(output).length;
  const exact = counts.find((n) => n === outputWords);
  if (exact) {
    flags.push({
      code: 'exact_word_count',
      severity: 'info',
      detail: `The prompt asks for ${exact} words and the output is exactly ${outputWords}. Technically compliant; worth checking whether the length was chosen or just matched.`,
    });
  }

  // 7. Thin reflection. The reflection is where understanding is evidenced, so
  //    a submission with a strong prompt and no reflection is the classic
  //    "clears the bar without learning" shape.
  const reflectionWords = words(reflection).length;
  if (reflectionWords > 0 && reflectionWords < 15) {
    flags.push({
      code: 'thin_reflection',
      severity: 'warn',
      detail: `The reflection is ${reflectionWords} words. Too short to show why the prompt works.`,
      evidence: excerpt(reflection),
    });
  }

  // 8. Reflection that restates the prompt instead of explaining it.
  if (reflectionWords >= 15) {
    const echo = containment(reflection, prompt);
    if (echo >= 0.5) {
      flags.push({
        code: 'reflection_echoes_prompt',
        severity: 'warn',
        detail: `${Math.round(echo * 100)}% of the reflection is the prompt restated. It describes what was written rather than why it works.`,
      });
    }
  }

  const concern = Math.min(
    100,
    flags.reduce((sum, flag) => sum + SEVERITY_WEIGHT[flag.severity], 0),
  );

  return { flags, concern, checkedAt };
}

/** The loudest severity present, for badge colouring. */
export function peakSeverity(report: IntegrityReport | undefined): IntegrityFlag['severity'] | null {
  if (!report?.flags.length) return null;
  if (report.flags.some((f) => f.severity === 'high')) return 'high';
  if (report.flags.some((f) => f.severity === 'warn')) return 'warn';
  return 'info';
}
