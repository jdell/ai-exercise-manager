import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Firebase is required. Authentication, the database rules, and the Cloud
 * Function that talks to Claude are the app's security model, so there is no
 * backend-free mode to fall back to — run `firebase emulators:start` for local
 * work instead (see VITE_USE_EMULATORS below).
 */
export const isFirebaseConfigured = Boolean(
  config.databaseURL && config.apiKey && config.projectId && config.authDomain,
);

/** Must match setGlobalOptions() in functions/src/index.ts. */
const FUNCTIONS_REGION = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1';

const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true';

let app: FirebaseApp | undefined;
let db: Database | undefined;
let auth: Auth | undefined;
let functions: Functions | undefined;

function getApp(): FirebaseApp | undefined {
  if (!isFirebaseConfigured) return undefined;
  app = app ?? initializeApp(config);
  return app;
}

export function getDb(): Database | undefined {
  const instance = getApp();
  if (!instance) return undefined;
  if (!db) {
    db = getDatabase(instance);
    if (USE_EMULATORS) connectDatabaseEmulator(db, '127.0.0.1', 9000);
  }
  return db;
}

export function getFirebaseAuth(): Auth | undefined {
  const instance = getApp();
  if (!instance) return undefined;
  if (!auth) {
    auth = getAuth(instance);
    if (USE_EMULATORS) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

export function getFns(): Functions | undefined {
  const instance = getApp();
  if (!instance) return undefined;
  if (!functions) {
    functions = getFunctions(instance, FUNCTIONS_REGION);
    if (USE_EMULATORS) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  return functions;
}

export const usingEmulators = USE_EMULATORS;
