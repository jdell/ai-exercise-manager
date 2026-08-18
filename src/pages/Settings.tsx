import { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { DEFAULT_MODEL, getApiKey, isUserSuppliedKey, setApiKey } from '../lib/claude';
import { isFirebaseConfigured } from '../lib/firebase';
import { storageMode } from '../lib/store';
import { Alert, Panel } from '../components/ui';

function maskKey(key: string): string {
  if (key.length < 12) return '••••';
  return `${key.slice(0, 11)}${'•'.repeat(12)}${key.slice(-4)}`;
}

export default function Settings() {
  const { session, signOut } = useSession();
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const current = getApiKey();
  const fromLocal = isUserSuppliedKey();

  function save() {
    setApiKey(draft);
    setDraft('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">
          Signed in as {session?.name} ({session?.role}).
        </p>
      </div>

      <Panel title="Anthropic API key" subtitle="Used for test runs and for scoring submissions.">
        {current ? (
          <Alert tone="success">
            A key is configured{fromLocal ? ' in this browser' : ' from the build environment'}:{' '}
            <code className="font-mono text-xs">{maskKey(current)}</code>
          </Alert>
        ) : (
          <Alert tone="warning">
            No key configured. Test runs and scoring will fail until you add one.
          </Alert>
        )}

        <div className="mt-4">
          <label htmlFor="apikey" className="label">
            {current ? 'Replace the key' : 'Add a key'}
          </label>
          <input
            id="apikey"
            type="password"
            className="input font-mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-api03-…"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="hint mt-1.5">
            Stored in this browser's localStorage only — it is never written to the database. Get
            one at{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline"
            >
              console.anthropic.com
            </a>
            .
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={!draft.trim()} className="btn-primary">
            Save key
          </button>
          {fromLocal && (
            <button
              onClick={() => {
                setApiKey('');
                setDraft('');
              }}
              className="btn-secondary"
            >
              Remove stored key
            </button>
          )}
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-xs leading-relaxed text-amber-900">
            <span className="font-semibold">Where the key goes.</span> This app calls the Anthropic
            API straight from the browser, so whatever key is in use is visible to anyone with
            access to this device's developer tools. That is fine for a classroom where each person
            supplies their own key, and not fine for a public deployment — for that, route requests
            through a server you control and keep the key there.
          </p>
        </div>
      </Panel>

      <Panel title="Environment">
        <dl className="divide-y divide-ink-100 text-sm">
          <Row label="Evaluator model" value={<code className="font-mono text-xs">{DEFAULT_MODEL}</code>} />
          <Row
            label="Data store"
            value={
              storageMode === 'firebase' ? (
                <span className="text-emerald-700">Firebase Realtime Database</span>
              ) : (
                <span className="text-amber-700">This browser only (localStorage)</span>
              )
            }
          />
          <Row
            label="Firebase config"
            value={isFirebaseConfigured ? 'Present' : 'Missing — set VITE_FIREBASE_* variables'}
          />
        </dl>
        {storageMode === 'local' && (
          <p className="hint mt-4">
            Without Firebase, submissions live in this browser and sync across tabs but not across
            devices. Everything else works, so the full flow is still demonstrable.
          </p>
        )}
      </Panel>

      <Panel title="Session">
        <button onClick={signOut} className="btn-secondary">
          Sign out
        </button>
        <p className="hint mt-2">
          Students who sign back in with the same name keep their history.
        </p>
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
