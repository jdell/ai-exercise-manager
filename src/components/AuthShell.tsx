import type { ReactNode } from 'react';
import { RubricLegend } from './ui';
import { EXERCISES } from '../data/exercises';

/** The two-column frame shared by the sign-in and sign-up screens. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Left: pitch */}
      <div className="flex flex-col justify-center bg-ink-900 px-6 py-12 text-white sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl"
            >
              🧠
            </span>
            <div>
              <h1 className="text-lg font-semibold">AI Skills Exercise Manager</h1>
              <p className="text-sm text-white/60">Prompt engineering, practised and assessed</p>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-white/80">
            Five exercises that build on each other. You write a prompt, run it, explain your
            reasoning, and submit. Claude scores the work against a fixed rubric within seconds —
            then a teacher reviews that score, adjusts it if they disagree, and decides whether you
            move on.
          </p>

          <ol className="mt-8 space-y-2.5">
            {EXERCISES.map((ex) => (
              <li key={ex.id} className="flex items-baseline gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-xs font-medium text-white/70">
                  {ex.order}
                </span>
                <span className="text-white/90">
                  {ex.title}
                  <span className="ml-2 text-white/45">{ex.tagline}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-9 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-white/50 uppercase">
              How work is scored
            </h2>
            <div className="[&_dt]:text-white/90 [&_dd]:text-white/55">
              <RubricLegend />
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">{children}</div>
    </div>
  );
}
