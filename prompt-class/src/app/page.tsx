import Link from "next/link";
import { ClipboardCheck, FlaskConical, MessageSquareText } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FEATURES = [
  {
    icon: FlaskConical,
    title: "Realistic exercises",
    body: "Migrations, debugging, code review, system prompts and more — at junior, mid-level, senior and lead difficulty, with the starting files and the tools allowed.",
  },
  {
    icon: MessageSquareText,
    title: "Every prompt on the record",
    body: "See how a candidate framed the problem, what they asked the model and what they checked before accepting it — not just the code they handed in.",
  },
  {
    icon: ClipboardCheck,
    title: "Scored against your rubric",
    body: "Weighted scoring dimensions per exercise, marked by your team, rolled up into one report you release when you're ready.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        <Link href="/login" className="btn-outline">
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 pt-20 pb-16 text-center md:pt-28">
          <p className="label">Assessment for AI-enabled engineers</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Hire for how they work with AI.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted text-pretty">{APP_TAGLINE}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login" className="btn-primary">
              Get started
            </Link>
            <a href="#how-it-works" className="btn-outline">
              How it works
            </a>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-6xl gap-5 px-5 pb-24 md:grid-cols-3 md:px-8">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-line bg-card p-6">
              <Icon className="size-5 text-accent" aria-hidden />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        © 2026 Yakasista Ltd · {APP_NAME}
      </footer>
    </div>
  );
}
