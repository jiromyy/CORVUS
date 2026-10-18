"use client";

import { Copy, Download, KeyRound, Pause, Search, Video } from "lucide-react";
import { useState } from "react";
import { useEvidence } from "./Evidence";

/** Steps to install the Corvus Capture extension and a one-time pairing code for this workspace. */
export function ExtensionConnect() {
  const { notify } = useEvidence();
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

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      notify("Pairing code copied");
    } catch {
      notify("Copy didn’t work. Type the code instead.");
    }
  }

  return (
    <section id="extension" aria-labelledby="ext-title" className="two-col scroll-mt-24">
      <div className="panel p-6">
        <span className="badge accent">Automatic capture</span>
        <h2 id="ext-title" className="mb-1 mt-3 text-[21px] tracking-tight">
          Pair the Chrome extension
        </h2>
        <p className="muted m-0 text-[14px]">
          From now on, YouTube videos you watch (after 30 seconds) and your Google searches go straight into your memory.
        </p>
        <ol className="steps mt-4">
          <li>
            <a href="/corvus-capture.zip" download className="text-link inline-flex items-center gap-1">
              <Download size={14} /> Download the extension
            </a>{" "}
            and unzip it.
          </li>
          <li>
            Open <code>chrome://extensions</code>, turn on <b>Developer mode</b>, click <b>Load unpacked</b>, and choose the unzipped folder.
          </li>
          <li>Click the Corvus bird in Chrome’s toolbar to open the side panel, and enter this one-time code.</li>
        </ol>
        {pairing && "code" in pairing && (
          <>
            <div className="pairing-code" aria-label={`Pairing code ${pairing.code}`}>
              {pairing.code}
            </div>
            <p className="faint m-0 text-center text-[12.5px]">
              Valid until {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · one use
            </p>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={getCode} disabled={busy} className="button">
            <KeyRound size={15} /> {pairing && "code" in pairing ? "New code" : "Get pairing code"}
          </button>
          {pairing && "code" in pairing && (
            <button className="button secondary" onClick={() => copy(pairing.code)}>
              <Copy size={15} /> Copy code
            </button>
          )}
        </div>
        {pairing && "error" in pairing && <p className="error-note mt-3">{pairing.error}</p>}
      </div>
      <div className="panel p-6">
        <h3 className="m-0 mb-1 text-[15px]">What it captures</h3>
        <div className="feature-row">
          <span>
            <Video size={17} />
          </span>
          <div>
            <strong>YouTube watches</strong>
            <p>After 30 seconds of playback, so a quick skim isn’t remembered.</p>
          </div>
        </div>
        <div className="feature-row">
          <span>
            <Search size={17} />
          </span>
          <div>
            <strong>Google searches</strong>
            <p>The submitted query and the result you click. No keystrokes or page contents.</p>
          </div>
        </div>
        <div className="feature-row">
          <span>
            <Pause size={17} />
          </span>
          <div>
            <strong>You stay in control</strong>
            <p>Other sites are remembered only when you choose “Remember once” or “Always remember” in the side panel. Pause any time; deleting your data also disconnects it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
