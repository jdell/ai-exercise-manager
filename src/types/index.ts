/** Shared domain types for the AI Skills Exercise Manager. */

export type Role = 'student' | 'teacher' | 'evaluator';

/** The signed-in identity, persisted to localStorage. */
export interface Session {
  role: Role;
  /** Stable id. For students this is also their key under /students. */
  id: string;
  name: string;
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

export interface Exercise {
  id: string;
  /** 1-based position in the locked progression. */
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
  /** What "good" looks like — also fed to the evaluator. */
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
}

export type SubmissionStatus =
  | 'evaluating'
  | 'awaiting_review'
  | 'approved'
  | 'needs_revision'
  | 'error';

export interface Submission {
  id: string;
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

export interface Student {
  id: string;
  name: string;
  createdAt: number;
  lastSeenAt: number;
}

/** Denormalised per-student, per-exercise state for fast dashboards. */
export interface ProgressEntry {
  status: Exclude<ExerciseState, 'locked' | 'available'>;
  bestScore: number;
  attempts: number;
  updatedAt: number;
}
