"use client";

import { Check, Download, Laptop, Moon, RotateCcw, Sun, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MemoryView } from "@/lib/db/store";
import { useEvidence } from "./Evidence";
import { THEME_EVENT, currentTheme, setTheme, type ThemePreference } from "./shell/theme";

type Workspace = { includeSample: boolean; hiddenSampleCount: number; own: { videos: number; searches: number; pages: number; total: number } };
type Session = { configured: boolean; user: { name?: string; email?: string } | null };

const THEMES: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Laptop },
];

/** Appearance, account, and the privacy controls for this workspace. */
export function SettingsView() {
  const { notify } = useEvidence();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [ws, setWs] = useState<Workspace | undefined>();
  const [session, setSession] = useState<Session | undefined>();
  const [busy, setBusy] = useState<string>();

  const loadWorkspace = () =>
    fetch("/api/workspace")
      .then((r) => (r.ok ? r.json() : undefined))
      .then((body) => body && setWs(body));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value, read after mount
    setThemeState(currentTheme());
    const onTheme = (e: Event) => setThemeState((e as CustomEvent<ThemePreference>).detail);
    window.addEventListener(THEME_EVENT, onTheme);
    loadWorkspace();
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : undefined))
      .then((body) => body && setSession(body));
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

  async function toggleSample() {
    if (!ws) return;
    setBusy("sample");
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeSample: !ws.includeSample }),
    });
    await loadWorkspace();
    setBusy(undefined);
    notify(ws.includeSample ? "Raven’s sample is hidden" : "Raven’s sample is included again");
  }

  async function restore() {
    setBusy("restore");
    await fetch("/api/workspace/reset", { method: "POST" });
    await loadWorkspace();
    setBusy(undefined);
    notify("Forgotten sample memories restored");
  }

  async function download() {
    setBusy("download");
    const res = await fetch("/api/memories").catch(() => undefined);
    const body = (await res?.json().catch(() => undefined)) as { workspaceId: string; memories: MemoryView[] } | undefined;
    setBusy(undefined);
    if (!body) return notify("Couldn’t prepare the download. Try again.");
    const own = body.memories.filter((m) => m.workspaceId === body.workspaceId);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), memories: own }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `corvus-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify(`Downloaded ${own.length} of your memories`);
  }

  async function deleteAll() {
    if (!window.confirm("Delete everything you imported or captured? This can’t be undone. Raven’s sample is not affected.")) return;
    setBusy("delete");
    await fetch("/api/workspace", { method: "DELETE" });
    await loadWorkspace();
    setBusy(undefined);
    notify("Your imported and captured data was deleted");
  }

  return (
    <div className="content-medium">
      <header className="page-header">
        <div>
          <span className="eyebrow">Settings</span>
          <h1>
            Your memory, <em>your rules</em>
          </h1>
          <p>Choose how Corvus looks, what it remembers, and what it forgets.</p>
        </div>
      </header>

      <section className="panel settings-section" aria-labelledby="appearance-title">
        <h2 id="appearance-title">Appearance</h2>
        <p>Remembered in this browser.</p>
        <div className="theme-grid" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button key={value} className="theme-choice" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)}>
              <div className={`theme-preview ${value === "light" ? "" : value}`} aria-hidden>
                <i />
                <i />
                <i />
              </div>
              <span>
                <Icon size={15} /> {label} {theme === value && <Check size={15} className="ml-auto text-[var(--accent)]" />}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-section" aria-labelledby="account-title">
        <h2 id="account-title">Account</h2>
        <p>Optional. Signing in with Google only proves who you are; Corvus requests no access to your Google data.</p>
        <div className="setting-row">
          <div className="flex items-center gap-3">
            <UserRound size={18} className="text-[var(--accent-soft)]" />
            <div>
              <h3>{session?.user ? `Signed in as ${session.user.name ?? session.user.email}` : "Not signed in"}</h3>
              <p>
                {session?.user
                  ? "Your memories follow your Google sign-in to any browser."
                  : session?.configured
                    ? "Use “Sign in with Google” in the sidebar to keep your memories across browsers."
                    : "Your memories are kept in a private workspace tied to this browser."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel settings-section" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacy &amp; memory</h2>
        <p>
          {ws ? `${ws.own.total} memories are yours (${ws.own.videos} videos, ${ws.own.searches} searches, ${ws.own.pages} pages).` : "Loading…"}
        </p>
        <div className="setting-row">
          <div>
            <h3>Include Raven’s sample history</h3>
            <p>Show the sample alongside your own memories in answers, suggestions, and insights.</p>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={ws?.includeSample ?? true}
            aria-label="Include Raven’s sample history"
            onClick={toggleSample}
            disabled={!ws || busy === "sample"}
          >
            <span />
          </button>
        </div>
        {ws && ws.hiddenSampleCount > 0 && (
          <div className="setting-row">
            <div>
              <h3>Restore forgotten sample memories</h3>
              <p>
                You forgot {ws.hiddenSampleCount} sample memor{ws.hiddenSampleCount === 1 ? "y" : "ies"}. Bring them back.
              </p>
            </div>
            <button className="button secondary compact" onClick={restore} disabled={busy === "restore"}>
              <RotateCcw size={14} /> Restore
            </button>
          </div>
        )}
        <div className="setting-row">
          <div>
            <h3>Automatic capture</h3>
            <p>Pause or resume from the Corvus extension’s popup. It only ever captures YouTube watches and Google searches.</p>
          </div>
          <Link href="/sources" className="button secondary compact">
            Manage sources
          </Link>
        </div>
        <div className="setting-row">
          <div>
            <h3>Download your Corvus data</h3>
            <p>Your own memories as JSON, including the video moments Gemini found.</p>
          </div>
          <button className="button secondary compact" onClick={download} disabled={busy === "download"}>
            <Download size={14} /> Download
          </button>
        </div>
        <div className="setting-row danger">
          <div>
            <h3>Delete all my data</h3>
            <p>Removes everything you imported or captured and disconnects paired browsers. Raven’s sample is not affected.</p>
          </div>
          <button className="button danger compact" onClick={deleteAll} disabled={busy === "delete"}>
            <Trash2 size={14} /> {busy === "delete" ? "Deleting…" : "Delete all"}
          </button>
        </div>
      </section>
    </div>
  );
}
