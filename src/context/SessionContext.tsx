import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { Session, UserProfile } from '../types';
import * as auth from '../lib/auth';
import { clearOfflineCache } from '../lib/offline';
import { subscribeProfile, touchProfile } from '../lib/store';

/**
 * The signed-in identity: a Firebase Auth credential plus the profile record
 * that carries the role.
 *
 * Both halves are required. The credential proves who you are; the profile at
 * /users/$uid says whether you are a student or a teacher, and it is written
 * only by the createProfile Cloud Function. Nothing in the browser decides a
 * role, which is why database rules can trust the same field.
 */

interface SessionContextValue {
  session: Session | null;
  /** True until Firebase has resolved the credential and its profile. */
  loading: boolean;
  /** A sign-in level problem worth showing on the sign-in screen. */
  authError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: auth.SignUpInput) => Promise<void>;
  /** Google popup. `intent` only applies if the account has no profile yet. */
  signInWithGoogle: (intent: auth.GoogleSignInIntent) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  /** Set while signUp is between "credential created" and "profile written". */
  const provisioning = useRef(false);

  useEffect(
    () =>
      auth.watchAuth((next) => {
        setUser(next);
        if (!next) {
          setProfile(null);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user) return;
    return subscribeProfile(
      user.uid,
      (next) => {
        setProfile(next);
        setLoading(false);
        if (!next && !provisioning.current) {
          // A credential with no profile has no role, so no route will admit
          // it. Rather than leaving the person on a blank shell, drop them back
          // to sign-in with an explanation.
          setAuthError(
            'That account has no profile yet. Ask your teacher to finish setting it up, then sign in again.',
          );
          void auth.signOut();
        }
      },
      (err) => {
        setProfile(null);
        setLoading(false);
        setAuthError(err.message);
      },
    );
  }, [user]);

  const session = useMemo<Session | null>(
    () =>
      profile
        ? {
            id: profile.uid,
            name: profile.displayName,
            role: profile.role,
            email: profile.email,
          }
        : null,
    [profile],
  );

  // Keep presence fresh so the teacher's roster shows who is active.
  useEffect(() => {
    if (session) void touchProfile(session.id);
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError('');
    await auth.signIn(email, password);
  }, []);

  const signUp = useCallback(async (input: auth.SignUpInput) => {
    setAuthError('');
    provisioning.current = true;
    try {
      const created = await auth.signUp(input);
      setProfile(created);
    } finally {
      provisioning.current = false;
    }
  }, []);

  // Like signUp, this can leave a credential without a profile for a moment,
  // so it holds the same flag to stop the effect above signing them out.
  const signInWithGoogle = useCallback(async (intent: auth.GoogleSignInIntent) => {
    setAuthError('');
    provisioning.current = true;
    try {
      setProfile(await auth.signInWithGoogle(intent));
    } finally {
      provisioning.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError('');
    // This is a classroom machine. The next student to sit down must not find
    // the last one's work mirrored in localStorage — see lib/offline.ts. The
    // outbox is deliberately NOT cleared: queued work belongs to whoever wrote
    // it, and it is theirs to send when they sign back in.
    clearOfflineCache(session?.id);
    await auth.signOut();
  }, [session?.id]);

  const value = useMemo(
    () => ({ session, loading, authError, signIn, signUp, signInWithGoogle, signOut }),
    [session, loading, authError, signIn, signUp, signInWithGoogle, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside a SessionProvider');
  return ctx;
}
