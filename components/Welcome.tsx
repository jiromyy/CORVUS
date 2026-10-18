"use client";

import { ArrowRight, Check, ShieldCheck, WandSparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "corvus.welcomed";

/** First-visit popup: what Corvus is, what the sample is, what to try, and the privacy promises. Shown once per browser. */
export function Welcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage unavailable (private mode): show the welcome every time.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only flag, read after mount
    setShow(!seen);
  }, []);

  /** Opts this (signed-out) browser into Raven's sample, then reloads so every page includes it. */
  async function trySample() {
    await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ includeSample: true }) }).catch(() => undefined);
    dismiss();
    window.location.reload();
  }

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Not remembered; harmless.
    }
  }

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-layer">
      <button className="modal-scrim" aria-label="Close welcome" onClick={dismiss} />
      <section role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="panel welcome">
      <div className="flex items-center justify-between">
        <span className="badge accent">
          <WandSparkles size={12} /> Private by design
        </span>
        <button className="icon-button compact" onClick={dismiss} aria-label="Close welcome" autoFocus>
          <X size={16} />
        </button>
      </div>
      <h2 id="welcome-title">
        Welcome to Corvus. <em>Your activity, as a memory you can use.</em>
      </h2>
      <p className="muted text-[15px]">
        Corvus remembers what you watch, search, and read, and helps you use it: find the exact moment again, see what you’re
        focused on, and get what helps next.
      </p>

      <div className="welcome-grid">
        <div>
          <h3>Try it with Raven’s sample data</h3>
          <p>Two weeks of a student learning Python: 4 real YouTube tutorials (one in Filipino), 8 Google searches, and 2 articles. Try:</p>
          <ul>
            <li>Ask “Where did I see how to fix the TypeError…?” and open the exact second</li>
            <li>Ask in Filipino: “Saan ko napanood kung paano mag-install ng Python?”</li>
            <li>Switch <b>For you now</b> between Study, Commute, and Rest</li>
            <li>
              Play the{" "}
              <Link href="/recap" className="text-link">
                2-minute recap
              </Link>{" "}
              of that learning
            </li>
          </ul>
        </div>
        <div>
          <h3>Use your own activity</h3>
          <p>Import your Google Takeout for the past, and add the Chrome extension to remember new YouTube videos and searches automatically.</p>
          <h3 className="mt-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--success)]" /> Your data, your control
          </h3>
          <ul className="trust-list">
            {[
              "Signing in with Google is optional and only proves who you are; Corvus never reads your Google account",
              "Your memories stay private to this browser, or to your sign-in if you choose",
              "Every answer cites its sources; inferred guesses are labelled",
              "Delete everything with one click in Settings",
            ].map((t) => (
              <li key={t}>
                <Check size={14} /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={trySample} className="button">
          Try Raven’s sample data
        </button>
        <Link href="/import" onClick={dismiss} className="button secondary">
          Use my own activity <ArrowRight size={15} />
        </Link>
      </div>
    </section>
    </div>
  );
}
