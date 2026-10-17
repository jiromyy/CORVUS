"use client";

import { useState } from "react";

/** Steps to install the Corvus Capture extension and a one-time pairing code for this workspace. */
export function ExtensionConnect() {
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | { error: string } | undefined>();
  const [busy, setBusy] = useState(false);

  async function getCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/extension/pair", { method: "POST" });
      setPairing(res.ok ? await res.json() : { error: "Couldn’t create a code. Try again." });
    } catch {
      setPairing({ error: "Couldn’t create a code. Try again." });
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="ext-title" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 id="ext-title" className="text-lg font-semibold">
        Capture automatically with the Chrome extension
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        From now on, YouTube videos you watch (after 30 seconds) and your Google searches go straight into your memory. Nothing
        is captured on other sites, and you can pause it any time.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>
          <a href="/corvus-capture.zip" download className="text-[var(--accent)] hover:underline">
            Download the extension
          </a>{" "}
          and unzip it.
        </li>
        <li>
          Open <code>chrome://extensions</code>, turn on <b>Developer mode</b>, click <b>Load unpacked</b>, and choose the
          unzipped folder.
        </li>
        <li>Click the Corvus icon in Chrome’s toolbar and enter this code:</li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={getCode}
          disabled={busy}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pairing && "code" in pairing ? "New code" : "Get pairing code"}
        </button>
        {pairing && "code" in pairing && (
          <span className="flex items-center gap-2">
            <code className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-lg tracking-widest">{pairing.code}</code>
            <span className="text-xs text-[var(--muted)]">
              valid until {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, one use
            </span>
          </span>
        )}
        {pairing && "error" in pairing && <span className="text-sm text-red-500">{pairing.error}</span>}
      </div>
    </section>
  );
}
