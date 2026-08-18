import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { usingEmulators } from '../lib/firebase';
import type { Role } from '../types';

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
};

const ROLE_ACCENT: Record<Role, string> = {
  student: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-emerald-100 text-emerald-700',
};

const NAV: Record<Role, { to: string; label: string }[]> = {
  student: [
    { to: '/', label: 'My exercises' },
    { to: '/progress', label: 'Progress' },
    { to: '/history', label: 'History' },
  ],
  teacher: [
    { to: '/teacher', label: 'Review queue' },
    { to: '/teacher/class', label: 'Class progress' },
    { to: '/teacher/analytics', label: 'Analytics' },
    { to: '/teacher/exercises', label: 'Exercises' },
    { to: '/evaluator', label: 'Evaluator console' },
  ],
};

export default function Layout() {
  const { session, signOut } = useSession();
  const navigate = useNavigate();

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
              AI Skills
              <span className="block text-[11px] font-normal text-ink-500">Exercise Manager</span>
            </span>
          </button>

          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to === '/teacher'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ink-100 text-ink-900'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {usingEmulators && (
              <span
                title="Talking to the local Firebase emulator suite, not your real project."
                className="hidden rounded-full border border-ink-300 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600 lg:block"
              >
                Emulators
              </span>
            )}

            {/*
              The role is a claim on the server, not a UI toggle — it comes from
              /users/$uid, which only the createProfile function can write.
            */}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_ACCENT[session.role]}`}
            >
              {ROLE_LABEL[session.role]}
            </span>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `rounded-lg p-2 transition-colors ${isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}`
              }
              aria-label="Settings"
              title="Settings"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>

            <div className="hidden items-center gap-2 border-l border-ink-200 pl-3 sm:flex">
              <span className="max-w-[10rem] truncate text-sm text-ink-700">{session.name}</span>
              <button onClick={() => void signOut()} className="btn-ghost px-2 py-1 text-xs">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 py-5">
        <p className="mx-auto max-w-7xl px-4 text-xs text-ink-400 sm:px-6">
          Scored by Claude against a fixed rubric · Every score is reviewed by a teacher before it counts
        </p>
      </footer>
    </div>
  );
}
