"use server";

import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth";
import { DEFAULT_SCORING_DIMENSIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createExerciseSchema } from "@/lib/validations/exercise";

export type CreateExerciseState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
};

/**
 * Creates an exercise in the caller's active tenant. The tenant comes from
 * the session, never the form, so nobody can write into another workspace.
 */
export async function createExercise(_prev: CreateExerciseState, formData: FormData): Promise<CreateExerciseState> {
  const session = await requireStaffSession("/exercises/new");
  if (!session.ok) return { error: "You don't have permission to create exercises." };

  const raw = Object.fromEntries(
    [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const parsed = createExerciseSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, values: raw };
  }

  await prisma.exercise.create({
    data: {
      ...parsed.data,
      tenantId: session.tenant.id,
      createdById: session.user.id,
      scoringDimensions: [...DEFAULT_SCORING_DIMENSIONS],
    },
  });

  redirect("/exercises");
}
