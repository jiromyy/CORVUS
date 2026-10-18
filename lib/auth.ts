/**
 * Optional Google sign-in through Firebase Authentication. Sign-in proves identity only: Corvus asks for
 * no Google data scopes. A verified account is linked to one workspace, so its memories follow it to any
 * browser; without sign-in Corvus keeps working with an anonymous per-browser workspace.
 */
import { getAuth } from "firebase-admin/auth";
import { getUserProfile, getUserWorkspace, getWorkspaceOwner, linkUserWorkspace, type UserProfile } from "./db/store";
import { getAdminApp } from "./db/firestore";
import { getEnv } from "./env";
import { createWorkspace, getWorkspace, switchWorkspace } from "./workspace";

/** The public Firebase web config, or undefined when sign-in is not set up. */
export function firebaseWebConfig() {
  const env = getEnv();
  if (!env.FIREBASE_API_KEY || !env.FIREBASE_AUTH_DOMAIN || !env.FIREBASE_APP_ID) return undefined;
  return { apiKey: env.FIREBASE_API_KEY, authDomain: env.FIREBASE_AUTH_DOMAIN, projectId: env.GOOGLE_CLOUD_PROJECT, appId: env.FIREBASE_APP_ID };
}

/** The signed-in account for this browser's workspace, if any. */
export async function currentUser(): Promise<UserProfile | undefined> {
  const ws = await getWorkspace();
  const uid = await getWorkspaceOwner(ws.id);
  return uid ? getUserProfile(uid) : undefined;
}

/**
 * Verifies a Firebase ID token and moves this browser onto the account's workspace.
 * First sign-in keeps the current (anonymous) workspace, so imported history carries over; a later
 * sign-in on another browser switches to the workspace the account already has.
 */
export async function signIn(idToken: string): Promise<{ user: UserProfile; switched: boolean }> {
  const token = await getAuth(getAdminApp()).verifyIdToken(idToken);
  const user: UserProfile = { uid: token.uid, name: token.name, email: token.email, photoURL: token.picture };

  const current = await getWorkspace();
  let workspaceId = await getUserWorkspace(user.uid);
  if (!workspaceId) {
    const owner = await getWorkspaceOwner(current.id);
    // Never adopt a workspace that already belongs to someone else.
    workspaceId = owner && owner !== user.uid ? await createWorkspace() : current.id;
  }
  await linkUserWorkspace(user, workspaceId);
  await switchWorkspace(workspaceId);
  return { user, switched: workspaceId !== current.id };
}

/** Rejects cross-site requests to the session endpoint (login CSRF). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
