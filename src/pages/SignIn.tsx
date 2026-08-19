import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { describeAuthError, isCancelledPopup } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import AuthShell from '../components/AuthShell';
import { AuthDivider, GoogleButton } from '../components/GoogleButton';
import { Alert, Spinner } from '../components/ui';

export default function SignIn() {
  const { signIn, signInWithGoogle, authError } = useSession();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      // The provider resolves the role from the profile; Home routes on it.
      navigate('/', { replace: true });
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * A returning Google user keeps whatever role their profile already has —
   * `role` here only applies to an account signing in for the first time, and
   * this page cannot check a teacher code, so those start as students.
   */
  async function handleGoogle() {
    setError('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle({ role: 'student' });
      navigate('/', { replace: true });
    } catch (err) {
      if (!isCancelledPopup(err)) setError(describeAuthError(err));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-ink-900">{t('auth.signInTitle')}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {t('auth.newHere')}{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
            {t('auth.createAccountLink')}
          </Link>
          .
        </p>

        {!isFirebaseConfigured && (
          <div className="mt-5">
            <Alert tone="warning">{t('auth.notConfiguredSignIn')}</Alert>
          </div>
        )}

        <div className="mt-6">
          <GoogleButton
            onClick={handleGoogle}
            busy={googleBusy}
            disabled={busy || !isFirebaseConfigured}
            label={t('auth.signInWithGoogle')}
          />
          <p className="hint mt-1.5">
            {t('auth.googleStudentHint')}{' '}
            <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
              {t('auth.createAccountLink')}
            </Link>
            .
          </p>
        </div>

        <AuthDivider>{t('auth.or')}</AuthDivider>

        <div>
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {(error || authError) && (
          <div className="mt-4">
            <Alert>{error || authError}</Alert>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary mt-6 w-full"
          disabled={busy || googleBusy || !isFirebaseConfigured}
        >
          {busy && <Spinner />}
          {t('auth.signInWithEmail')}
        </button>
      </form>
    </AuthShell>
  );
}
