import type { Achievement, AchievementId, Exercise, RubricKey, Submission } from '../types';
import { PATHS } from '../data/paths';
import { RUBRIC_KEYS } from '../data/rubric';

/**
 * Badges, derived from /submissions on read.
 *
 * Same rule as progress and analytics (CLAUDE.md #7): there is no achievements
 * node and there will not be one. A stored badge can outlive the work that
 * earned it — a teacher who withdraws an approval would leave one behind — and
 * a badge that disagrees with the transcript is worse than no badge.
 *
 * Nothing here is copy. Each badge is an id plus the variables its sentence
 * needs; the words live in the i18n dictionary under `achievement.<id>.*`, so a
 * badge reads in the student's language.
 *
 * What is deliberately absent: anything measuring speed, streaks, or volume.
 * The rubric rewards revision, and a badge for finishing fast would quietly
 * argue with it. Every badge below is earned by work a teacher approved or by
 * a score a teacher could have overridden.
 */

/** A single dimension at or above this is worth marking. */
const FULL_MARKS = 95;
/** Understanding specifically — the dimension students find hardest to move. */
const UNDERSTANDING_BAR = 90;
/** Every dimension at or above this on one attempt. */
const FOUR_ACROSS_BAR = 80;
/** Points gained between two attempts at the same exercise. */
const COMEBACK_GAIN = 15;
/** Attempts at one exercise. */
const PERSISTENCE_ATTEMPTS = 3;

/** The teacher's score for a dimension where they set one, else Claude's. */
function dimensionScore(submission: Submission, key: RubricKey): number | undefined {
  const override = submission.review?.overrides?.[key];
  if (typeof override === 'number') return override;
  return submission.evaluation?.scores[key];
}

/** The score of the attempt as a whole — teacher's if reviewed, else Claude's. */
function totalScore(submission: Submission): number | undefined {
  return submission.review?.finalScore ?? submission.evaluation?.weightedTotal;
}

/** When a submission reached its final state, for dating a badge. */
function settledAt(submission: Submission): number {
  return submission.review?.reviewedAt ?? submission.evaluation?.evaluatedAt ?? submission.updatedAt;
}

function badge(
  id: AchievementId,
  hit: Submission | undefined,
  extra: Partial<Achievement> = {},
): Achievement {
  return {
    id,
    earned: Boolean(hit),
    earnedAt: hit ? settledAt(hit) : undefined,
    ...extra,
  };
}

export function achievementsFor(
  studentId: string,
  submissions: Submission[],
  exercises: Exercise[],
): Achievement[] {
  const mine = submissions
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => a.attempt - b.attempt || a.createdAt - b.createdAt);

  const byExercise = new Map<string, Submission[]>();
  for (const submission of mine) {
    const list = byExercise.get(submission.exerciseId) ?? [];
    list.push(submission);
    byExercise.set(submission.exerciseId, list);
  }

  const approved = mine.filter((s) => s.status === 'approved');
  const approvedIds = new Set(approved.map((s) => s.exerciseId));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  // Earliest first, so a badge is dated by the attempt that first earned it
  // rather than the most recent one that also qualifies.
  const oldest = (list: Submission[]): Submission | undefined =>
    list.slice().sort((a, b) => settledAt(a) - settledAt(b))[0];

  // --- Individual scores -----------------------------------------------
  const bestDimension = Math.max(
    0,
    ...mine.flatMap((s) => RUBRIC_KEYS.map((key) => dimensionScore(s, key) ?? 0)),
  );
  const bestUnderstanding = Math.max(0, ...mine.map((s) => dimensionScore(s, 'understanding') ?? 0));

  const fullMarksHit = oldest(
    mine.filter((s) => RUBRIC_KEYS.some((key) => (dimensionScore(s, key) ?? 0) >= FULL_MARKS)),
  );
  const understandingHit = oldest(
    mine.filter((s) => (dimensionScore(s, 'understanding') ?? 0) >= UNDERSTANDING_BAR),
  );
  const fourAcrossHit = oldest(
    mine.filter((s) =>
      s.evaluation
        ? RUBRIC_KEYS.every((key) => (dimensionScore(s, key) ?? 0) >= FOUR_ACROSS_BAR)
        : false,
    ),
  );

  // --- Movement between attempts ---------------------------------------
  let bestGain = 0;
  let comebackHit: Submission | undefined;
  for (const attempts of byExercise.values()) {
    for (let i = 1; i < attempts.length; i++) {
      const before = totalScore(attempts[i - 1]);
      const after = totalScore(attempts[i]);
      if (before === undefined || after === undefined) continue;
      const gain = after - before;
      if (gain > bestGain) bestGain = gain;
      if (gain >= COMEBACK_GAIN && !comebackHit) comebackHit = attempts[i];
    }
  }

  const mostAttempts = Math.max(0, ...[...byExercise.values()].map((list) => list.length));
  const persistenceHit = [...byExercise.values()]
    .filter((list) => list.length >= PERSISTENCE_ATTEMPTS)
    .map((list) => list[PERSISTENCE_ATTEMPTS - 1])
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  // --- Completion -------------------------------------------------------
  const fieldHit = oldest(
    approved.filter((s) => exerciseById.get(s.exerciseId)?.pathId === 'domain'),
  );

  // Paths a teacher has not populated are skipped: "0 of 0 approved" is not a
  // badge, it is a bug that looks like one.
  const pathBadges: Achievement[] = [];
  for (const path of PATHS) {
    const inPath = exercises.filter((e) => e.pathId === path.id);
    if (!inPath.length) continue;
    const done = inPath.filter((e) => approvedIds.has(e.id));
    const complete = done.length === inPath.length;
    const last = complete
      ? approved
          .filter((s) => inPath.some((e) => e.id === s.exerciseId))
          .sort((a, b) => settledAt(b) - settledAt(a))[0]
      : undefined;
    pathBadges.push({
      ...badge('path_complete', last, { pathId: path.id }),
      progress: complete ? undefined : done.length / inPath.length,
    });
  }

  const trackComplete = exercises.length > 0 && approvedIds.size === exercises.length;
  const trackHit = trackComplete
    ? approved.slice().sort((a, b) => settledAt(b) - settledAt(a))[0]
    : undefined;

  return [
    badge('first_approval', oldest(approved)),
    badge('first_time_right', oldest(approved.filter((s) => s.attempt === 1))),
    badge('turned_it_around', comebackHit, {
      vars: { points: COMEBACK_GAIN },
      progress: comebackHit ? undefined : clamp(bestGain / COMEBACK_GAIN),
    }),
    badge('full_marks_dimension', fullMarksHit, {
      vars: { score: FULL_MARKS },
      progress: fullMarksHit ? undefined : clamp(bestDimension / FULL_MARKS),
    }),
    badge('shows_the_working', understandingHit, {
      vars: { score: UNDERSTANDING_BAR },
      progress: understandingHit ? undefined : clamp(bestUnderstanding / UNDERSTANDING_BAR),
    }),
    badge('four_across', fourAcrossHit, { vars: { score: FOUR_ACROSS_BAR } }),
    badge('kept_at_it', persistenceHit, {
      progress: persistenceHit ? undefined : clamp(mostAttempts / PERSISTENCE_ATTEMPTS),
    }),
    badge('into_the_field', fieldHit),
    ...pathBadges,
    {
      ...badge('track_complete', trackHit),
      progress: trackComplete
        ? undefined
        : clamp(exercises.length ? approvedIds.size / exercises.length : 0),
    },
  ];
}

/** Earned badges first, most recent first within them. */
export function sortAchievements(achievements: Achievement[]): Achievement[] {
  return achievements
    .slice()
    .sort(
      (a, b) =>
        Number(b.earned) - Number(a.earned) ||
        (b.earnedAt ?? 0) - (a.earnedAt ?? 0) ||
        (b.progress ?? 0) - (a.progress ?? 0),
    );
}

export const earnedCount = (achievements: Achievement[]): number =>
  achievements.filter((a) => a.earned).length;

/**
 * The emoji on the badge. Kept out of the dictionary because it does not
 * translate, and out of the component because the list belongs with the
 * definitions.
 */
export const ACHIEVEMENT_ICON: Record<AchievementId, string> = {
  first_approval: '🎯',
  first_time_right: '✨',
  turned_it_around: '📈',
  full_marks_dimension: '💯',
  shows_the_working: '🔍',
  four_across: '🧩',
  kept_at_it: '🔁',
  into_the_field: '🌍',
  path_complete: '🏁',
  track_complete: '🏆',
};

const clamp = (fraction: number): number => Math.min(1, Math.max(0, fraction));
