import type { Exercise, Submission } from '../types';
import { RUBRIC } from '../data/rubric';

/**
 * CSV export, for teachers who need the numbers somewhere else — a gradebook, a
 * department spreadsheet, a parents' evening printout.
 *
 * Hand-rolled for the same reason the charts are: the requirement is RFC 4180
 * quoting and one download, and a CSV library would be a dependency to express
 * six lines of escaping.
 *
 * Two things here are not obvious and are the whole reason this is a module
 * rather than a template string at the call site.
 */

/**
 * Cells beginning `= + - @` are executed as formulas by Excel, Sheets, and
 * LibreOffice when the file is opened. A student's prompt is untrusted text
 * that ends up in a cell, so `=HYPERLINK(...)` in a reflection would run on a
 * teacher's machine the moment they double-click the export.
 *
 * Quoting does not prevent this — the formula is parsed after the CSV is. A
 * leading apostrophe is what the spreadsheet reads as "this is literal", and it
 * is stripped from the display, so the cell still shows the original text.
 */
function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180: double the quotes, wrap anything containing a delimiter. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = neutralise(String(value));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/**
 * Triggers the download.
 *
 * The BOM is not decoration: without it Excel on Windows reads a UTF-8 CSV as
 * the local codepage, and every name with an accent in it arrives mangled. This
 * is a bilingual app — that is most of a class, not an edge case.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** `ai-skills-review-queue-2026-08-19.csv` — sortable, and safe on every OS. */
export function stampedFilename(stem: string): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `ai-skills-${stem}-${date}.csv`;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const ISO = (ms: number | undefined) => (ms ? new Date(ms).toISOString() : '');

/**
 * One row per attempt.
 *
 * Deliberately *not* included: the produced output, and the integrity report.
 * The output is long enough to make the file unreadable in a spreadsheet, and
 * the integrity flags are a sort order for teacher attention that means nothing
 * outside the review screen that explains them — an exported "concern: 62"
 * column, read next to a name in a staff meeting, is exactly the accusation
 * the report is documented not to be.
 *
 * The score column follows the same rule as `analytics.ts`: the teacher's final
 * score where one exists, Claude's weighted total otherwise. The Claude column
 * beside it is what makes the override visible rather than silent.
 */
export function submissionsToCsv(
  submissions: Submission[],
  byId: Record<string, Exercise>,
): string {
  const header = [
    'student',
    'exercise',
    'exercise_order',
    'attempt',
    'status',
    'score',
    'claude_total',
    'teacher_final',
    ...RUBRIC.map((dim) => `claude_${dim.key}`),
    ...RUBRIC.map((dim) => `teacher_${dim.key}`),
    'decision',
    'teacher_comment',
    'reflection',
    'prompt',
    'submitted_at',
    'reviewed_at',
  ];

  const rows = submissions
    .slice()
    .sort(
      (a, b) =>
        a.studentName.localeCompare(b.studentName) ||
        a.exerciseOrder - b.exerciseOrder ||
        a.attempt - b.attempt,
    )
    .map((s) => {
      const claude = s.evaluation;
      const review = s.review;
      return [
        s.studentName,
        byId[s.exerciseId]?.title ?? s.exerciseId,
        s.exerciseOrder,
        s.attempt,
        s.status,
        review?.finalScore ?? claude?.weightedTotal ?? '',
        claude?.weightedTotal ?? '',
        review?.finalScore ?? '',
        ...RUBRIC.map((dim) => claude?.scores?.[dim.key] ?? ''),
        ...RUBRIC.map((dim) => review?.overrides?.[dim.key] ?? ''),
        review?.decision ?? '',
        review?.comment ?? '',
        s.reflection,
        s.prompt,
        ISO(s.createdAt),
        ISO(review?.reviewedAt),
      ];
    });

  return toCsv(header, rows);
}

/**
 * One row per student, one column per exercise, holding the state and the best
 * score — the same grid the class progress page renders.
 */
export function progressToCsv(
  students: { uid: string; displayName: string }[],
  exercises: Exercise[],
  progressFor: (uid: string) => Map<string, { state: string; best: number }>,
): string {
  const header = [
    'student',
    'approved',
    'total',
    'average',
    ...exercises.flatMap((e) => [`${e.order}. ${e.title}`, `${e.order}. score`]),
  ];

  const rows = students.map((student) => {
    const progress = progressFor(student.uid);
    const scores = exercises.map((e) => progress.get(e.id)?.best ?? 0).filter((s) => s > 0);
    const average = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : '';

    return [
      student.displayName,
      exercises.filter((e) => progress.get(e.id)?.state === 'approved').length,
      exercises.length,
      average,
      ...exercises.flatMap((e) => {
        const entry = progress.get(e.id);
        return [entry?.state ?? 'locked', entry?.best ? Math.round(entry.best) : ''];
      }),
    ];
  });

  return toCsv(header, rows);
}
