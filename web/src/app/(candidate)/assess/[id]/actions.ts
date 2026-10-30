"use server";

import { revalidatePath } from "next/cache";
import { requireCandidateAssessment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function startAssessment(assessmentId: string) {
  const { assessment } = await requireCandidateAssessment(assessmentId);
  if (assessment.status !== "INVITED") return;

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  revalidatePath(`/assess/${assessment.id}`);
}
