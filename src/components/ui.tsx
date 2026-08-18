import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { LOCALES, activeLocale, tActive } from '../lib/i18n';
import { ACHIEVEMENT_ICON, sortAchievements } from '../lib/achievements';
import type {
  Achievement,
  Difficulty,
  Locale,
  ExerciseState,
  IntegrityReport,
  IntegritySeverity,
  PathId,
  RubricKey,
  SecondOpinion,
  Submission,
  SubmissionStatus,
} from '../types';
import { RUBRIC, RUBRIC_BY_KEY, PASSING_SCORE, DEFAULT_WEIGHTS } from '../data/rubric';
import { DIFFICULTY_STYLE, PATH_BY_ID } from '../data/paths';
import { INTEGRITY_LABELS, peakSeverity } from '../lib/integrity';
import { DISAGREEMENT_THRESHOLD, modelDisagreement } from '../lib/calibration';
import type { PartialEvaluation } from '../lib/partial-json';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/** Colour only — the words come from the dictionary, keyed by the same value. */
const STATE_STYLES: Record<ExerciseState, string> = {
  locked: 'bg-ink-100 text-ink-500 border-ink-200',
  available: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
  revision: 'bg-rose-50 text-rose-700 border-rose-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function StateBadge({ state }: { state: ExerciseState }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATE_STYLES[state]}`}
    >
      {t(`state.${state}`)}
    </span>
  );
}

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  evaluating: 'bg-sky-50 text-sky-700 border-sky-200',
  awaiting_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  needs_revision: 'bg-rose-50 text-rose-700 border-rose-200',
  error: 'bg-ink-100 text-ink-600 border-ink-300',
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export function scoreTone(score: number): string {
  if (score >= 90) return 'text-emerald-600';
  if (score >= PASSING_SCORE) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

function scoreBarTone(score: number): string {
  if (score >= PASSING_SCORE) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const stroke = score >= PASSING_SCORE ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-semibold tabular-nums ${scoreTone(score)}`}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

export function ScoreBar({
  label,
  weight,
  score,
  overridden,
}: {
  label: string;
  weight: number;
  score: number;
  overridden?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-700">
          {label}
          <span className="ml-1.5 text-xs font-normal text-ink-400">{Math.round(weight * 100)}%</span>
          {overridden && (
            <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 uppercase">
              {t('common.teacherBadge')}
            </span>
          )}
        </span>
        <span className={`text-sm font-semibold tabular-nums ${scoreTone(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBarTone(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

export function RubricBreakdown({
  scores,
  overrides,
  rationale,
  weights = DEFAULT_WEIGHTS,
}: {
  scores: Record<RubricKey, number>;
  overrides?: Partial<Record<RubricKey, number>>;
  rationale?: Record<RubricKey, string>;
  /** Per-exercise weights; defaults to the rubric's own. */
  weights?: Record<RubricKey, number>;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      {RUBRIC.map((dim) => {
        const override = overrides?.[dim.key];
        const value = override ?? scores[dim.key] ?? 0;
        return (
          <div key={dim.key}>
            <ScoreBar
              label={t(`rubric.${dim.key}.label`)}
              weight={weights[dim.key] ?? dim.weight}
              score={value}
              overridden={override !== undefined}
            />
            {override !== undefined && override !== scores[dim.key] && (
              <p className="mt-1 text-xs text-ink-500">
                {t('common.teacherAdjusted', {
                  claude: scores[dim.key] ?? 0,
                  teacher: override,
                })}
              </p>
            )}
            {rationale?.[dim.key] && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{rationale[dim.key]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RubricLegend({
  weights = DEFAULT_WEIGHTS,
}: {
  weights?: Record<RubricKey, number>;
}) {
  const { t } = useLocale();
  return (
    <dl className="space-y-3">
      {RUBRIC.map((dim) => (
        <div key={dim.key}>
          <dt className="text-sm font-medium text-ink-800">
            {t(`rubric.${dim.key}.label`)}
            <span className="ml-1.5 text-xs font-normal text-ink-400">
              {Math.round((weights[dim.key] ?? dim.weight) * 100)}%
            </span>
          </dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-ink-600">
            {t(`rubric.${dim.key}.description`)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function scoreLabel(key: RubricKey): string {
  return RUBRIC_BY_KEY[key].label;
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

/**
 * The language switch.
 *
 * A `<select>` rather than a pair of flags: a flag names a country, and neither
 * of these languages belongs to one. It appears in the header *and* on the
 * sign-in screen, because a student who cannot read the app cannot sign in to
 * reach the setting that would fix that.
 */
export function LanguagePicker({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className={`flex items-center ${className}`}>
      <span className="sr-only">{t('layout.language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-ink-300 bg-white px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        title={t('layout.language')}
      >
        {LOCALES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {children && <div className="mt-1.5 text-sm text-ink-500">{children}</div>}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info' | 'success' | 'warning';
  children: ReactNode;
}) {
  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const;
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${tones[tone]}`} role="status">
      {children}
    </div>
  );
}

/**
 * Reads the active locale rather than taking a translator, because it is called
 * from chart data and table cells built during render, where threading one
 * through every call site would be all cost and no clarity. See `lib/i18n.ts`.
 */
export function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return tActive('time.justNow');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return tActive('time.minutes', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tActive('time.hours', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return tActive('time.days', { n: days });
  return new Date(timestamp).toLocaleDateString(activeLocale());
}

// ---------------------------------------------------------------------------
// Exercise metadata chips
// ---------------------------------------------------------------------------

export function PathChip({ pathId, className = '' }: { pathId: PathId; className?: string }) {
  const { t } = useLocale();
  const path = PATH_BY_ID[pathId];
  if (!path) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${path.accent} ${className}`}
    >
      {t(`path.${pathId}.title`)}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[difficulty]}`}
    >
      {t(`difficulty.${difficulty}`)}
    </span>
  );
}

/**
 * Characters used against an exercise's length budget.
 *
 * The budget is advisory — going over does not block submission, because the
 * point is to make the student feel the constraint while writing, not to fail
 * them on a character they cannot see. Over-budget is stated plainly instead.
 */
export function CharCounter({ used, limit }: { used: number; limit?: number }) {
  const { t } = useLocale();
  if (!limit) return <p className="hint tabular-nums">{t('common.chars', { n: used })}</p>;

  const remaining = limit - used;
  const tone =
    remaining < 0 ? 'text-rose-600' : remaining <= limit * 0.1 ? 'text-amber-600' : 'text-ink-500';

  return (
    <p className={`text-xs tabular-nums ${tone}`}>
      {t('common.charsBudget', { used, limit })} ·{' '}
      {remaining >= 0
        ? t('common.charsLeft', { n: remaining })
        : t('common.charsOver', { n: Math.abs(remaining) })}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Revision history
// ---------------------------------------------------------------------------

/** Tolerates undefined so callers can ask for a neighbour that may not exist. */
function attemptScore(submission: Submission | undefined): number | undefined {
  return submission?.review?.finalScore ?? submission?.evaluation?.weightedTotal;
}

/**
 * Score progression across every attempt at one exercise.
 *
 * Attempts are never overwritten — each submission is its own record — so this
 * reads the whole history and shows where the student moved between revisions.
 */
export function RevisionTimeline({
  attempts,
  activeId,
  linkTo,
}: {
  /** Oldest first. */
  attempts: Submission[];
  activeId?: string;
  /** Builds a link target per attempt; omit to render inert nodes. */
  linkTo?: (submission: Submission) => string;
}) {
  const { t } = useLocale();
  if (attempts.length === 0) return null;

  const scored = attempts.filter((a) => attemptScore(a) !== undefined);
  const first = attemptScore(scored[0]);
  const last = attemptScore(scored[scored.length - 1]);
  const overall =
    scored.length > 1 && first !== undefined && last !== undefined
      ? Math.round((last - first) * 10) / 10
      : undefined;

  return (
    <div>
      <div className="scroll-slim flex items-stretch gap-2 overflow-x-auto pb-1">
        {attempts.map((attempt, i) => {
          const score = attemptScore(attempt);
          const previous = attemptScore(attempts[i - 1]);
          const delta =
            score !== undefined && previous !== undefined
              ? Math.round((score - previous) * 10) / 10
              : undefined;
          const active = attempt.id === activeId;

          const node = (
            <div
              className={`min-w-[8.5rem] flex-1 rounded-lg border px-3 py-2.5 transition-colors ${
                active
                  ? 'border-indigo-400 bg-indigo-50/70'
                  : 'border-ink-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-500">
                  {t('common.attemptN', { n: attempt.attempt })}
                </span>
                {delta !== undefined && delta !== 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                      delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                    title={t('workspace.deltaTitle')}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  score !== undefined ? scoreTone(score) : 'text-ink-300'
                }`}
              >
                {score !== undefined ? Math.round(score) : '—'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ink-400">
                {relativeTime(attempt.createdAt)}
              </p>
            </div>
          );

          return (
            <div key={attempt.id} className="flex flex-1 items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-2 shrink-0 bg-ink-300" />}
              {linkTo ? (
                <Link to={linkTo(attempt)} className="flex-1">
                  {node}
                </Link>
              ) : (
                <div className="flex-1">{node}</div>
              )}
            </div>
          );
        })}
      </div>

      {overall !== undefined && (
        <p className="mt-2 text-xs text-ink-500">
          {overall > 0
            ? t('workspace.upFromFirst', { n: overall })
            : overall < 0
              ? t('workspace.downFromFirst', { n: Math.abs(overall) })
              : t('workspace.sameAsFirst')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming evaluation
// ---------------------------------------------------------------------------

/** Three dots that read as "still writing". */
export function TypingIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Claude's evaluation as it arrives. Fields appear in the order the model
 * writes them, so scores land first and the feedback types itself out after.
 */
export function LiveEvaluation({
  partial,
  stage,
  weights = DEFAULT_WEIGHTS,
}: {
  partial: PartialEvaluation;
  stage: string;
  weights?: Record<RubricKey, number>;
}) {
  const { t } = useLocale();
  const anyScore = RUBRIC.some((dim) => partial.scores[dim.key] !== undefined);

  return (
    <div className="animate-in space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex items-center gap-2.5">
        <TypingIndicator />
        <span className="text-sm font-medium text-ink-800">{stage}</span>
      </div>

      {anyScore && (
        <div className="space-y-3">
          {RUBRIC.map((dim) => {
            const score = partial.scores[dim.key];
            if (score === undefined) {
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-ink-400">
                    {t(`rubric.${dim.key}.label`)}
                  </span>
                  <span className="h-1.5 flex-1 animate-pulse rounded-full bg-ink-200" />
                </div>
              );
            }
            return (
              <ScoreBar
                key={dim.key}
                label={t(`rubric.${dim.key}.label`)}
                weight={weights[dim.key] ?? dim.weight}
                score={score}
              />
            );
          })}
        </div>
      )}

      {partial.summary && (
        <p className="text-sm leading-relaxed text-ink-700">
          {partial.summary}
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-indigo-500 align-text-bottom"
          />
        </p>
      )}

      {(partial.strengths.length > 0 || partial.improvements.length > 0) && (
        <div className="grid gap-4 border-t border-indigo-200/70 pt-3 sm:grid-cols-2">
          <StreamedList
            title={t('common.strengths')}
            items={partial.strengths}
            tone="bg-emerald-500"
          />
          <StreamedList
            title={t('common.nextTime')}
            items={partial.improvements}
            tone="bg-amber-500"
          />
        </div>
      )}
    </div>
  );
}

function StreamedList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="animate-in flex gap-2.5 text-sm leading-relaxed text-ink-700">
            <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/**
 * One badge. Unearned badges are shown greyed rather than hidden, with their
 * progress where there is any: a locked badge a student can see the shape of is
 * a goal, and one they cannot is a surprise.
 */
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { t } = useLocale();
  const { id, pathId, vars, earned, earnedAt, progress } = achievement;

  // Path badges exist once per path, so their sentence needs the path's name —
  // and it has to be the translated one, not the constant in data/paths.ts.
  const copyVars = { ...vars, ...(pathId ? { path: t(`path.${pathId}.title`) } : {}) };

  return (
    <div
      className={`flex gap-3 rounded-lg border p-3.5 transition-colors ${
        earned ? 'border-indigo-200 bg-indigo-50/50' : 'border-ink-200 bg-white'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${
          earned ? 'bg-white' : 'bg-ink-100 opacity-40 grayscale'
        }`}
      >
        {ACHIEVEMENT_ICON[id]}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${earned ? 'text-ink-900' : 'text-ink-500'}`}>
          {t(`achievement.${id}.title`, copyVars)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
          {t(`achievement.${id}.description`, copyVars)}
        </p>
        {earned && earnedAt ? (
          <p className="mt-1.5 text-[11px] text-ink-400">
            {t('achievements.earnedWhen', { when: relativeTime(earnedAt) })}
          </p>
        ) : progress !== undefined && progress > 0 ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full rounded-full bg-ink-400 transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-ink-400">{t('achievements.locked')}</p>
        )}
      </div>
    </div>
  );
}

export function AchievementGrid({
  achievements,
  limit,
  columns = 2,
}: {
  achievements: Achievement[];
  /** Show only the first N after sorting. Omit for all of them. */
  limit?: number;
  /** 1 in a sidebar, 2 in a main column. */
  columns?: 1 | 2;
}) {
  const sorted = sortAchievements(achievements);
  const shown = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div className={`grid gap-3 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {shown.map((achievement) => (
        <AchievementCard
          key={`${achievement.id}:${achievement.pathId ?? ''}`}
          achievement={achievement}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment quality (Phase 4)
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<IntegritySeverity, { label: string; className: string }> = {
  info: { label: 'Note', className: 'bg-ink-100 text-ink-600 border-ink-300' },
  warn: { label: 'Check', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'Flag', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

/**
 * Compact marker for the review queue. Renders nothing when a submission is
 * clean, so the queue stays quiet unless there is something to look at.
 */
export function IntegrityBadge({ report }: { report?: IntegrityReport }) {
  const severity = peakSeverity(report);
  if (!severity || !report) return null;
  const { className } = SEVERITY_STYLES[severity];
  const count = report.flags.length;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
      title={report.flags.map((f) => INTEGRITY_LABELS[f.code]).join(' · ')}
    >
      {count} {count === 1 ? 'signal' : 'signals'}
    </span>
  );
}

/**
 * The full anti-gaming report. Leads with the disclaimer on purpose: these are
 * heuristics, and a teacher who reads them as accusations will use them badly.
 */
export function IntegrityPanel({ report }: { report?: IntegrityReport }) {
  if (!report || (!report.flags.length && !report.modelSuspects)) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-ink-600">
        Signals that this submission may satisfy the requirements without doing the underlying
        work. These are heuristics, not findings — they change no score and block nothing. Read
        the work and decide for yourself.
      </p>

      {report.modelSuspects && report.modelNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
          <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
            Claude's own read
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">{report.modelNote}</p>
        </div>
      )}

      <ul className="space-y-2">
        {report.flags.map((flag) => (
          <li
            key={`${flag.code}-${flag.detail}`}
            className="rounded-lg border border-ink-200 px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${SEVERITY_STYLES[flag.severity].className}`}
              >
                {SEVERITY_STYLES[flag.severity].label}
              </span>
              <span className="text-sm font-medium text-ink-800">
                {INTEGRITY_LABELS[flag.code]}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{flag.detail}</p>
            {flag.evidence && (
              <p className="mt-1.5 truncate font-mono text-xs text-ink-500">{flag.evidence}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Where the two models disagree. Dimensions inside the threshold are shown
 * greyed rather than hidden — "these two agreed" is information too, and
 * hiding them would make every panel look like a dispute.
 */
export function SecondOpinionPanel({
  primary,
  primaryTotal,
  second,
}: {
  primary: Record<RubricKey, number>;
  primaryTotal: number;
  second: SecondOpinion;
}) {
  if (second.error) {
    return (
      <p className="text-sm text-ink-500">
        The second reader did not complete: {second.error}. The grade above stands on its own.
      </p>
    );
  }

  const deltas = modelDisagreement(primary, second.scores);
  const contested = deltas.filter((d) => Math.abs(d.delta) >= DISAGREEMENT_THRESHOLD);
  const totalGap = Math.round((second.weightedTotal - primaryTotal) * 10) / 10;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-ink-600">
          Second total{' '}
          <span className={`font-semibold tabular-nums ${scoreTone(second.weightedTotal)}`}>
            {second.weightedTotal}
          </span>
          <span className="ml-1.5 text-xs text-ink-500">
            ({totalGap > 0 ? '+' : ''}
            {totalGap} vs the graded score)
          </span>
        </span>
        <span className="text-xs text-ink-400">{second.model}</span>
      </div>

      <div className="space-y-2.5">
        {deltas.map(({ key, delta }) => {
          const dim = RUBRIC_BY_KEY[key];
          const disputed = Math.abs(delta) >= DISAGREEMENT_THRESHOLD;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className={`text-sm ${disputed ? 'font-medium text-ink-800' : 'text-ink-500'}`}>
                {dim.label}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="text-sm text-ink-500">{primary[key] ?? 0}</span>
                <span aria-hidden="true" className="text-ink-300">
                  →
                </span>
                <span className="text-sm text-ink-700">{second.scores[key]}</span>
                <span
                  className={`w-12 text-right text-xs font-semibold ${
                    disputed ? (delta > 0 ? 'text-amber-600' : 'text-rose-600') : 'text-ink-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {second.note && (
        <p className="rounded-lg bg-ink-50 px-3.5 py-3 text-sm leading-relaxed text-ink-700">
          {second.note}
        </p>
      )}

      <p className="hint">
        {contested.length
          ? `The readers are more than ${DISAGREEMENT_THRESHOLD} points apart on ${contested
              .map((d) => RUBRIC_BY_KEY[d.key].label)
              .join(' and ')}. That usually means the submission is genuinely ambiguous there.`
          : 'Both readers landed within a few points on every dimension.'}
      </p>
    </div>
  );
}
