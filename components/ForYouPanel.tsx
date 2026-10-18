"use client";

import { ArrowRight, Compass, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

type Data = { mode: Mode; focus?: Focus; suggestions: Suggestion[] };

export function ForYouPanel() {
  const [mode, setMode] = useState<Mode | undefined>();
  const [guessed, setGuessed] = useState(false);
  const [data, setData] = useState<Data | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [focusDraft, setFocusDraft] = useState("");

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

  async function saveFocus(label: string | null) {
    await fetch("/api/foryou/focus", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setEditing(false);
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }

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
          {data?.focus && !editing && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="muted">{data.focus.source === "user" ? "Your focus:" : "It looks like you’re focused on"}</span>
              <strong>{data.focus.label}</strong>
              <span className={`badge ${data.focus.source === "user" ? "success" : "accent"}`}>
                {data.focus.source === "user" ? "Set by you" : `Inferred · ${data.focus.confidence} confidence`}
              </span>
              <button onClick={() => { setFocusDraft(data.focus!.label); setEditing(true); }} className="text-link text-[13px]">
                {data.focus.source === "user" ? "Change" : "Not right? Edit"}
              </button>
              {data.focus.source === "user" && (
                <button onClick={() => saveFocus(null)} className="faint text-[13px] hover:underline">
                  Let Corvus infer it
                </button>
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
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveFocus(focusDraft.trim() || null);
              }}
              className="flex flex-wrap gap-2"
            >
              <label htmlFor="focus-edit" className="sr-only">
                What are you focused on?
              </label>
              <span className="search-field flex-1">
                <input id="focus-edit" value={focusDraft} onChange={(e) => setFocusDraft(e.target.value)} maxLength={80} placeholder="What are you focused on?" />
              </span>
              <button className="button">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="button ghost">
                Cancel
              </button>
            </form>
          )}
          {!data?.focus && !editing && !loading && <p className="muted m-0">Not enough recent activity to tell what you’re focused on yet.</p>}
          {!data && loading && <p className="loading-line m-0">Looking at your recent activity…</p>}
        </div>
      </div>

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
              <div className="why-panel">
                <strong>
                  <Sparkles size={13} /> Why this?
                </strong>
                <ul>
                  {s.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
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
