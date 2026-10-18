"use client";

import { ArrowRight, Check, ShieldCheck, WandSparkles } from "lucide-react";
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
    <section aria-labelledby="welcome-title" className="panel welcome">
      <span className="badge accent">
        <WandSparkles size={12} /> Private by design
      </span>
      <h2 id="welcome-title">
        Welcome to Corvus. <em>Your activity, as a memory you can use.</em>
      </h2>
      <p className="muted text-[15px]">
        Corvus remembers what you watch, search, and read, and helps you use it: find the exact moment again, see what you’re
        focused on, and get what helps next.
      </p>

      <div className="welcome-grid">
        <div>
          <h3>You’re looking at Maya’s sample memory</h3>
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
              of her learning
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
              "Corvus never signs in to your Google account",
              "Your memories stay in a private space tied to this browser",
              "Every answer cites its sources; inferred guesses are labelled",
              "Delete everything with one click in Memory",
            ].map((t) => (
              <li key={t}>
                <Check size={14} /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={dismiss} className="button">
          Explore Maya’s memory
        </button>
        <Link href="/import" onClick={dismiss} className="button secondary">
          Use my own activity <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
