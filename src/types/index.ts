/** Shared domain types for the AI Skills Exercise Manager. */

export type Role = 'student' | 'teacher';

/**
 * A user's profile record at /users/$uid.
 *
 * `role` is written only by the createProfile Cloud Function; database rules
 * reject any client write to that field. Everything that grants teacher access
 * — routes, rules, the evaluator console — reads it from here.
 */
export interface UserProfile {
  /** Firebase Auth uid. Also the key under /users and the submission's studentId. */
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: number;
  lastSeenAt: number;
}

/** The signed-in identity, derived from Firebase Auth plus the profile. */
export interface Session {
  role: Role;
  /** The Firebase Auth uid. */
  id: string;
  name: string;
  email: string;
}

/** One of the four rubric dimensions. */
export type RubricKey = 'promptQuality' | 'understanding' | 'execution' | 'growth';

export interface RubricDimension {
  key: RubricKey;
  label: string;
  /** Fraction of the final score, e.g. 0.4 for 40%. */
  weight: number;
  /** Shown to students on the exercise page. */
  description: string;
  /** Injected into the evaluator's system prompt. */
  criteria: string;
}

/** Learning paths group the exercise board into tracks. */
export type PathId = 'fundamentals' | 'advanced' | 'domain';

export interface LearningPath {
  id: PathId;
  title: string;
  blurb: string;
  /** Tailwind classes for the path chip. */
  accent: string;
}

export type Difficulty = 'intro' | 'core' | 'advanced';

export interface Exercise {
  id: string;
  /**
   * 1-based position in the locked progression. The chain runs across every
   * exercise in `order` — paths group the board, they do not fork the lock.
   */
  order: number;
  title: string;
  tagline: string;
  /** Minutes, shown as a hint on the card. */
  estimatedMinutes: number;
  /** What the student is learning and why it matters. */
  brief: string;
  /** The concrete thing to produce. */
  task: string;
  /** Bullet hints shown in the workspace. */
  tips: string[];
  /**
   * The requirements list: what "good" looks like, checked one by one by the
   * evaluator. The exercise builder writes its requirements here — there is no
   * second parallel list.
   */
  successCriteria: string[];
  /** Pre-filled scaffold in the prompt editor. */
  starterPrompt: string;
  /**
   * Optional material the student's prompt is meant to operate on. Appended to
   * the prompt as a user turn when test-running, so the same input is used for
   * every attempt at this exercise.
   */
  testInput?: string;
  /** Extra instruction handed to the evaluator for this specific exercise. */
  evaluatorNotes: string;
  /** Which learning path this exercise belongs to. */
  pathId: PathId;
  difficulty: Difficulty;
  /** Short subject label, e.g. "Specificity" or "Schema design". */
  topic: string;
  /**
   * Advisory length budget for the prompt, driving the editor's character
   * counter. Not enforced, and the evaluator is not told about it.
   */
  maxPromptChars?: number;
  /** A prompt that satisfies the exercise. Shown to the student and the evaluator. */
  goodExample?: string;
  /** A prompt that misses, and why that is instructive. */
  badExample?: string;
  /**
   * Per-exercise rubric weights as fractions, overriding RUBRIC's defaults.
   * A partial override leaves the untouched dimensions at their defaults; the
   * whole set is normalised to sum to 1 by effectiveWeights().
   */
  rubricWeights?: Partial<Record<RubricKey, number>>;
  /** Built-in exercises ship in code; custom ones are authored by teachers. */
  source: 'builtin' | 'custom';
  createdAt?: number;
  updatedAt?: number;
  /** Teacher name, for custom exercises. */
  createdBy?: string;
}

/** Claude Evaluator's machine-checked output. Mirrors EVALUATION_SCHEMA. */
export interface Evaluation {
  scores: Record<RubricKey, number>;
  /** 0–100, weighted per RUBRIC. Computed client-side, not trusted from the model. */
  weightedTotal: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Per-dimension one-line justification, keyed by RubricKey. */
  rationale: Record<RubricKey, string>;
  /** True when the work clears the bar without teacher intervention. */
  meetsBar: boolean;
  model: string;
  evaluatedAt: number;
  /**
   * The rubric weights this score was computed with. Recorded so an attempt
   * graded before a teacher edited the exercise's weights still explains its
   * own total instead of silently disagreeing with a live recomputation.
   */
  weights?: Record<RubricKey, number>;
  /** A faster model's independent read, when the second pass is enabled. */
  secondOpinion?: SecondOpinion;
  /** Anti-gaming signals. Advisory — see IntegrityReport. */
  integrity?: IntegrityReport;
}

/**
 * A second, cheaper model's independent read on the same submission.
 *
 * The point is disagreement, not accuracy: where a fast model and a deep one
 * diverge on a dimension, the teacher is looking at a genuinely ambiguous
 * submission and should read it themselves.
 */
export interface SecondOpinion {
  model: string;
  scores: Record<RubricKey, number>;
  /** 0–100, computed here with the same weights as the primary evaluation. */
  weightedTotal: number;
  meetsBar: boolean;
  /** One line on where this read differs from the obvious one. */
  note: string;
  evaluatedAt: number;
  /** Set when the second pass failed. The primary grade still stands. */
  error?: string;
}

/** What a gaming check found. Codes are explained in `src/lib/integrity.ts`. */
export type IntegrityCode =
  | 'copied_example'
  | 'copied_task'
  | 'template_language'
  | 'rubric_stuffing'
  | 'exact_word_count'
  | 'thin_reflection'
  | 'reflection_echoes_prompt'
  | 'evaluator_addressed';

export type IntegritySeverity = 'info' | 'warn' | 'high';

export interface IntegrityFlag {
  code: IntegrityCode;
  severity: IntegritySeverity;
  /** What was detected, phrased so a teacher can act on it. */
  detail: string;
  /** The text that triggered it, trimmed for display. */
  evidence?: string;
}

/**
 * Anti-gaming signals for one submission.
 *
 * This is never a verdict — a flagged submission may be perfectly honest, and
 * `concern` exists only to sort the review queue. Nothing here changes a score
 * or blocks an approval; a teacher decides.
 */
export interface IntegrityReport {
  flags: IntegrityFlag[];
  /** 0–100 attention score. Sort order for teachers, not a grade. */
  concern: number;
  /** The evaluator's own read, independent of the deterministic checks. */
  modelSuspects?: boolean;
  modelNote?: string;
  checkedAt: number;
}

export interface TeacherReview {
  /** Teacher's per-dimension scores. Absent keys fall back to Claude's. */
  overrides: Partial<Record<RubricKey, number>>;
  /** 0–100 after overrides are applied. */
  finalScore: number;
  comment: string;
  reviewedAt: number;
  reviewedBy: string;
  decision: 'approved' | 'revision';
  /**
   * Scores the teacher set *before* Claude's were revealed. Present only when
   * they used blind mode. Calibration is measured from these and nothing else:
   * an override entered while looking at Claude's number is an adjustment, not
   * an independent judgement, and averaging the two would flatter the metric.
   */
  blindScores?: Partial<Record<RubricKey, number>>;
  blindAt?: number;
}

export type SubmissionStatus =
  | 'evaluating'
  | 'awaiting_review'
  | 'approved'
  | 'needs_revision'
  | 'error';

export interface Submission {
  id: string;
  /** The author's Firebase Auth uid. */
  studentId: string;
  studentName: string;
  exerciseId: string;
  exerciseOrder: number;
  /** 1-based attempt number for this student + exercise. */
  attempt: number;
  prompt: string;
  reflection: string;
  /** What Claude actually produced when the student's prompt was run. */
  output: string;
  status: SubmissionStatus;
  createdAt: number;
  updatedAt: number;
  evaluation?: Evaluation;
  review?: TeacherReview;
  /** Populated when status is 'error'. */
  error?: string;
}

export type ExerciseState = 'locked' | 'available' | 'in_review' | 'revision' | 'approved';

/** Per-path completion for one student. Derived, never stored. */
export interface PathProgress {
  path: LearningPath;
  exercises: Exercise[];
  approved: number;
  total: number;
  /** Mean best score across the exercises in this path that have been scored. */
  average: number;
}

/** Denormalised per-student, per-exercise state for fast dashboards. */
export interface ProgressEntry {
  status: Exclude<ExerciseState, 'locked' | 'available'>;
  bestScore: number;
  attempts: number;
  updatedAt: number;
}
