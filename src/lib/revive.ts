import type { Evaluation, Exercise, Submission } from '../types';

/**
 * Putting back what Realtime Database threw away.
 *
 * RTDB does not store empty containers. A key written as `[]` or `{}` is
 * deleted rather than stored, so a record that goes in as
 * `integrity: { flags: [], concern: 0 }` comes back as
 * `integrity: { concern: 0 }` — the key is simply gone.
 *
 * Every array restored below is non-optional in `types/index.ts`, so the whole
 * app is entitled to read `.length` off it. The first clean submission a class
 * produced is what proved otherwise: no flags meant no `flags`, and
 * `peakSeverity()` threw on it while rendering the teacher's review queue,
 * taking the page down with it.
 *
 * This is the mirror of `stripUndefined()` in `store.ts`. That one drops keys
 * the database will not accept on the way out; this one restores keys the
 * database dropped on the way in, once, at the read boundary — so that nothing
 * downstream has to know the storage layer has opinions about empty arrays.
 */

function reviveEvaluation(evaluation: Evaluation): Evaluation {
  const revived: Evaluation = {
    ...evaluation,
    strengths: evaluation.strengths ?? [],
    improvements: evaluation.improvements ?? [],
  };
  if (evaluation.integrity) {
    revived.integrity = { ...evaluation.integrity, flags: evaluation.integrity.flags ?? [] };
  }
  return revived;
}

export function reviveSubmission(submission: Submission): Submission {
  if (!submission.evaluation) return submission;
  return { ...submission, evaluation: reviveEvaluation(submission.evaluation) };
}

/**
 * Custom exercises only — the built-ins never make the round trip. A teacher
 * who authors an exercise with no tips is the exercise-side version of the
 * same bug.
 */
export function reviveExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    tips: exercise.tips ?? [],
    successCriteria: exercise.successCriteria ?? [],
  };
}
