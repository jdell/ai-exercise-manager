import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ExerciseForm } from "./exercise-form";

export const metadata: Metadata = { title: "New exercise" };

export default function NewExercisePage() {
  return (
    <>
      <PageHeader title="New exercise" description="Define a task for candidates to complete with AI." />
      <ExerciseForm />
    </>
  );
}
