import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { useOnline } from '../hooks/useData';
import { useOutbox } from '../hooks/useOutbox';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { usingEmulators } from '../lib/firebase';
import { ClassPicker, LanguagePicker, Spinner, ThemeToggle } from './ui';
import type { MessageKey } from '../lib/i18n';
import type { Role } from '../types';

const ROLE_ACCENT: Record<Role, string> = {
  student: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-emerald-100 text-emerald-700',
};

const NAV: Record<Role, { to: string; label: MessageKey }[]> = {
  student: [
    { to: '/', label: 'nav.exercises' },
    { to: '/progress', label: 'nav.progress' },
    { to: '/history', label: 'nav.history' },
    { to: '/playground', label: 'nav.playground' },
  ],
  teacher: [
    { to: '/teacher', label: 'nav.reviewQueue' },
    { to: '/teacher/class', label: 'nav.classProgress' },
    { to: '/teacher/analytics', label: 'nav.analytics' },
    { to: '/teacher/exercises', label: 'nav.manageExercises' },
    { to: '/teacher/classes', label: 'nav.classes' },
    { to: '/playground', label: 'nav.playground' },
    { to: '/evaluator', label: 'nav.evaluator' },
  ],
};

export default function Layout() {
  const { session, signOut } = useSession();
  const { t } = useLocale();
  const navigate = useNavigate();

  // Hooks before the redirect below: React requires the same hook order on
  // every render, and this component returns early when signed out.
  const online = useOnline();
  const { pending, syncing, error: syncError } = useOutbox();
  const { updateReady, applyUpdate } = useAppUpdate();

  // Layout wraps every authenticated route, so the signed-out redirect has to
  // happen here — a child route's own <Navigate> would never render.
  if (!session) return <Navigate to="/signin" replace />;

  const links = NAV[session.role];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => navigate(session.role === 'teacher' ? '/teacher' : '/')}
            className="flex items-center gap-2.5 text-left"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-sm text-white"
            >
              🧠
            </span>
            <span className="hidden text-sm leading-tight font-semibold text-ink-900 sm:block">
              {t('app.name')}
              <span className="block text-[11px] font-normal text-ink-500">
                {t('app.subtitle')}
              </span>
            </span>
          </button>

          <nav className="scroll-slim flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to === '/teacher'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-ink-100 text-ink-900'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  }`
                }
              >
                {t(link.label)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {usingEmulators && (
              <span
                title={t('layout.emulatorsTitle')}
                className="hidden rounded-full border border-ink-300 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600 lg:block"
              >
                {t('layout.emulators')}
              </span>
            )}

            {session.role === 'teacher' && <ClassPicker />}

            <LanguagePicker />
            <ThemeToggle />

            {/*
              The role is a claim on the server, not a UI toggle — it comes from
              /users/$uid, which only the createProfile function can write.
            */}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_ACCENT[session.role]}`}
            >
              {t(`role.${session.role}`)}
            </span>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `rounded-lg p-2 transition-colors ${isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}`
              }
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>

            <div className="hidden items-center gap-2 border-l border-ink-200 pl-3 sm:flex">
              <span className="max-w-[10rem] truncate text-sm text-ink-700">{session.name}</span>
              <button onClick={() => void signOut()} className="btn-ghost px-2 py-1 text-xs">
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/*
        The status strip: connection, queued work, and a parked update. It sits
        under the header rather than inside a page because all three outlive
        navigation — a student who queues an attempt and wanders to their
        history should still be able to see that it has not gone anywhere.
      */}
      <div className="no-print" role="status" aria-live="polite">
        {!online && (
          <Strip tone="warning">
            <span className="font-medium">{t('connection.offline')}</span>
            <span className="hidden sm:inline">{t('connection.offlineBody')}</span>
          </Strip>
        )}

        {pending.length > 0 && (
          <Strip tone="info">
            {syncing && <Spinner className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {syncing
                ? t('connection.syncing')
                : t(`connection.queued.${pending.length === 1 ? 'one' : 'other'}` as MessageKey, {
                    n: pending.length,
                  })}
            </span>
          </Strip>
        )}

        {syncError && (
          <Strip tone="warning">{t('connection.syncFailed', { error: syncError })}</Strip>
        )}

        {updateReady && (
          <Strip tone="info">
            <span>{t('update.ready')}</span>
            <button onClick={applyUpdate} className="font-semibold underline underline-offset-2">
              {t('update.reload')}
            </button>
          </Strip>
        )}
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 py-5">
        <p className="mx-auto max-w-7xl px-4 text-xs text-ink-400 sm:px-6">{t('layout.footer')}</p>
      </footer>
    </div>
  );
}

/** One line of the status strip. Full-bleed, so it reads as chrome, not content. */
function Strip({
  tone,
  children,
}: {
  tone: 'info' | 'warning';
  children: React.ReactNode;
}) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const;

  return (
    <div className={`border-b ${tones[tone]}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs sm:px-6">
        {children}
      </div>
    </div>
  );
}
