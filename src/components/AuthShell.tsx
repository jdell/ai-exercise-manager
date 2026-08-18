import type { ReactNode } from 'react';
import { LanguagePicker, RubricLegend } from './ui';
import { EXERCISES, localizeExercise } from '../data/exercises';
import { useLocale } from '../context/LocaleContext';

/** How many of the exercises to list before the pitch turns into a table of contents. */
const LISTED = 6;

/** The two-column frame shared by the sign-in and sign-up screens. */
export default function AuthShell({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  // The built-ins only. Custom exercises live behind the sign-in this page is
  // the front of, and reading them would need a credential nobody has yet.
  const listed = EXERCISES.slice(0, LISTED).map((e) => localizeExercise(e, locale));
  const remaining = EXERCISES.length - listed.length;

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
              <h1 className="text-lg font-semibold">{t('app.fullName')}</h1>
              <p className="text-sm text-white/60">{t('app.tagline')}</p>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-white/80">{t('auth.pitch')}</p>

          <ol className="mt-8 space-y-2.5">
            {listed.map((ex) => (
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
            {remaining > 0 && (
              <li className="flex items-baseline gap-3 text-sm text-white/45">
                <span className="w-6 shrink-0" aria-hidden="true" />
                {t('auth.andMore', { n: remaining })}
              </li>
            )}
          </ol>

          <div className="mt-9 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-white/50 uppercase">
              {t('auth.howScored')}
            </h2>
            <div className="[&_dt]:text-white/90 [&_dd]:text-white/55">
              <RubricLegend />
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="absolute top-4 right-4">
          <LanguagePicker />
        </div>
        {children}
      </div>
    </div>
  );
}
