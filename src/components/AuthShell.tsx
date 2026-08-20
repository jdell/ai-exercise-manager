import type { ReactNode } from 'react';
import { LanguagePicker, RubricLegend, ThemeToggle } from './ui';
import { EXERCISES, localizeExercise } from '../data/exercises';
import { useLocale } from '../context/LocaleContext';

/** How many of the exercises to list before the pitch turns into a table of contents. */
const LISTED = 6;

/**
 * The two-column frame shared by the sign-in and sign-up screens.
 *
 * The pitch panel uses `slab`/`onslab` rather than `ink-900`/`white` because it
 * is the one surface that must NOT invert: the neutral ramp flips in dark mode,
 * which would turn this into a near-white slab across half the screen of
 * someone who chose dark. It is dark in both themes, on purpose.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  // The built-ins only. Custom exercises live behind the sign-in this page is
  // the front of, and reading them would need a credential nobody has yet.
  const listed = EXERCISES.slice(0, LISTED).map((e) => localizeExercise(e, locale));
  const remaining = EXERCISES.length - listed.length;

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Left: pitch */}
      <div className="flex flex-col justify-center bg-slab px-6 py-12 text-onslab sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 place-items-center rounded-xl bg-onslab/10 text-xl"
            >
              🧠
            </span>
            <div>
              <h1 className="text-lg font-semibold">{t('app.fullName')}</h1>
              <p className="text-sm text-onslab/60">{t('app.tagline')}</p>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-onslab/80">{t('auth.pitch')}</p>

          <ol className="mt-8 space-y-2.5">
            {listed.map((ex) => (
              <li key={ex.id} className="flex items-baseline gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-onslab/10 text-xs font-medium text-onslab/70">
                  {ex.order}
                </span>
                <span className="text-onslab/90">
                  {ex.title}
                  <span className="ml-2 text-onslab/45">{ex.tagline}</span>
                </span>
              </li>
            ))}
            {remaining > 0 && (
              <li className="flex items-baseline gap-3 text-sm text-onslab/45">
                <span className="w-6 shrink-0" aria-hidden="true" />
                {t('auth.andMore', { n: remaining })}
              </li>
            )}
          </ol>

          <div className="mt-9 rounded-xl border border-onslab/10 bg-onslab/5 p-5">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-onslab/50 uppercase">
              {t('auth.howScored')}
            </h2>
            <div className="[&_dt]:text-onslab/90 [&_dd]:text-onslab/55">
              <RubricLegend />
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <LanguagePicker />
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
