"use client";

import { ArrowRight, Check, ChevronDown, Compass, ExternalLink, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedbackMap, Verdict } from "@/lib/feedback";
import type { Focus, Mode, Suggestion } from "@/lib/foryou";
import { LanguageBadge } from "./ui";

const MODE_LABEL: Record<Mode, string> = { study: "Study", commute: "Commute", rest: "Rest" };
const KIND_LABEL: Record<Suggestion["kind"], string> = {
  lesson: "Lesson",
  podcast: "Listen",
  music: "Music",
  moment: "Revisit",
  recap: "Your recap",
};
const STORAGE_MODE = "corvus.mode";
const STORAGE_DISMISSED = "corvus.dismissed";

/** Time of day only pre-selects a context; it is labelled as a guess and the user can change it. */
function modeFromClock(d = new Date()): Mode {
  const h = d.getHours();
  if ((h >= 6 && h < 9) || (h >= 17 && h < 19)) return "commute";
  if (h >= 21 || h < 6) return "rest";
  return "study";
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the choice just isn't remembered.
  }
}

type Data = { mode: Mode; focus?: Focus; dismissedFocus?: string; suggestions: Suggestion[]; feedback?: FeedbackMap; activityCount?: number };

export function ForYouPanel() {
  const [mode, setMode] = useState<Mode | undefined>();
  const [guessed, setGuessed] = useState(false);
  const [data, setData] = useState<Data | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  useEffect(() => {
    const saved = readStorage<Mode | null>(STORAGE_MODE, null);
    // Restoring browser-only preferences after mount (they are not available during prerendering).
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode(saved ?? modeFromClock());
    setGuessed(!saved);
    setDismissed(readStorage<string[]>(STORAGE_DISMISSED, []));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const [reloadKey, setReloadKey] = useState(0);
  const loading = refreshing || !data || data.mode !== mode;

  // A newer mode or reload cancels the older request, so only the latest response is shown.
  useEffect(() => {
    if (!mode) return;
    let cancelled = false;
    fetch(`/api/foryou?mode=${mode}`)
      .then((res) => (res.ok ? (res.json() as Promise<Data>) : undefined))
      .catch(() => undefined)
      .then((body) => {
        if (cancelled) return;
        if (body) setData(body);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, reloadKey]);

  function choose(m: Mode) {
    setMode(m);
    setGuessed(false);
    writeStorage(STORAGE_MODE, m);
  }

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeStorage(STORAGE_DISMISSED, next);
  }

  /** Records a verdict on the server, then reloads so the list reflects it (dropped, boosted, confirmed). */
  async function sendFeedback(key: string, verdict: Verdict | null, meta: { kind?: string; channel?: string; title?: string } = {}) {
    setRefreshing(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, verdict, ...meta }),
    }).catch(() => undefined);
    setReloadKey((k) => k + 1);
  }
  const verdictOf = (key: string) => data?.feedback?.[key.replace(/[.~*/[\]]/g, "_")]?.verdict;



  const visible = (data?.suggestions ?? []).filter((s) => !dismissed.includes(s.id));

  return (
    <section aria-labelledby="foryou-title" className="foryou">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Personal suggestions</span>
          <h2 id="foryou-title" className="mt-1.5 text-[22px]! tracking-tight">
            For you now
          </h2>
          <p>Ranked from your recent activity and the context you choose, not for endless watch time.</p>
        </div>
        <div>
          <div role="radiogroup" aria-label="What are you doing?" className="segmented">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} onClick={() => choose(m)}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          {guessed && mode && <p className="mt-1.5 text-right text-xs">Picked from the time of day · tap to change</p>}
        </div>
      </div>

      <div className="focus-card">
        <span className="suggestion-orb" aria-hidden>
          <Compass size={19} />
        </span>
        <div className="min-w-0">
          {data?.focus && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="muted">It looks like you’re focused on</span>
              <strong>{data.focus.label}</strong>
              {verdictOf(`focus:${data.focus.label}`) === "right" ? (
                <button className="feedback-chip on" onClick={() => sendFeedback(`focus:${data.focus!.label}`, null)} title="Undo">
                  <Check size={12} /> Confirmed by you · undo
                </button>
              ) : (
                <>
                  <span className="badge accent">Inferred · {data.focus.confidence} confidence</span>
                  <button onClick={() => sendFeedback(`focus:${data.focus!.label}`, "right", { title: data.focus!.label })} className="feedback-chip">
                    <ThumbsUp size={12} /> That’s right
                  </button>
                  <button onClick={() => sendFeedback(`focus:${data.focus!.label}`, "wrong", { title: data.focus!.label })} className="feedback-chip">
                    <ThumbsDown size={12} /> Not right
                  </button>
                </>
              )}
              {data.focus.evidence.length > 0 && (
                <details className="w-full text-[13px] faint">
                  <summary className="cursor-pointer">Why does Corvus think so?</summary>
                  <ul className="mt-1 list-disc pl-5">
                    {data.focus.evidence.map((e) => (
                      <li key={e.id}>{e.title}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {!data?.focus && data?.dismissedFocus && (
            <p className="m-0 flex flex-wrap items-center gap-2">
              <span className="muted">You said “{data.dismissedFocus}” isn’t right, so Corvus isn’t assuming a focus.</span>
              <button className="feedback-chip" onClick={() => sendFeedback(`focus:${data.dismissedFocus}`, null)}>
                Undo
              </button>
            </p>
          )}
          {!data?.focus && !data?.dismissedFocus && !loading && <p className="muted m-0">Not enough recent activity to tell what you’re focused on yet.</p>}
          {!data && loading && <p className="loading-line m-0">Looking at your recent activity…</p>}
        </div>
      </div>

      {data && !loading && (data.activityCount ?? 0) < 3 && (
        <div className="empty-memory mt-4">
          <h2>Not enough activity yet for personal suggestions</h2>
          <p>
            Corvus suggests from what you watch, search, and read. You have {data.activityCount ?? 0} activit{data.activityCount === 1 ? "y" : "ies"} so far.
            Import your history or pair the extension, and suggestions will become yours.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/import" className="button compact">Import history</Link>
            <Link href="/extension" className="button secondary compact">Pair the extension</Link>
          </div>
        </div>
      )}
      <ul className={`suggestion-grid stagger ${loading && data ? "opacity-60" : ""}`} aria-busy={loading}>
        {visible.map((s) => (
          <li key={s.id} className="suggestion-card">
            <div className="thumb" style={s.thumbnail ? { backgroundImage: `url(${s.thumbnail})` } : undefined}>
              <span className="badge accent">{KIND_LABEL[s.kind]}</span>
            </div>
            <div className="body">
              <h3>{s.title}</h3>
              <p className="byline">
                {s.channel && <span>{s.channel}</span>}
                {s.durationSeconds !== undefined && <span>· {s.durationSeconds ? `${Math.max(1, Math.round(s.durationSeconds / 60))} min` : "Live"}</span>}
                <LanguageBadge language={s.language} />
              </p>
              <button
                className="why-button"
                aria-expanded={openWhy === s.id}
                aria-controls={`why-${s.id}`}
                onClick={() => setOpenWhy(openWhy === s.id ? null : s.id)}
              >
                <Sparkles size={13} /> Why this? <ChevronDown size={13} className="chev" />
              </button>
              {openWhy === s.id && (
                <div className="why-panel" id={`why-${s.id}`}>
                  <ul>
                    {s.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <div className="feedback-row">
                    <span>Is this right for you?</span>
                    {verdictOf(`suggestion:${s.id}`) === "more" ? (
                      <button className="feedback-chip on" onClick={() => sendFeedback(`suggestion:${s.id}`, null)}>
                        <Check size={12} /> More like this · undo
                      </button>
                    ) : (
                      <button
                        className="feedback-chip"
                        onClick={() => sendFeedback(`suggestion:${s.id}`, "more", { kind: s.kind, channel: s.channel, title: s.title })}
                      >
                        <ThumbsUp size={12} /> More like this
                      </button>
                    )}
                    <button
                      className="feedback-chip"
                      onClick={() => sendFeedback(`suggestion:${s.id}`, "wrong", { kind: s.kind, channel: s.channel, title: s.title })}
                    >
                      <ThumbsDown size={12} /> Not right
                    </button>
                  </div>
                </div>
              )}
            </div>
            <footer>
              {s.external ? (
                <a href={s.href} target="_blank" rel="noreferrer" className="text-link inline-flex items-center gap-1.5">
                  {s.kind === "music" || s.kind === "podcast" ? "Listen on YouTube" : "Watch on YouTube"} <ExternalLink size={14} />
                </a>
              ) : (
                <Link href={s.href} className="text-link inline-flex items-center gap-1.5">
                  {s.kind === "recap" ? "Play recap" : "Open the moment"} <ArrowRight size={14} />
                </Link>
              )}
              <button onClick={() => dismiss(s.id)}>Not now</button>
            </footer>
          </li>
        ))}
      </ul>
      {!loading && data && !visible.length && <p className="muted mt-4 text-sm">No suggestions right now.</p>}
    </section>
  );
}
