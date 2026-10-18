import { z } from "zod";
import { currentUser, firebaseWebConfig, sameOrigin, signIn } from "@/lib/auth";
import { clearWorkspace, getScope } from "@/lib/workspace";

/** Whether sign-in is available (with the public Firebase config) and who is signed in. */
export async function GET() {
  const config = firebaseWebConfig();
  const [user, { includeSample }] = await Promise.all([config ? currentUser() : undefined, getScope()]);
  return Response.json({ configured: Boolean(config), config: config ?? null, user: user ?? null, includeSample });
}

const Body = z.object({ idToken: z.string().min(20).max(5000) });

/** Exchanges a Firebase ID token for this browser's workspace session. */
export async function POST(request: Request) {
  if (!firebaseWebConfig()) return Response.json({ error: "Sign-in is not set up" }, { status: 404 });
  if (!sameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    const { user, switched } = await signIn(parsed.data.idToken);
    return Response.json({ user, switched });
  } catch {
    // Firebase keeps verification errors opaque; so do we.
    return Response.json({ error: "Sign-in could not be verified. Try again." }, { status: 401 });
  }
}

/** Signs out: this browser drops the account's workspace and starts a fresh anonymous one. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  await clearWorkspace();
  return Response.json({ signedOut: true });
}
