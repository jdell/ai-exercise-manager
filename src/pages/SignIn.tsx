import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { describeAuthError, isCancelledPopup } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import AuthShell from '../components/AuthShell';
import { AuthDivider, GoogleButton } from '../components/GoogleButton';
import { Alert, Spinner } from '../components/ui';

export default function SignIn() {
  const { signIn, signInWithGoogle, authError } = useSession();
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
        <h2 className="text-xl font-semibold text-ink-900">Sign in</h2>
        <p className="mt-1 text-sm text-ink-500">
          New here?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
            Create an account
          </Link>
          .
        </p>

        {!isFirebaseConfigured && (
          <div className="mt-5">
            <Alert tone="warning">
              Firebase is not configured, so there is nothing to sign in to. Set the{' '}
              <code className="font-mono text-xs">VITE_FIREBASE_*</code> variables — see the README.
            </Alert>
          </div>
        )}

        <div className="mt-6">
          <GoogleButton onClick={handleGoogle} busy={googleBusy} disabled={busy || !isFirebaseConfigured} />
          <p className="hint mt-1.5">
            First time here? Google sign-in creates a student account. Teachers should use{' '}
            <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
              Create an account
            </Link>
            .
          </p>
        </div>

        <AuthDivider />

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@school.edu"
            autoComplete="email"
            required
          />
        </div>

        <div className="mt-4">
          <label htmlFor="password" className="label">
            Password
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
          Sign in with email
        </button>
      </form>
    </AuthShell>
  );
}
