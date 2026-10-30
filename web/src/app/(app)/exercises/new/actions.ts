"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Difficulty, ExerciseType } from "@/generated/prisma/enums";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const exerciseSchema = z.object({
  title: z.string().trim().min(3, "The title needs at least 3 characters.").max(120),
  brief: z.string().trim().min(20, "The brief needs at least 20 characters."),
  type: z.enum(ExerciseType),
  difficulty: z.enum(Difficulty),
  starterContent: z.string().trim().optional(),
  timeLimitMinutes: z.coerce.number().int().min(5).max(480).optional(),
  isPublished: z.boolean(),
});

export type CreateExerciseState = { error?: string };

export async function createExercise(
  _prev: CreateExerciseState,
  formData: FormData
): Promise<CreateExerciseState> {
  const { user, tenant } = await requireStaff();

  const parsed = exerciseSchema.safeParse({
    title: formData.get("title"),
    brief: formData.get("brief"),
    type: formData.get("type"),
    difficulty: formData.get("difficulty"),
    starterContent: formData.get("starterContent") || undefined,
    timeLimitMinutes: formData.get("timeLimitMinutes") || undefined,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.exercise.create({
    data: { ...parsed.data, tenantId: tenant.id, createdById: user.id },
  });

  redirect("/exercises");
}
