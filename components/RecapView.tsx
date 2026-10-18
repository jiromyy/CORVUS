"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { StoredRecap } from "@/lib/recap";
import { secondsToClock } from "@/lib/time";
import { SOURCE_LABEL, SourceIcon } from "./ui";

type Period = "last_7_days" | "this_week" | "last_week";

/** Recap player with chapters that seek the audio and link back to their sources. */
export function RecapView() {
  const id = useSearchParams().get("id");
  const [recap, setRecap] = useState<StoredRecap | null | undefined>();
  const [alternate, setAlternate] = useState<{ id: string; language: string } | null>(null);
  const [current, setCurrent] = useState(0);
  const [making, setMaking] = useState<{ startedAt: number } | undefined>();
  const [error, setError] = useState<string>();
  const [period, setPeriod] = useState<Period>("last_7_days");
  const [language, setLanguage] = useState<"en" | "fil">("en");
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(id ? `/api/recaps/${encodeURIComponent(id)}` : "/api/recaps/latest")
      .then((r) => (r.ok ? r.json() : { recap: null, alternate: null }))
      .then((body) => {
        if (cancelled) return;
        setRecap(body.recap);
        setAlternate(body.alternate ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function make() {
    setError(undefined);
    setMaking({ startedAt: Date.now() });
    const res = await fetch("/api/recaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, language }),
    }).catch(() => undefined);
    const body = await res?.json().catch(() => ({}));
    setMaking(undefined);
    if (!res?.ok) return setError(body?.error ?? "Couldn’t make the recap. Try again.");
    setRecap(body.recap);
    setAlternate(null);
    setCurrent(0);
    window.history.replaceState(null, "", `/recap?id=${body.recap.id}`);
  }

  function seek(i: number) {
    if (!audio.current || !recap) return;
    audio.current.currentTime = recap.chapters[i].startSeconds;
    audio.current.play().catch(() => undefined);
  }

  function onTime() {
    if (!audio.current || !recap) return;
    const t = audio.current.currentTime;
    const i = recap.chapters.findLastIndex((c) => c.startSeconds <= t + 0.2);
    if (i !== current && i >= 0) setCurrent(i);
  }

  if (recap === undefined) return <p className="animate-pulse text-[var(--muted)]">Loading your recap…</p>;

  const sourcesById = new Map((recap?.sources ?? []).map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {recap ? (
        <section aria-labelledby="recap-title">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
            Your recap · {recap.from.slice(5, 10)} to {recap.to.slice(5, 10)} · {secondsToClock(recap.durationSeconds)}
          </p>
          <h1 id="recap-title" className="mt-1 text-2xl font-semibold">
            {recap.title}
          </h1>
          {alternate && (
            <Link href={`/recap?id=${alternate.id}`} className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
              {alternate.language === "fil" ? "Pakinggan sa Filipino →" : "Listen in English →"}
            </Link>
          )}
          <audio ref={audio} src={recap.audioUrl} controls preload="metadata" onTimeUpdate={onTime} className="mt-4 w-full" />
          <ol className="mt-5 space-y-3">
            {recap.chapters.map((c, i) => (
              <li
                key={i}
                className={`rounded-xl border p-4 ${i === current ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)]"}`}
                aria-current={i === current ? "true" : undefined}
              >
                <button onClick={() => seek(i)} className="flex w-full items-baseline gap-3 text-left">
                  <span className="font-mono text-xs text-[var(--accent)]">{secondsToClock(c.startSeconds)}</span>
                  <span className="font-medium">{c.title}</span>
                </button>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{c.text}</p>
                {c.memoryIds.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.memoryIds.map((mid) => {
                      const s = sourcesById.get(mid);
                      if (!s) return null;
                      const href = s.source === "youtube" ? `/watch?m=${encodeURIComponent(s.id)}` : s.deepLink;
                      const label = s.memoryType === "video_moment" && s.startSeconds !== undefined ? `${s.title.split(" — ")[0]} · ${secondsToClock(s.startSeconds)}` : s.title;
                      return (
                        <li key={mid}>
                          <a
                            href={href}
                            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                            title={SOURCE_LABEL[s.source]}
                            className="flex max-w-[18rem] items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          >
                            <SourceIcon source={s.source} className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{label}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="text-[var(--muted)]">No recap yet. Make one below.</p>
      )}

      <section aria-labelledby="make-title" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 id="make-title" className="font-semibold">
          Make a new recap
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5">
              <option value="last_7_days">Last 7 days</option>
              <option value="this_week">This week</option>
              <option value="last_week">Last week</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "fil")} className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5">
              <option value="en">English</option>
              <option value="fil">Filipino</option>
            </select>
          </label>
          <button onClick={make} disabled={Boolean(making)} className="rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-50">
            {making ? "Making…" : "Make recap"}
          </button>
        </div>
        {making && (
          <p className="mt-3 animate-pulse text-sm text-[var(--muted)]" aria-live="polite">
            Gemini is writing your script and recording it. This takes about a minute.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </section>
      <Link href="/" className="inline-block text-sm text-[var(--muted)] hover:underline">
        ← Back
      </Link>
    </div>
  );
}
