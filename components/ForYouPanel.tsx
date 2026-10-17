"use client";

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
    <section aria-labelledby="foryou-title" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="foryou-title" className="text-xl font-semibold">
          For you now
        </h2>
        <div role="radiogroup" aria-label="What are you doing?" className="flex gap-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => choose(m)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                mode === m ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      {guessed && mode && (
        <p className="mt-1 text-right text-xs text-[var(--muted)]">Picked from the time of day — tap to change</p>
      )}

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        {data?.focus && !editing && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[var(--muted)]">{data.focus.source === "user" ? "Your focus:" : "It looks like you’re focused on"}</span>
            <span className="font-medium">{data.focus.label}</span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
              {data.focus.source === "user" ? "set by you" : `inferred · ${data.focus.confidence} confidence`}
            </span>
            <button onClick={() => { setFocusDraft(data.focus!.label); setEditing(true); }} className="text-xs text-[var(--accent)] hover:underline">
              {data.focus.source === "user" ? "Change" : "Not right? Edit"}
            </button>
            {data.focus.source === "user" && (
              <button onClick={() => saveFocus(null)} className="text-xs text-[var(--muted)] hover:underline">
                Let Corvus infer it
              </button>
            )}
            {data.focus.evidence.length > 0 && (
              <details className="w-full text-[var(--muted)]">
                <summary className="cursor-pointer text-xs">Why does Corvus think so?</summary>
                <ul className="mt-1 list-disc pl-5 text-xs">
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
            <input
              id="focus-edit"
              value={focusDraft}
              onChange={(e) => setFocusDraft(e.target.value)}
              maxLength={80}
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5"
            />
            <button className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-white">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="px-2 text-[var(--muted)]">
              Cancel
            </button>
          </form>
        )}
        {!data?.focus && !editing && !loading && (
          <p className="text-[var(--muted)]">Not enough recent activity to tell what you’re focused on yet.</p>
        )}
        {!data && loading && <p className="animate-pulse text-[var(--muted)]">Looking at your recent activity…</p>}
      </div>

      <ul className={`mt-4 grid gap-3 sm:grid-cols-2 ${loading && data ? "opacity-60" : ""}`} aria-busy={loading}>
        {visible.map((s) => (
          <li key={s.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex gap-3 p-3">
              {s.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnails, decorative
                <img src={s.thumbnail} alt="" className="h-16 w-28 shrink-0 rounded-md object-cover" loading="lazy" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">{KIND_LABEL[s.kind]}</p>
                <h3 className="line-clamp-2 text-sm font-medium leading-snug">{s.title}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                  {s.channel && <span>{s.channel}</span>}
                  {s.durationSeconds !== undefined && <span>· {s.durationSeconds ? `${Math.max(1, Math.round(s.durationSeconds / 60))} min` : "Live"}</span>}
                  <LanguageBadge language={s.language} />
                </p>
              </div>
            </div>
            <div className="flex-1 px-3 pb-2">
              <p className="text-xs font-medium text-[var(--muted)]">Why this?</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[var(--muted)]">
                {s.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-sm">
              {s.external ? (
                <a href={s.href} target="_blank" rel="noreferrer" className="font-medium text-[var(--accent)] hover:underline">
                  {s.kind === "music" || s.kind === "podcast" ? "Listen on YouTube ↗" : "Watch on YouTube ↗"}
                </a>
              ) : (
                <Link href={s.href} className="font-medium text-[var(--accent)] hover:underline">
                  {s.kind === "recap" ? "Play recap →" : "Open the moment →"}
                </Link>
              )}
              <button onClick={() => dismiss(s.id)} className="text-xs text-[var(--muted)] hover:underline">
                Not now
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && data && !visible.length && <p className="mt-4 text-sm text-[var(--muted)]">No suggestions right now.</p>}
    </section>
  );
}
