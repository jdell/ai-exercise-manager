import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { describeAuthError, isCancelledPopup } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import AuthShell from '../components/AuthShell';
import { AuthDivider, GoogleButton } from '../components/GoogleButton';
import { Alert, Spinner } from '../components/ui';
import type { Role } from '../types';

const ROLES: Role[] = ['student', 'teacher'];

export default function SignUp() {
  const { signUp, signInWithGoogle } = useSession();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const home = () => (role === 'teacher' ? '/teacher' : '/');
  // The server rejects a teacher without the code, which would mean creating a
  // Google credential only to delete it again. Cheaper to ask first.
  const needsCode = role === 'teacher' && !teacherCode.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signUp({ email, password, displayName: name, role, teacherCode });
      navigate(home(), { replace: true });
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Google has no separate sign-up: the popup either finds an existing account
   * or makes one. The role and code chosen above are used only if this account
   * has no profile yet — an existing one keeps the role it already has.
   */
  async function handleGoogle() {
    setError('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle({ role, teacherCode });
      navigate(home(), { replace: true });
    } catch (err) {
      if (!isCancelledPopup(err)) setError(describeAuthError(err));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-ink-900">{t('auth.signUpTitle')}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {t('auth.alreadyHaveOne')}{' '}
          <Link to="/signin" className="font-medium text-indigo-600 hover:underline">
            {t('auth.signInLink')}
          </Link>
          .
        </p>

        {!isFirebaseConfigured && (
          <div className="mt-5">
            <Alert tone="warning">{t('auth.notConfiguredSignUp')}</Alert>
          </div>
        )}

        <fieldset className="mt-6">
          <legend className="label">{t('auth.iAmA')}</legend>
          <div className="space-y-2">
            {ROLES.map((r) => (
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
                  <span className="block text-sm font-medium text-ink-900">{t(`role.${r}`)}</span>
                  <span className="block text-xs leading-relaxed text-ink-500">
                    {t(r === 'student' ? 'auth.roleStudentBlurb' : 'auth.roleTeacherBlurb')}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Above the provider choice, because both paths are gated on it. */}
        {role === 'teacher' && (
          <div className="mt-4">
            <label htmlFor="teacherCode" className="label">
              {t('auth.teacherCodeLabel')}
            </label>
            <input
              id="teacherCode"
              type="password"
              className="input"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              required
            />
            <p className="hint mt-1.5">{t('auth.teacherCodeHint')}</p>
          </div>
        )}

        <div className="mt-5">
          <GoogleButton
            onClick={handleGoogle}
            busy={googleBusy}
            disabled={busy || needsCode || !isFirebaseConfigured}
            label={t('auth.googleAsRole', { role: t(`role.${role}`).toLowerCase() })}
          />
          {needsCode && <p className="hint mt-1.5">{t('auth.needsCode')}</p>}
        </div>

        <AuthDivider>{t('auth.orSignUpEmail')}</AuthDivider>

        <div>
          <label htmlFor="name" className="label">
            {t('auth.nameLabel')}
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              role === 'student'
                ? t('auth.namePlaceholderStudent')
                : t('auth.namePlaceholderTeacher')
            }
            autoComplete="name"
            required
          />
          <p className="hint mt-1.5">{t('auth.nameHint')}</p>
        </div>

        <div className="mt-4">
          <label htmlFor="email" className="label">
            {t('auth.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            required
          />
        </div>

        <div className="mt-4">
          <label htmlFor="password" className="label">
            {t('auth.passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary mt-6 w-full"
          disabled={busy || googleBusy || !isFirebaseConfigured}
        >
          {busy && <Spinner />}
          {t('auth.createRoleAccount', { role: t(`role.${role}`).toLowerCase() })}
        </button>
      </form>
    </AuthShell>
  );
}
