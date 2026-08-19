import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemePreference, ThemeName } from '../types';

/**
 * Light, dark, or whatever the operating system says.
 *
 * The theme is a *token* swap, not a set of `dark:` variants — the whole
 * palette is redefined under `[data-theme='dark']` in `src/index.css`, so this
 * module's entire job is to keep that one attribute correct. Nothing else in
 * the app reads the theme, and nothing else should need to.
 *
 * Like the language, it lives in this browser rather than on the profile: a
 * shared classroom machine gets switched between students all day, and a
 * display preference that followed the account would fight that. Unlike the
 * language, it never travels with a submission — it changes nothing a teacher
 * or an evaluator ever sees.
 */

export const THEME_STORAGE_KEY = 'aiskills.theme';

/** Kept in sync with the meta tag, so installed PWAs tint their chrome. */
const CHROME_COLOR: Record<ThemeName, string> = {
  light: '#ffffff',
  dark: '#1c1d22',
};

interface ThemeContextValue {
  /** What the reader chose, including 'system'. */
  preference: ThemePreference;
  /** What is actually on screen, with 'system' already resolved. */
  theme: ThemeName;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStored(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // Private browsing can throw on localStorage access; fall through.
  }
  return 'system';
}

function systemTheme(): ThemeName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [system, setSystem] = useState<ThemeName>(systemTheme);

  // Following the OS means following it while the app is open, not only at
  // load — someone on an automatic day/night schedule should not have to
  // reload at dusk.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme: ThemeName = preference === 'system' ? system : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', CHROME_COLOR[theme]);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not worth failing the switch.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
