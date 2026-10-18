"use client";

import { LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEvidence } from "../Evidence";

type FirebaseConfig = { apiKey: string; authDomain: string; projectId: string; appId: string };
type User = { uid: string; name?: string; email?: string; photoURL?: string };
type Session = { configured: boolean; config: FirebaseConfig | null; user: User | null };

/**
 * Sidebar account card. Signed out, Corvus uses an anonymous workspace for this browser; signing in with
 * Google (identity only, no data scopes) links that workspace to the account so it follows you.
 */
type FirebaseKit = {
  auth: import("firebase/auth").Auth;
  provider: import("firebase/auth").GoogleAuthProvider;
  signInWithPopup: typeof import("firebase/auth").signInWithPopup;
  signOut: typeof import("firebase/auth").signOut;
};

/** Loads and initialises Firebase Auth. The client session is memory-only: the server cookie is the real session. */
async function loadFirebase(config: FirebaseConfig): Promise<FirebaseKit> {
  const [{ getApps, initializeApp }, fa] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp(config);
  let auth: import("firebase/auth").Auth;
  try {
    auth = fa.initializeAuth(app, { persistence: fa.inMemoryPersistence, popupRedirectResolver: fa.browserPopupRedirectResolver });
  } catch {
    auth = fa.getAuth(app); // Already initialised (dev hot reload).
  }
  const provider = new fa.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return { auth, provider, signInWithPopup: fa.signInWithPopup, signOut: fa.signOut };
}

export function Account() {
  const { notify } = useEvidence();
  const [session, setSession] = useState<Session | undefined>();
  const [busy, setBusy] = useState(false);
  const kit = useRef<Promise<FirebaseKit> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined)
      .then((s: Session | undefined) => {
        setSession(s ?? { configured: false, config: null, user: null });
        // Preload while signed out, so a click opens the popup immediately. Browsers block popups
        // that open after an awaited download, because the click no longer counts as the trigger.
        if (s?.config && !s.user) kit.current = loadFirebase(s.config);
      });
  }, []);

  async function signIn() {
    if (!session?.config) return;
    setBusy(true);
    try {
      const { auth, provider, signInWithPopup, signOut } = await (kit.current ??= loadFirebase(session.config));
      const { user } = await signInWithPopup(auth, provider);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await user.getIdToken() }),
      });
      // The server session (workspace cookie) is what counts; the Firebase client session isn't needed after this.
      await signOut(auth);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Sign-in failed");
      // Every page loads its data on mount, so reload to show the account's memories.
      window.location.reload();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      console.error("Corvus sign-in failed", code, err);
      notify(
        code.includes("popup-closed") || code.includes("cancelled-popup")
          ? "Sign-in was cancelled"
          : code.includes("popup-blocked")
            ? "Allow pop-ups for this site to sign in"
            : err instanceof Error && !code
              ? err.message
              : `Couldn’t sign in (${code || "unknown error"}). Try again.`,
      );
      setBusy(false);
    }
  }

  async function signOut() {
    if (!window.confirm("Sign out? This browser will start a fresh, empty workspace. Your account keeps its memories.")) return;
    setBusy(true);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    window.location.reload();
  }

  const user = session?.user;
  const name = user?.name ?? user?.email ?? "Raven’s sample + yours";
  return (
    <div className="profile-card">
      {user?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google profile photo, tiny and remote
        <img className="avatar object-cover" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
      ) : (
        <div className="avatar" aria-hidden>
          {(user ? name : "R").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <strong className="truncate">{name}</strong>
        <span>{user ? "Synced to your Google sign-in" : "Private to this browser"}</span>
      </div>
      {session?.configured &&
        (user ? (
          <button className="icon-button compact" onClick={signOut} disabled={busy} aria-label="Sign out" title="Sign out">
            <LogOut size={15} />
          </button>
        ) : (
          <button className="button compact profile-signin" onClick={signIn} disabled={busy}>
            <LogIn size={14} /> {busy ? "Signing in…" : "Sign in with Google"}
          </button>
        ))}
    </div>
  );
}
