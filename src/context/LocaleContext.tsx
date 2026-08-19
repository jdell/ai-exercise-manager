import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '../types';
import {
  detectLocale,
  plural,
  setActiveLocale,
  storeLocale,
  translate,
  type MessageKey,
  type Vars,
} from '../lib/i18n';

/**
 * The reader's language.
 *
 * It lives in the browser, not on the profile: a shared classroom machine gets
 * switched between students all day, and a language that followed the account
 * would fight that. What does travel is the language a *submission* was written
 * in — that is recorded on the submission itself so Claude's feedback comes
 * back in it, however the reader's UI is set later.
 */

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Message in the current locale, with `{placeholder}` substitution. */
  t: (key: MessageKey, vars?: Vars) => string;
  /** Message with a count, picking the `.one` / `.other` variant. */
  tn: (key: string, count: number, vars?: Vars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  // `lang` drives hyphenation, spell-check dictionaries, and screen-reader
  // pronunciation, so it has to move with the switch rather than being set once.
  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setActiveLocale(next);
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      tn: (key, count, vars) => plural(locale, key, count, vars),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside a LocaleProvider');
  return ctx;
}
