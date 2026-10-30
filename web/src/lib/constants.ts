import type {
  AssessmentStatus,
  Difficulty,
  ExerciseType,
  MembershipRole,
} from "@/generated/prisma/enums";

export const APP_NAME = "Prompt Class";

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

export const ROLE_LABELS: Record<MembershipRole, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  CANDIDATE: "Candidate",
};

/** Roles allowed into the (app) staff area. Candidates only see /assess. */
export const STAFF_ROLES: readonly MembershipRole[] = ["ADMIN", "TEACHER"];

/**
 * Every route prefix that requires a signed-in user. A new protected page that
 * is not listed here is publicly reachable — update this when adding routes.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/exercises",
  "/assessments",
  "/candidates",
  "/assess",
] as const;
