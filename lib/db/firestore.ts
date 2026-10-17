import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getEnv } from "../env";

let db: Firestore | undefined;

/** Server-side Firestore, authenticated with ADC locally and the service account on Cloud Run. */
export function getDb(): Firestore {
  if (db) return db;
  const env = getEnv();
  const app =
    getApps()[0] ??
    initializeApp({ credential: applicationDefault(), projectId: env.GOOGLE_CLOUD_PROJECT });
  db = getFirestore(app, env.FIRESTORE_DATABASE);
  return db;
}
