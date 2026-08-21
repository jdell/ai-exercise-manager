import { RUBRIC } from '../data/rubric';
import type { MessageKey, Vars } from './i18n';
import type { Submission } from '../types';

/**
 * Claude's feedback as plain text, for the clipboard.
 *
 * A student who wants to keep their feedback — paste it into a notebook, mail
 * it to themselves, work through it in a doc — currently drags a selection
 * across four panels and gets the surrounding chrome with it. This is the same
 * information, rendered for somewhere that is not this page.
 *
 * It takes a translator rather than reading the active locale, because it is
 * called from a component and the module-level locale exists for the two
 * formatters that genuinely cannot take one (`relativeTime`, `formatDuration`).
 * Adding a third caller to that escape hatch is how it stops being one.
 *
 * The teacher's overrides are shown next to Claude's numbers rather than
 * replacing them: what a student learns from is the pair, and a copied score
 * that silently reported one of the two would misdescribe the review.
 */
export function feedbackToText(
  submission: Submission,
  options: {
    exerciseTitle: string;
    t: (key: MessageKey, vars?: Vars) => string;
  },
): string {
  const { exerciseTitle, t } = options;
  const { evaluation, review } = submission;
  const lines: string[] = [];

  lines.push(`${exerciseTitle} — ${t('common.attemptN', { n: submission.attempt })}`);
  lines.push(new Date(submission.createdAt).toLocaleString());
  lines.push('');

  if (!evaluation) {
    lines.push(t('detail.neverScored'));
    return lines.join('\n');
  }

  const total = review?.finalScore ?? evaluation.weightedTotal;
  lines.push(
    `${t('common.score')}: ${Math.round(total)} — ${
      review ? t('common.teacherReviewed') : t('common.pendingReview')
    }`,
  );
  lines.push('');

  for (const dim of RUBRIC) {
    const claude = evaluation.scores?.[dim.key] ?? 0;
    const override = review?.overrides?.[dim.key];
    const score = override !== undefined ? `${override} (Claude: ${claude})` : `${claude}`;
    lines.push(`${t(`rubric.${dim.key}.label`)}: ${score}`);
    const why = evaluation.rationale?.[dim.key];
    if (why) lines.push(`  ${why}`);
  }

  if (evaluation.summary) {
    lines.push('', evaluation.summary);
  }

  const section = (title: string, items: string[] | undefined) => {
    if (!items?.length) return;
    lines.push('', `${title}:`);
    for (const item of items) lines.push(`- ${item}`);
  };

  section(t('common.strengths'), evaluation.strengths);
  section(t('common.nextTime'), evaluation.improvements);

  if (review?.comment) {
    lines.push('', `${t('common.teacherComment')}:`, review.comment);
  }

  return lines.join('\n');
}
