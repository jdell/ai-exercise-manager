import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess, PageHeader, PageSkeleton } from "@/components/ui";
import { requireStaffSession } from "@/lib/auth";
import { ExerciseForm } from "./exercise-form";

export const metadata: Metadata = { title: "New exercise" };

export default function NewExercisePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewExercise />
    </Suspense>
  );
}

async function NewExercise() {
  const session = await requireStaffSession("/exercises/new");
  if (!session.ok) return <NoAccess reason={session.reason} />;

  return (
    <>
      <PageHeader
        title="New exercise"
        description="Starting files and scoring dimensions can be edited once the exercise exists."
        action={
          <Link href="/exercises" className="btn-outline">
            Cancel
          </Link>
        }
      />
      <ExerciseForm />
    </>
  );
}
