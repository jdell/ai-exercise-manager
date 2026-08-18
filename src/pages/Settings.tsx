import { useSession } from '../context/SessionContext';
import { isFirebaseConfigured, usingEmulators } from '../lib/firebase';
import { Alert, Panel } from '../components/ui';

export default function Settings() {
  const { session, signOut } = useSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Your account and how this app is wired up.</p>
      </div>

      <Panel title="Account">
        <dl className="divide-y divide-ink-100 text-sm">
          <Row label="Name" value={session?.name ?? '—'} />
          <Row label="Email" value={session?.email || '—'} />
          <Row
            label="Role"
            value={
              <span className="capitalize">
                {session?.role ?? '—'}
                <span className="ml-2 text-xs text-ink-400">set at sign-up</span>
              </span>
            }
          />
          <Row
            label="User ID"
            value={<code className="font-mono text-xs">{session?.id ?? '—'}</code>}
          />
        </dl>
        <p className="hint mt-4">
          Your role is stored on your profile record and can only be changed by someone with
          database access — it is not something this page, or any page, can switch.
        </p>
      </Panel>

      <Panel title="Anthropic API key" subtitle="Held by the server, not by this browser.">
        <Alert tone="success">
          Nothing to configure here. Prompts and grading run in a Cloud Function that reads{' '}
          <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> from Firebase Secret Manager.
        </Alert>
        <p className="hint mt-4">
          Earlier versions of this app called the Anthropic API straight from the browser, which
          meant whatever key was in use could be read out of devtools. That path is gone: the
          browser now calls <code className="font-mono text-xs">runPrompt</code> and{' '}
          <code className="font-mono text-xs">evaluateSubmission</code>, and the key never leaves
          the server.
        </p>
      </Panel>

      <Panel title="Environment">
        <dl className="divide-y divide-ink-100 text-sm">
          <Row
            label="Data store"
            value={
              isFirebaseConfigured ? (
                <span className="text-emerald-700">Firebase Realtime Database</span>
              ) : (
                <span className="text-rose-700">Not configured</span>
              )
            }
          />
          <Row
            label="Firebase config"
            value={isFirebaseConfigured ? 'Present' : 'Missing — set VITE_FIREBASE_* variables'}
          />
          <Row
            label="Backend"
            value={
              usingEmulators ? (
                <span className="text-amber-700">Local emulator suite</span>
              ) : (
                'Deployed Firebase project'
              )
            }
          />
        </dl>
        {usingEmulators && (
          <p className="hint mt-4">
            Auth, database, and functions are all served from{' '}
            <code className="font-mono text-xs">firebase emulators:start</code> on this machine.
            Nothing here touches your real project.
          </p>
        )}
      </Panel>

      <Panel title="Session">
        <button onClick={() => void signOut()} className="btn-secondary">
          Sign out
        </button>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right text-ink-900">{value}</dd>
    </div>
  );
}
