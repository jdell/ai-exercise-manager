import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

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
 * True when enough Firebase config is present to actually connect. When false
 * the app falls back to an in-browser localStorage store so the whole flow is
 * still demonstrable without a Firebase project.
 */
export const isFirebaseConfigured = Boolean(config.databaseURL && config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
let db: Database | undefined;

export function getDb(): Database | undefined {
  if (!isFirebaseConfigured) return undefined;
  if (!db) {
    app = app ?? initializeApp(config);
    db = getDatabase(app);
  }
  return db;
}
