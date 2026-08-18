import type { Exercise, RubricKey, Submission } from '../types';
import { RUBRIC_KEYS } from '../data/rubric';

/**
 * Every number the analytics pages render, derived from /submissions on read.
 *
 * There is no analytics node and there will not be one — the same rule as
 * progress (CLAUDE.md #7). Denormalising these would let a dashboard drift away
 * from the submissions it claims to summarise, and the drift would be silent.
 *
 * Two conventions run through this file:
 *
 *   - A score always means the teacher's final score where one exists, and
 *     Claude's weighted total otherwise. Mixing "what Claude said" into a chart
 *     labelled "score" would misreport the class the moment a teacher overrides.
 *   - Elapsed time is measured from the *first* attempt at an exercise to the
 *     approval of the last, so a student who revised three times shows the real
 *     cost of the exercise rather than the cost of their final attempt.
 */

const DAY = 86_400_000;

/** Teacher's score if reviewed, else Claude's. Undefined when not yet graded. */
export function scoreOf(submission: Submission): number | undefined {
  return submission.review?.finalScore ?? submission.evaluation?.weightedTotal;
}

const mean = (values: number[]): number =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round = (n: number): number => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Per student
// ---------------------------------------------------------------------------

export interface ExerciseStat {
  exerciseId: string;
  title: string;
  order: number;
  attempts: number;
  /** Attempts beyond the first — what a revision actually costs. */
  revisions: number;
  firstScore?: number;
  bestScore?: number;
  approvedScore?: number;
  approved: boolean;
  /** ms from the first attempt to the approving review. */
  timeToApproval?: number;
  /** ms from the first attempt to the most recent activity. */
  elapsed?: number;
}

/**
 * Improvement between a student's first attempt at an exercise and the attempt
 * that was approved. Only exercises with both count — an exercise approved on
 * the first try contributes a gain of 0, which is the honest reading rather
 * than an omission.
 */
export interface Velocity {
  firstMean: number;
  approvedMean: number;
  gain: number;
  attemptsToApproval: number;
  /** Points gained per extra attempt. Null when nobody needed a second one. */
  perAttempt: number | null;
  sample: number;
}

export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  exercises: ExerciseStat[];
  dimensionMeans: Record<RubricKey, number>;
  strongest: RubricKey | null;
  weakest: RubricKey | null;
  totalAttempts: number;
  approvedCount: number;
  averageScore: number;
  /** Best score per exercise in unlock order — the trend line. */
  trend: { order: number; title: string; score: number }[];
  velocity: Velocity | null;
  medianTimeToApproval: number | null;
  /** Timestamp of the most recent attempt, or null when there are none. */
  lastActivityAt: number | null;
}

export function studentAnalytics(
  studentId: string,
  studentName: string,
  submissions: Submission[],
  exercises: Exercise[],
): StudentAnalytics {
  const mine = submissions.filter((s) => s.studentId === studentId);

  const stats: ExerciseStat[] = exercises.map((exercise) => {
    const attempts = mine
      .filter((s) => s.exerciseId === exercise.id)
      .sort((a, b) => a.attempt - b.attempt || a.createdAt - b.createdAt);

    const scored = attempts.map(scoreOf).filter((n): n is number => n !== undefined);
    const approvedAttempt = attempts.find((s) => s.status === 'approved');
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];

    return {
      exerciseId: exercise.id,
      title: exercise.title,
      order: exercise.order,
      attempts: attempts.length,
      revisions: Math.max(0, attempts.length - 1),
      firstScore: first ? scoreOf(first) : undefined,
      bestScore: scored.length ? Math.max(...scored) : undefined,
      approvedScore: approvedAttempt ? scoreOf(approvedAttempt) : undefined,
      approved: Boolean(approvedAttempt),
      timeToApproval:
        first && approvedAttempt?.review
          ? Math.max(0, approvedAttempt.review.reviewedAt - first.createdAt)
          : undefined,
      elapsed: first && latest ? Math.max(0, latest.updatedAt - first.createdAt) : undefined,
    };
  });

  // Dimension means come from the scores actually standing — a teacher's
  // override replaces Claude's on that dimension.
  const graded = mine.filter((s) => s.evaluation);
  const dimensionMeans = RUBRIC_KEYS.reduce<Record<RubricKey, number>>((acc, key) => {
    const values = graded.map((s) => s.review?.overrides?.[key] ?? s.evaluation!.scores[key] ?? 0);
    acc[key] = round(mean(values));
    return acc;
  }, {} as Record<RubricKey, number>);

  const ranked = [...RUBRIC_KEYS].sort((a, b) => dimensionMeans[b] - dimensionMeans[a]);
  const allScores = mine.map(scoreOf).filter((n): n is number => n !== undefined);

  const withBoth = stats.filter(
    (s) => s.approved && s.firstScore !== undefined && s.approvedScore !== undefined,
  );
  const extraAttempts = withBoth.reduce((sum, s) => sum + s.revisions, 0);
  const totalGain = withBoth.reduce((sum, s) => sum + (s.approvedScore! - s.firstScore!), 0);

  const velocity: Velocity | null = withBoth.length
    ? {
        firstMean: round(mean(withBoth.map((s) => s.firstScore!))),
        approvedMean: round(mean(withBoth.map((s) => s.approvedScore!))),
        gain: round(mean(withBoth.map((s) => s.approvedScore! - s.firstScore!))),
        attemptsToApproval: round(mean(withBoth.map((s) => s.attempts))),
        perAttempt: extraAttempts > 0 ? round(totalGain / extraAttempts) : null,
        sample: withBoth.length,
      }
    : null;

  return {
    studentId,
    studentName,
    exercises: stats,
    dimensionMeans,
    strongest: graded.length ? ranked[0] : null,
    weakest: graded.length ? ranked[ranked.length - 1] : null,
    totalAttempts: mine.length,
    approvedCount: stats.filter((s) => s.approved).length,
    averageScore: round(mean(allScores)),
    trend: stats
      .filter((s) => s.bestScore !== undefined)
      .map((s) => ({ order: s.order, title: s.title, score: s.bestScore! })),
    velocity,
    medianTimeToApproval: median(
      stats.map((s) => s.timeToApproval).filter((n): n is number => n !== undefined),
    ),
    lastActivityAt: mine.length ? Math.max(...mine.map((s) => s.updatedAt)) : null,
  };
}

// ---------------------------------------------------------------------------
// Across the class
// ---------------------------------------------------------------------------

export interface ExerciseAggregate {
  exerciseId: string;
  title: string;
  order: number;
  /** Students who have attempted it at all. */
  attempted: number;
  approved: number;
  /** Approved / attempted, 0–1. Undefined denominator reads as 0. */
  passRate: number;
  /** Share of students approved on their first attempt, 0–1. */
  firstTimeRate: number;
  meanScore: number;
  /** Mean (teacher final − Claude total) where a teacher overrode. */
  divergence: number;
  divergenceSample: number;
  medianTimeToApproval: number | null;
  revisionRate: number;
}

export interface ClassAnalytics {
  exercises: ExerciseAggregate[];
  /** Exercises with the lowest pass rate first, attempted ones only. */
  hardest: ExerciseAggregate[];
  medianTimeToApproval: number | null;
  meanDivergence: number;
  divergenceSample: number;
  velocity: Velocity | null;
  students: number;
}

export function classAnalytics(
  submissions: Submission[],
  exercises: Exercise[],
  studentIds: string[],
): ClassAnalytics {
  const aggregates: ExerciseAggregate[] = exercises.map((exercise) => {
    const forExercise = submissions.filter((s) => s.exerciseId === exercise.id);
    const byStudent = new Map<string, Submission[]>();
    for (const s of forExercise) {
      const list = byStudent.get(s.studentId) ?? [];
      list.push(s);
      byStudent.set(s.studentId, list);
    }

    let approved = 0;
    let firstTime = 0;
    let revised = 0;
    const times: number[] = [];

    for (const attempts of byStudent.values()) {
      const ordered = [...attempts].sort((a, b) => a.attempt - b.attempt);
      const approvedAttempt = ordered.find((s) => s.status === 'approved');
      if (!approvedAttempt) continue;
      approved += 1;
      if (approvedAttempt.attempt === 1) firstTime += 1;
      else revised += 1;
      if (approvedAttempt.review) {
        times.push(Math.max(0, approvedAttempt.review.reviewedAt - ordered[0].createdAt));
      }
    }

    const scores = forExercise.map(scoreOf).filter((n): n is number => n !== undefined);

    // Divergence counts only reviews that actually moved a dimension. A teacher
    // who accepted Claude's score contributes agreement, not a zero-magnitude
    // disagreement, and averaging those in would wash the signal out.
    const moved = forExercise.filter(
      (s) => s.evaluation && s.review && Object.keys(s.review.overrides ?? {}).length > 0,
    );
    const deltas = moved.map((s) => s.review!.finalScore - s.evaluation!.weightedTotal);

    const attempted = byStudent.size;

    return {
      exerciseId: exercise.id,
      title: exercise.title,
      order: exercise.order,
      attempted,
      approved,
      passRate: attempted ? approved / attempted : 0,
      firstTimeRate: approved ? firstTime / approved : 0,
      meanScore: round(mean(scores)),
      divergence: round(mean(deltas)),
      divergenceSample: deltas.length,
      medianTimeToApproval: median(times),
      revisionRate: approved ? revised / approved : 0,
    };
  });

  const attemptedOnly = aggregates.filter((a) => a.attempted > 0);
  const allTimes = attemptedOnly
    .map((a) => a.medianTimeToApproval)
    .filter((n): n is number => n !== null);

  const allDeltas = submissions
    .filter((s) => s.evaluation && s.review && Object.keys(s.review.overrides ?? {}).length > 0)
    .map((s) => s.review!.finalScore - s.evaluation!.weightedTotal);

  // Class velocity is the mean of each student's own velocity rather than a
  // pooled figure, so a prolific student cannot dominate the number.
  const perStudent = studentIds
    .map((id) => studentAnalytics(id, '', submissions, exercises).velocity)
    .filter((v): v is Velocity => v !== null);

  const velocity: Velocity | null = perStudent.length
    ? {
        firstMean: round(mean(perStudent.map((v) => v.firstMean))),
        approvedMean: round(mean(perStudent.map((v) => v.approvedMean))),
        gain: round(mean(perStudent.map((v) => v.gain))),
        attemptsToApproval: round(mean(perStudent.map((v) => v.attemptsToApproval))),
        perAttempt: (() => {
          const rates = perStudent
            .map((v) => v.perAttempt)
            .filter((n): n is number => n !== null);
          return rates.length ? round(mean(rates)) : null;
        })(),
        sample: perStudent.length,
      }
    : null;

  return {
    exercises: aggregates,
    hardest: [...attemptedOnly].sort((a, b) => a.passRate - b.passRate),
    medianTimeToApproval: median(allTimes),
    meanDivergence: round(mean(allDeltas)),
    divergenceSample: allDeltas.length,
    velocity,
    students: studentIds.length,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Durations for humans: "3 days", "5 hours", "12 min". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 60_000) return 'under a minute';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3_600_000;
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? '' : 's'}`;
  const days = Math.round(ms / DAY);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export const formatPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`;
