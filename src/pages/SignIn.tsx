import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { Alert, RubricLegend, Spinner } from '../components/ui';
import { EXERCISES } from '../data/exercises';
import type { Role } from '../types';

const ROLE_COPY: Record<Role, { title: string; blurb: string }> = {
  student: {
    title: 'Student',
    blurb: 'Work through the five exercises, get scored by Claude, and unlock the next one.',
  },
  teacher: {
    title: 'Teacher',
    blurb: "Review Claude's scores, override them where you disagree, and approve progression.",
  },
  evaluator: {
    title: 'Claude Evaluator',
    blurb: 'Inspect the rubric and the grading prompt, and re-run evaluations.',
  },
};

export default function SignIn() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(role, name, passcode);
      navigate(role === 'student' ? '/' : `/${role}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Left: pitch */}
      <div className="flex flex-col justify-center bg-ink-900 px-6 py-12 text-white sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center gap-3">
            <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl">
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
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Pick your role to get started.</p>

          <fieldset className="mt-6">
            <legend className="label">Role</legend>
            <div className="space-y-2">
              {(Object.keys(ROLE_COPY) as Role[]).map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    role === r
                      ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
                      : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink-900">
                      {ROLE_COPY[r].title}
                    </span>
                    <span className="block text-xs leading-relaxed text-ink-500">
                      {ROLE_COPY[r].blurb}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="name" className="label">
              {role === 'student' ? 'Your name' : 'Display name'}
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'student' ? 'Jordan Mills' : 'Ms. Alvarez'}
              autoComplete="name"
              required
            />
            {role === 'student' && (
              <p className="hint mt-1.5">
                Use the same name each time so your history follows you.
              </p>
            )}
          </div>

          {role !== 'student' && (
            <div className="mt-4">
              <label htmlFor="passcode" className="label">
                Teacher passcode
              </label>
              <input
                id="passcode"
                type="password"
                className="input"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <p className="hint mt-1.5">Set with VITE_TEACHER_PASSCODE.</p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}

          <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
            {busy && <Spinner />}
            Continue as {ROLE_COPY[role].title}
          </button>
        </form>
      </div>
    </div>
  );
}
