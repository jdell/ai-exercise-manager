import Link from "next/link";
import { ArrowRight, History, ListChecks, ScanSearch } from "lucide-react";
import { APP_NAME, EXERCISE_TYPE_LABELS } from "@/lib/constants";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Realistic exercises",
    body: "Migrations, debugging sessions, code reviews and system prompts — the work engineers actually do with AI, graded from junior to lead.",
  },
  {
    icon: History,
    title: "The whole conversation",
    body: "Every prompt and every response is recorded, so you assess how a candidate reasons with the model, not just the final answer.",
  },
  {
    icon: ScanSearch,
    title: "Rubric-based scoring",
    body: "Each submission is scored against your rubric, then reviewed by a teacher who can override any dimension before a report is issued.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        <Link href="/login" className="text-sm font-medium hover:underline">
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <p className="text-sm font-medium text-indigo-600">For engineering teams and training programmes</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find out how well your engineers really work with AI.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          {APP_NAME} sets candidates realistic engineering tasks, records every prompt they write and
          scores their judgement against a rubric your team controls.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-6 text-indigo-600" aria-hidden />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold">Nine exercise types</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {Object.values(EXERCISE_TYPE_LABELS).map((label) => (
            <li
              key={label}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
            >
              {label}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        {APP_NAME}
      </footer>
    </main>
  );
}
