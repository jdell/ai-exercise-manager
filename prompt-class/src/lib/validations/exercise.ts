import { z } from "zod";
import { TIME_LIMIT_MINUTES } from "@/lib/constants";

const EXERCISE_TYPES = [
  "MIGRATION",
  "DEBUGGING",
  "ARCHITECTURE",
  "CODE_REVIEW",
  "SYSTEM_PROMPT",
  "LIVE_CODING",
  "GREENFIELD",
  "DATA_ANALYSIS",
  "DEVOPS",
] as const;

const DIFFICULTIES = ["JUNIOR", "MID", "SENIOR", "LEAD"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .transform((v) => (v.length > 0 ? v : null));

/** The new-exercise form, as FormData values. */
export const createExerciseSchema = z.object({
  title: z.string().trim().min(3, { error: "Give the exercise a title." }).max(120, { error: "Keep the title under 120 characters." }),
  description: z.string().trim().min(10, { error: "Describe the task the candidate will do." }).max(10_000),
  type: z.enum(EXERCISE_TYPES, { error: "Choose an exercise type." }),
  difficulty: z.enum(DIFFICULTIES, { error: "Choose a difficulty." }),
  timeMinutes: z.coerce
    .number({ error: "Enter a time limit in minutes." })
    .int({ error: "Use whole minutes." })
    .min(TIME_LIMIT_MINUTES.min, { error: `At least ${TIME_LIMIT_MINUTES.min} minutes.` })
    .max(TIME_LIMIT_MINUTES.max, { error: `At most ${TIME_LIMIT_MINUTES.max} minutes.` }),
  targetStack: optionalText(200),
  /** Comma-separated in the form; stored as a list. */
  allowedTools: z
    .string()
    .transform((v) => [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))]),
  rubricNotes: optionalText(5_000),
  isTemplate: z.literal("on").optional().transform(Boolean),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
