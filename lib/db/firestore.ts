import { getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getEnv } from "../env";

let db: Firestore | undefined;

/** The Firebase Admin app, authenticated with ADC locally and the service account on Cloud Run. */
export function getAdminApp(): App {
  return getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: getEnv().GOOGLE_CLOUD_PROJECT });
}

/** Server-side Firestore. */
export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getAdminApp(), getEnv().FIRESTORE_DATABASE);
  // Optional fields (e.g. startSeconds on an article) are simply omitted instead of failing the write.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already configured: a dev hot reload re-ran this module against the existing Firestore instance.
  }
  return db;
}
