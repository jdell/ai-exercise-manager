import type { ReactNode } from 'react';
import type { ExerciseState, RubricKey, SubmissionStatus } from '../types';
import { RUBRIC, RUBRIC_BY_KEY, PASSING_SCORE } from '../data/rubric';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const STATE_STYLES: Record<ExerciseState, { label: string; className: string }> = {
  locked: { label: 'Locked', className: 'bg-ink-100 text-ink-500 border-ink-200' },
  available: { label: 'Available', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_review: { label: 'In review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  revision: { label: 'Needs revision', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export function StateBadge({ state }: { state: ExerciseState }) {
  const { label, className } = STATE_STYLES[state];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

const STATUS_STYLES: Record<SubmissionStatus, { label: string; className: string }> = {
  evaluating: { label: 'Evaluating', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  awaiting_review: { label: 'Awaiting review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  needs_revision: { label: 'Revision requested', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  error: { label: 'Failed', className: 'bg-ink-100 text-ink-600 border-ink-300' },
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
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
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-700">
          {label}
          <span className="ml-1.5 text-xs font-normal text-ink-400">{Math.round(weight * 100)}%</span>
          {overridden && (
            <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 uppercase">
              Teacher
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
}: {
  scores: Record<RubricKey, number>;
  overrides?: Partial<Record<RubricKey, number>>;
  rationale?: Record<RubricKey, string>;
}) {
  return (
    <div className="space-y-4">
      {RUBRIC.map((dim) => {
        const override = overrides?.[dim.key];
        const value = override ?? scores[dim.key] ?? 0;
        return (
          <div key={dim.key}>
            <ScoreBar
              label={dim.label}
              weight={dim.weight}
              score={value}
              overridden={override !== undefined}
            />
            {override !== undefined && override !== scores[dim.key] && (
              <p className="mt-1 text-xs text-ink-500">
                Claude scored {scores[dim.key]}; your teacher adjusted this to {override}.
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

export function RubricLegend() {
  return (
    <dl className="space-y-3">
      {RUBRIC.map((dim) => (
        <div key={dim.key}>
          <dt className="text-sm font-medium text-ink-800">
            {dim.label}
            <span className="ml-1.5 text-xs font-normal text-ink-400">
              {Math.round(dim.weight * 100)}%
            </span>
          </dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-ink-600">{dim.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function scoreLabel(key: RubricKey): string {
  return RUBRIC_BY_KEY[key].label;
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

export function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
