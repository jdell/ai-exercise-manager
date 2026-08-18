import type { RubricKey } from '../types';
import { RUBRIC_KEYS } from '../data/rubric';

/**
 * Reads whatever is legible out of a half-written JSON object.
 *
 * The evaluator streams a structured output, so the text arriving mid-request
 * is a truncated JSON document — not something JSON.parse can touch until the
 * final token. This pulls the fields the student is waiting on out of the
 * partial buffer so the UI can show scores and feedback as they land.
 *
 * This is a *preview* reader, deliberately lenient: it never throws, it only
 * reports values it has seen terminated, and its output is thrown away once
 * the real parse of the finished document succeeds. It can be fooled by a
 * key-like sequence inside a prose string; that costs a flicker in the preview
 * and nothing else.
 */

export interface PartialEvaluation {
  scores: Partial<Record<RubricKey, number>>;
  rationale: Partial<Record<RubricKey, string>>;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export const EMPTY_PARTIAL: PartialEvaluation = {
  scores: {},
  rationale: {},
  summary: '',
  strengths: [],
  improvements: [],
};

export function parsePartialEvaluation(text: string): PartialEvaluation {
  const result: PartialEvaluation = {
    scores: {},
    rationale: {},
    summary: readString(text, 'summary'),
    strengths: readStringArray(text, 'strengths'),
    improvements: readStringArray(text, 'improvements'),
  };

  for (const key of RUBRIC_KEYS) {
    // Each rubric key appears twice in the schema — once as an integer score
    // and once as a rationale string inside the nested object. Dispatch on the
    // value's first character rather than assuming which arrives first.
    for (const start of valueStarts(text, key)) {
      const char = text[start];
      if (char === '"') {
        if (result.rationale[key] === undefined) {
          const value = readStringAt(text, start);
          if (value.text) result.rationale[key] = value.text;
        }
      } else if (char === '-' || (char >= '0' && char <= '9')) {
        if (result.scores[key] === undefined) {
          const value = readNumberAt(text, start);
          if (value !== undefined) result.scores[key] = value;
        }
      }
    }
  }

  return result;
}

/** True once every field the UI previews has arrived. */
export function partialIsComplete(partial: PartialEvaluation): boolean {
  return (
    RUBRIC_KEYS.every((key) => partial.scores[key] !== undefined) &&
    partial.summary.length > 0 &&
    partial.strengths.length > 0 &&
    partial.improvements.length > 0
  );
}

// ---------------------------------------------------------------------------
// Scanning helpers
// ---------------------------------------------------------------------------

/** Index of the first character of each value written under `key`. */
function valueStarts(text: string, key: string): number[] {
  const needle = `"${key}"`;
  const starts: number[] = [];
  let from = 0;

  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) return starts;
    from = at + needle.length;

    let i = from;
    while (i < text.length && isSpace(text[i])) i++;
    if (text[i] !== ':') continue;
    i++;
    while (i < text.length && isSpace(text[i])) i++;
    if (i < text.length) starts.push(i);
  }
}

function readString(text: string, key: string): string {
  for (const start of valueStarts(text, key)) {
    if (text[start] !== '"') continue;
    return readStringAt(text, start).text;
  }
  return '';
}

/**
 * Reads a JSON string starting at the opening quote. Returns what has arrived
 * so far, so a summary can type itself out rather than appearing all at once.
 */
function readStringAt(text: string, start: number): { text: string; closed: boolean } {
  let out = '';
  let i = start + 1;

  while (i < text.length) {
    const char = text[i];

    if (char === '\\') {
      const escape = text[i + 1];
      if (escape === undefined) break; // escape split across chunks — stop here
      if (escape === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += UNESCAPE[escape] ?? escape;
      i += 2;
      continue;
    }

    if (char === '"') return { text: out, closed: true };
    out += char;
    i++;
  }

  return { text: out, closed: false };
}

const UNESCAPE: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  '"': '"',
  '\\': '\\',
  '/': '/',
};

/**
 * Reads a number only once it is followed by a delimiter, so a score of 85
 * never flashes as 8 while the second digit is still in flight.
 */
function readNumberAt(text: string, start: number): number | undefined {
  let i = start;
  if (text[i] === '-') i++;
  while (i < text.length && ((text[i] >= '0' && text[i] <= '9') || text[i] === '.')) i++;
  if (i >= text.length) return undefined; // still arriving

  const value = Number(text.slice(start, i));
  return Number.isFinite(value) ? value : undefined;
}

/** Complete elements of a string array. Partial trailing elements are held back. */
function readStringArray(text: string, key: string): string[] {
  for (const start of valueStarts(text, key)) {
    if (text[start] !== '[') continue;

    const items: string[] = [];
    let i = start + 1;

    while (i < text.length) {
      while (i < text.length && (isSpace(text[i]) || text[i] === ',')) i++;
      if (i >= text.length || text[i] === ']') return items;
      if (text[i] !== '"') return items;

      const value = readStringAt(text, i);
      if (!value.closed) return items;
      items.push(value.text);
      i += lengthOfEncodedString(text, i);
    }

    return items;
  }
  return [];
}

/** Number of source characters the string starting at `start` occupies. */
function lengthOfEncodedString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '"') return i - start + 1;
    i++;
  }
  return i - start;
}

function isSpace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}
