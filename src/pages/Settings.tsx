import { useSession } from '../context/SessionContext';
import { useLocale } from '../context/LocaleContext';
import { isFirebaseConfigured, usingEmulators } from '../lib/firebase';
import { LOCALES } from '../lib/i18n';
import { Alert, Panel } from '../components/ui';
import type { Locale } from '../types';

export default function Settings() {
  const { session, signOut } = useSession();
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('settings.subtitle')}</p>
      </div>

      <Panel title={t('settings.account')}>
        <dl className="divide-y divide-ink-100 text-sm">
          <Row label={t('settings.name')} value={session?.name ?? '—'} />
          <Row label={t('settings.email')} value={session?.email || '—'} />
          <Row
            label={t('settings.role')}
            value={
              <span>
                {session ? t(`role.${session.role}`) : '—'}
                <span className="ml-2 text-xs text-ink-400">{t('settings.roleSetAtSignup')}</span>
              </span>
            }
          />
          <Row
            label={t('settings.userId')}
            value={<code className="font-mono text-xs">{session?.id ?? '—'}</code>}
          />
        </dl>
        <p className="hint mt-4">{t('settings.roleNote')}</p>
      </Panel>

      {/*
        The same switch as the header, with room for the explanation the header
        has no space for — in particular that the choice travels with a
        submission and comes back in Claude's feedback.
      */}
      <Panel title={t('settings.language')} subtitle={t('settings.languageSubtitle')}>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((option) => (
            <button
              key={option.id}
              onClick={() => setLocale(option.id as Locale)}
              aria-pressed={locale === option.id}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                locale === option.id
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                  : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="hint mt-4">{t('settings.languageNote')}</p>
      </Panel>

      <Panel title={t('settings.apiKey')} subtitle={t('settings.apiKeySubtitle')}>
        <Alert tone="success">{t('settings.apiKeyBody')}</Alert>
        <p className="hint mt-4">{t('settings.apiKeyNote')}</p>
      </Panel>

      <Panel title={t('settings.environment')}>
        <dl className="divide-y divide-ink-100 text-sm">
          <Row
            label={t('settings.dataStore')}
            value={
              isFirebaseConfigured ? (
                <span className="text-emerald-700">{t('settings.dataStoreValue')}</span>
              ) : (
                <span className="text-rose-700">{t('settings.notConfigured')}</span>
              )
            }
          />
          <Row
            label={t('settings.firebaseConfig')}
            value={isFirebaseConfigured ? t('settings.present') : t('settings.missing')}
          />
          <Row
            label={t('settings.backend')}
            value={
              usingEmulators ? (
                <span className="text-amber-700">{t('settings.emulatorSuite')}</span>
              ) : (
                t('settings.deployedProject')
              )
            }
          />
        </dl>
        {usingEmulators && <p className="hint mt-4">{t('settings.emulatorNote')}</p>}
      </Panel>

      <Panel title={t('settings.session')}>
        <button onClick={() => void signOut()} className="btn-secondary">
          {t('nav.signOut')}
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
