"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "corvus.welcomed";

/** First-visit introduction: what Corvus is, what the sample is, what to try, and the privacy promises. */
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

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Not remembered; harmless.
    }
  }

  if (!show) return null;

  return (
    <section
      aria-labelledby="welcome-title"
      className="mb-10 rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface)] p-5 sm:p-6"
    >
      <h2 id="welcome-title" className="text-lg font-semibold">
        Welcome to Corvus
      </h2>
      <p className="mt-1 text-[var(--muted)]">
        Corvus remembers what you watch, search, and read — and helps you use it: find the exact moment again, see what you’re
        focused on, and get what helps next.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">You’re looking at Maya’s sample memory</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Two weeks of a student learning Python: 4 real YouTube tutorials (one in Filipino), 8 Google searches, and 2 articles.
            Try:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Ask “Where did I see how to fix the TypeError…?” and open the exact second</li>
            <li>Ask in Filipino: “Saan ko napanood kung paano mag-install ng Python?”</li>
            <li>Switch <b>For you now</b> between Study, Commute, and Rest</li>
            <li>
              Play the <Link href="/recap" className="text-[var(--accent)] hover:underline">2-minute recap</Link> of her learning
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Use your own activity</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Import your Google Takeout for the past, and add the Chrome extension to remember new YouTube videos and searches
            automatically.
          </p>
          <h3 className="mt-4 text-sm font-semibold">Your data, your control</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Corvus never signs in to your Google account</li>
            <li>Your memories stay in a private space tied to this browser</li>
            <li>Every answer cites its sources; inferred guesses are labelled</li>
            <li>Delete everything with one click in Memory</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={dismiss} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-medium text-white">
          Explore Maya’s memory
        </button>
        <Link href="/import" onClick={dismiss} className="rounded-xl border border-[var(--border)] px-5 py-2.5 font-medium hover:border-[var(--accent)]">
          Use my own activity
        </Link>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">Corvus is a hackathon concept and is not a Google product.</p>
    </section>
  );
}
