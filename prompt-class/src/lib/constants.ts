import type {
  AssessmentStatus,
  Difficulty,
  ExerciseType,
  Plan,
  Role,
} from "@/generated/prisma/enums";

export const APP_NAME = "Prompt Class";
export const APP_TAGLINE = "Assess how engineers work with AI, not just what they ship.";

/**
 * Every route that needs a session. `src/proxy.ts` redirects signed-out
 * visitors away from these — a new signed-in page that isn't listed here is
 * still protected by its own session check, but skips the redirect.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/exercises",
  "/assessments",
  "/candidates",
  "/assess",
] as const;

/** Where a signed-in visitor lands, and where /login sends them. */
export const HOME_ROUTE = "/dashboard";

/** Cookie holding the active tenant's id, for people in more than one. */
export const TENANT_COOKIE = "pc-tenant";

/** Roles that author exercises and run assessments. */
export const STAFF_ROLES: readonly Role[] = ["ADMIN", "TEACHER"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  CANDIDATE: "Candidate",
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  PRO: "Pro",
  PREMIUM: "Premium",
};

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  MIGRATION: "Migration",
  DEBUGGING: "Debugging",
  ARCHITECTURE: "Architecture",
  CODE_REVIEW: "Code review",
  SYSTEM_PROMPT: "System prompt",
  LIVE_CODING: "Live coding",
  GREENFIELD: "Greenfield",
  DATA_ANALYSIS: "Data analysis",
  DEVOPS: "DevOps",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  JUNIOR: "Junior",
  MID: "Mid-level",
  SENIOR: "Senior",
  LEAD: "Lead",
};

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  INVITED: "Invited",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  SCORED: "Scored",
};

/**
 * The dimensions a new exercise starts with. Teachers can reweight them;
 * weights are normalised when a composite score is computed, so they needn't
 * sum to 1 here.
 */
export const DEFAULT_SCORING_DIMENSIONS = [
  { key: "problem_framing", label: "Problem framing", weight: 0.25 },
  { key: "prompt_quality", label: "Prompt quality", weight: 0.25 },
  { key: "verification", label: "Verification of AI output", weight: 0.3 },
  { key: "outcome", label: "Working outcome", weight: 0.2 },
] as const;

export const TIME_LIMIT_MINUTES = { min: 5, max: 240 } as const;
