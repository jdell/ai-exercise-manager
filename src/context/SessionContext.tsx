import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, Session } from '../types';
import { newId, touchStudent, upsertStudent } from '../lib/store';

const STORAGE_KEY = 'aiem:session:v1';

export const TEACHER_PASSCODE = import.meta.env.VITE_TEACHER_PASSCODE || 'let-me-teach';

interface SessionContextValue {
  session: Session | null;
  signIn: (role: Role, name: string, passcode?: string) => Promise<void>;
  signOut: () => void;
  switchRole: (role: Role) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStored);

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  // Keep the student's presence record fresh so teachers see who is active.
  // touchStudent rather than upsertStudent so a returning student's createdAt
  // survives; the record itself is created by signIn.
  useEffect(() => {
    if (session?.role !== 'student') return;
    void touchStudent(session.id, session.name);
  }, [session]);

  const signIn = useCallback(async (role: Role, name: string, passcode?: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Enter your name to continue.');

    if (role !== 'student' && passcode !== TEACHER_PASSCODE) {
      throw new Error('That passcode is not correct.');
    }

    if (role === 'student') {
      // Returning students keep their id so their history follows them.
      const prior = readStored();
      const id =
        prior?.role === 'student' && prior.name.toLowerCase() === trimmed.toLowerCase()
          ? prior.id
          : newId('stu');
      const now = Date.now();
      await upsertStudent({ id, name: trimmed, createdAt: now, lastSeenAt: now });
      setSession({ role, id, name: trimmed });
      return;
    }

    setSession({ role, id: newId(role === 'teacher' ? 'tch' : 'evl'), name: trimmed });
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const switchRole = useCallback((role: Role) => {
    setSession((current) => (current ? { ...current, role } : current));
  }, []);

  const value = useMemo(
    () => ({ session, signIn, signOut, switchRole }),
    [session, signIn, signOut, switchRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside a SessionProvider');
  return ctx;
}
