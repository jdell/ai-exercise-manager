import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { describeAuthError } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import AuthShell from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';

export default function SignIn() {
  const { signIn, authError } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
          disabled={busy || !isFirebaseConfigured}
        >
          {busy && <Spinner />}
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
