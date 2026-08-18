import type { RubricKey, Submission } from '../types';
import { RUBRIC_KEYS, effectiveWeights, weightedTotal } from '../data/rubric';

/**
 * Rubric calibration: how far a teacher's independent scores sit from Claude's.
 *
 * Only reviews carrying `blindScores` count. A teacher who nudged a dimension
 * while looking at Claude's number has told us how much they disagreed *after
 * anchoring*, which is a different and much smaller quantity — mixing the two
 * would make the class look better calibrated than it is. The Evaluator Console
 * reports the blind-scored share alongside the delta so a thin sample is
 * visible rather than implied.
 *
 * Everything here is derived from /submissions on read. There is no calibration
 * node, for the same reason there is no /progress node.
 */

export interface CalibrationPoint {
  submissionId: string;
  studentName: string;
  exerciseId: string;
  reviewedAt: number;
  reviewedBy: string;
  claudeTotal: number;
  /** The teacher's own total, from their blind scores. */
  teacherTotal: number;
  /** teacher − Claude. Positive means the teacher scored higher. */
  delta: number;
  /** Per-dimension teacher − Claude. */
  perDimension: Record<RubricKey, number>;
}

export interface CalibrationSummary {
  points: CalibrationPoint[];
  /** Reviews scored blind. */
  count: number;
  /** Reviews with any decision at all — the denominator for adoption. */
  reviewed: number;
  /** Mean signed delta. Positive = the teacher is more generous than Claude. */
  meanDelta: number;
  /** Mean absolute delta — the honest "how far apart are we" number. */
  meanAbsDelta: number;
  /** Share of blind reviews within 5 points, 0–1. */
  withinFive: number;
  /** Mean signed delta per dimension: where the disagreement actually lives. */
  perDimension: Record<RubricKey, number>;
  /**
   * Mean absolute delta over the oldest and newest halves. `closing` is true
   * when the newer half is tighter — a teacher and the rubric converging.
   * Null until there are enough points for the split to mean anything.
   */
  trend: { early: number; late: number; closing: boolean } | null;
}

const EMPTY_DIMENSIONS = (): Record<RubricKey, number> =>
  Object.fromEntries(RUBRIC_KEYS.map((k) => [k, 0])) as Record<RubricKey, number>;

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const round = (n: number): number => Math.round(n * 10) / 10;

/**
 * Builds the calibration record from every blind-scored review, oldest first.
 * `reviewedBy` filters to one teacher; omit it for the whole faculty.
 */
export function calibration(
  submissions: Submission[],
  options: { reviewedBy?: string } = {},
): CalibrationSummary {
  const reviewed = submissions.filter((s) => s.review).length;

  const points: CalibrationPoint[] = submissions
    .filter((s) => {
      if (!s.review?.blindScores || !s.evaluation) return false;
      if (options.reviewedBy && s.review.reviewedBy !== options.reviewedBy) return false;
      // A blind pass that touched no dimension carries no signal.
      return Object.keys(s.review.blindScores).length > 0;
    })
    .map((s) => {
      const evaluation = s.evaluation!;
      const review = s.review!;
      const blind = review.blindScores!;
      // Score the teacher's read with the weights the attempt was graded under,
      // so a later reweighting cannot retroactively invent a disagreement.
      const weights = evaluation.weights ?? effectiveWeights();

      const teacherScores = RUBRIC_KEYS.reduce<Record<RubricKey, number>>((acc, key) => {
        acc[key] = blind[key] ?? evaluation.scores[key] ?? 0;
        return acc;
      }, {} as Record<RubricKey, number>);

      const perDimension = RUBRIC_KEYS.reduce<Record<RubricKey, number>>((acc, key) => {
        acc[key] = teacherScores[key] - (evaluation.scores[key] ?? 0);
        return acc;
      }, {} as Record<RubricKey, number>);

      const teacherTotal = weightedTotal(teacherScores, weights);

      return {
        submissionId: s.id,
        studentName: s.studentName,
        exerciseId: s.exerciseId,
        reviewedAt: review.blindAt ?? review.reviewedAt,
        reviewedBy: review.reviewedBy,
        claudeTotal: evaluation.weightedTotal,
        teacherTotal,
        delta: round(teacherTotal - evaluation.weightedTotal),
        perDimension,
      };
    })
    .sort((a, b) => a.reviewedAt - b.reviewedAt);

  const deltas = points.map((p) => p.delta);
  const absolute = deltas.map(Math.abs);

  const perDimension = RUBRIC_KEYS.reduce<Record<RubricKey, number>>((acc, key) => {
    acc[key] = round(mean(points.map((p) => p.perDimension[key])));
    return acc;
  }, EMPTY_DIMENSIONS());

  // Four points per half is the floor at which a split reads as a trend rather
  // than as one strong opinion on either side.
  let trend: CalibrationSummary['trend'] = null;
  if (points.length >= 8) {
    const half = Math.floor(points.length / 2);
    const early = round(mean(absolute.slice(0, half)));
    const late = round(mean(absolute.slice(points.length - half)));
    trend = { early, late, closing: late < early };
  }

  return {
    points,
    count: points.length,
    reviewed,
    meanDelta: round(mean(deltas)),
    meanAbsDelta: round(mean(absolute)),
    withinFive: points.length ? absolute.filter((d) => d <= 5).length / points.length : 0,
    perDimension,
    trend,
  };
}

/** Per-dimension disagreement between the two models, for the teacher UI. */
export function modelDisagreement(
  primary: Record<RubricKey, number>,
  second: Record<RubricKey, number>,
): { key: RubricKey; delta: number }[] {
  return RUBRIC_KEYS.map((key) => ({
    key,
    delta: (second[key] ?? 0) - (primary[key] ?? 0),
  }));
}

/** Dimensions where the models are far enough apart to be worth a human look. */
export const DISAGREEMENT_THRESHOLD = 15;
