import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseAuth, getFns } from './firebase';
import type { Role, UserProfile } from '../types';

/**
 * Firebase Authentication, plus the one call that provisions a profile.
 *
 * Signing up is two steps that have to both land: create the credential, then
 * ask the server for a profile. Only the server may set `role` — database rules
 * reject a client write to that field — so a teacher account exists only if the
 * signing code checked out. If the second step fails, the half-made credential
 * is deleted rather than left behind as an account with no profile.
 */

function auth() {
  const instance = getFirebaseAuth();
  if (!instance) {
    throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* variables.');
  }
  return instance;
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const instance = getFirebaseAuth();
  if (!instance) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(instance, cb);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email.trim(), password);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth());
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  role: Role;
  teacherCode?: string;
}

export async function signUp(input: SignUpInput): Promise<UserProfile> {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Enter your name to continue.');

  const credential = await createUserWithEmailAndPassword(
    auth(),
    input.email.trim(),
    input.password,
  );

  try {
    await updateProfile(credential.user, { displayName });
    return await createProfile({
      displayName,
      role: input.role,
      teacherCode: input.teacherCode,
    });
  } catch (err) {
    // The credential exists but has no profile — every route and rule keys off
    // the profile, so leaving it would strand the account. Roll it back so the
    // email is free and the person can try again with the right code.
    await credential.user.delete().catch(() => undefined);
    throw err;
  }
}

/** What to make of a Google account that has never signed in here before. */
export interface GoogleSignInIntent {
  /** Role to provision if this account has no profile yet. Ignored if it does. */
  role: Role;
  teacherCode?: string;
}

/**
 * Google sign-in, for both returning and first-time users.
 *
 * There is no separate Google "sign up": the popup either matches an existing
 * Firebase user or mints one. Either way the profile is what decides the role,
 * and `createProfile` is idempotent — a returning user gets their existing
 * profile back untouched, so `intent` only matters the first time.
 */
export async function signInWithGoogle(intent: GoogleSignInIntent): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser. On a shared classroom machine, silently
  // reusing whoever signed in last is a way to submit work as someone else.
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth(), provider);
  const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false;

  try {
    return await createProfile({
      displayName: credential.user.displayName ?? '',
      role: intent.role,
      teacherCode: intent.teacherCode,
    });
  } catch (err) {
    // Same reasoning as signUp: a credential with no profile has no role and
    // no route will admit it. Roll a brand-new one back; for an account that
    // already existed, just drop the session rather than delete their login.
    if (isNewUser) await credential.user.delete().catch(() => undefined);
    else await firebaseSignOut(auth()).catch(() => undefined);
    throw err;
  }
}

/** Closing the popup is not an error worth showing anyone. */
export function isCancelledPopup(err: unknown): boolean {
  return (
    err instanceof FirebaseError &&
    (err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/user-cancelled')
  );
}

export async function createProfile(data: {
  displayName: string;
  role: Role;
  teacherCode?: string;
}): Promise<UserProfile> {
  const instance = getFns();
  if (!instance) throw new Error('Firebase is not configured.');
  const callable = httpsCallable<typeof data, UserProfile>(instance, 'createProfile');
  const result = await callable(data);
  return result.data;
}

/** Firebase Auth error codes are not phrased for students. */
export function describeAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-email':
        return 'That does not look like an email address.';
      case 'auth/missing-password':
        return 'Enter your password.';
      case 'auth/weak-password':
        return 'Pick a password of at least six characters.';
      case 'auth/email-already-in-use':
        return 'An account already exists for that email. Sign in instead.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'That email and password do not match an account.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a minute and try again.';
      case 'auth/network-request-failed':
        return 'Could not reach Firebase. Check your network connection.';
      case 'auth/operation-not-allowed':
        return 'That sign-in method is not enabled on this Firebase project.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the sign-in window. Allow popups for this site and try again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
      case 'auth/user-cancelled':
        return 'Sign-in was cancelled.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists for that email using a different sign-in method. Sign in the way you did the first time.';
      case 'auth/unauthorized-domain':
        return 'Google sign-in is not authorised for this domain. Add it under Authentication → Settings → Authorized domains.';
      default:
        return err.message.replace(/^Firebase:\s*/, '');
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not complete that. Try again.';
}
