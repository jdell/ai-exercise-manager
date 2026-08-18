import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
        return 'Email and password sign-in is not enabled on this Firebase project.';
      default:
        return err.message.replace(/^Firebase:\s*/, '');
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not complete that. Try again.';
}
