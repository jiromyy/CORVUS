"use client";

import { AudioLines, Languages, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { StoredRecap } from "@/lib/recap";
import { secondsToClock } from "@/lib/time";
import { useEvidence } from "./Evidence";
import { SourceIcon } from "./ui";

type Period = "last_7_days" | "this_week" | "last_week";
const SPEEDS = [1, 1.25, 1.5] as const;

type Line = { text: string; start: number; end: number; chapter: number };

/**
 * Read-along lines: each chapter split into sentences, each given a share of the chapter's audio span
 * in proportion to its length (the same estimate used for chapter start times).
 */
function readAlongLines(chapters: StoredRecap["chapters"], duration: number): Line[] {
  return chapters.flatMap((c, i) => {
    const end = chapters[i + 1]?.startSeconds ?? duration;
    // Split only where a sentence ends and the next one starts, so "20 Minutes!, then…" in a title stays whole.
    const sentences = c.text.split(/(?<=[.!?]["”’)]*)\s+(?=["“‘(]?[A-Z0-9])/).map((t) => t.trim()).filter(Boolean);
    const total = sentences.reduce((n, t) => n + t.length, 0) || 1;
    let before = 0;
    return sentences.map((text) => {
      const start = c.startSeconds + (before / total) * (end - c.startSeconds);
      before += text.length;
      return { text, start, end: c.startSeconds + (before / total) * (end - c.startSeconds), chapter: i };
    });
  });
}

/** Splits a line at the word boundary nearest to how far its narration has played. */
function splitSpoken(text: string, fraction: number) {
  if (fraction <= 0) return ["", text];
  if (fraction >= 1) return [text, ""];
  let cut = Math.round(text.length * fraction);
  const space = text.indexOf(" ", cut);
  cut = space === -1 ? text.length : space;
  return [text.slice(0, cut), text.slice(cut)];
}

/**
 * Recap player: Gemini TTS audio with a read-along view that follows playback, chapters that seek the
 * audio, and every chapter's sources one click away in the evidence drawer.
 */
export function RecapView() {
  const id = useSearchParams().get("id");
  const { openEvidence } = useEvidence();
  const [recap, setRecap] = useState<StoredRecap | null | undefined>();
  const [alternate, setAlternate] = useState<{ id: string; language: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string>();
  const [period, setPeriod] = useState<Period>("last_7_days");
  const [language, setLanguage] = useState<"en" | "fil">("en");

  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let cancelled = false;
    fetch(id ? `/api/recaps/${encodeURIComponent(id)}` : "/api/recaps/latest")
      .then((r) => (r.ok ? r.json() : { recap: null, alternate: null }))
      .catch(() => ({ recap: null, alternate: null }))
      .then((body) => {
        if (cancelled) return;
        setRecap(body.recap);
        setAlternate(body.alternate ?? null);
        setTime(0);
        setPlaying(false);
        setDuration(body.recap?.durationSeconds ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function make() {
    setError(undefined);
    setMaking(true);
    const res = await fetch("/api/recaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, language }),
    }).catch(() => undefined);
    const body = await res?.json().catch(() => ({}));
    setMaking(false);
    if (!res?.ok) return setError(body?.error ?? "Couldn’t make the recap. Try again.");
    audio.current?.pause();
    setRecap(body.recap);
    setAlternate(null);
    setTime(0);
    setDuration(body.recap.durationSeconds);
    window.history.replaceState(null, "", `/recap?id=${body.recap.id}`);
  }

  function seekTo(seconds: number, play = false) {
    const el = audio.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration || el.duration || 0, seconds));
    setTime(el.currentTime);
    if (play) el.play().catch(() => undefined);
  }

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => undefined);
    } else el.pause();
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  if (recap === undefined) return <p className="loading-line content-medium">Loading your recap…</p>;

  const chapters = recap?.chapters ?? [];
  const activeIndex = Math.max(0, chapters.findLastIndex((c) => c.startSeconds <= time + 0.2));
  const active = chapters[activeIndex];
  const lines = readAlongLines(chapters, duration);
  const lineIndex = Math.max(0, lines.findLastIndex((l) => l.start <= time + 0.05));
  const line = lines[lineIndex];
  const fraction = line && line.end > line.start ? (time - line.start) / (line.end - line.start) : 0;
  const [spoken, unspoken] = line ? splitSpoken(line.text, playing || time > 0 ? fraction : 0) : ["", ""];
  const sourcesById = new Map((recap?.sources ?? []).map((s) => [s.id, s]));
  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div className="content-medium">
      <header className="page-header">
        <div>
          <span className="eyebrow">Listen or read along</span>
          <h1>
            Your media intake, <em>made coherent</em>
          </h1>
          <p>A narrated recap of what you watched, searched, and read, voiced by Gemini, with every chapter linked to its sources.</p>
        </div>
        <div className="page-actions">
          <span className="badge accent">
            <AudioLines size={13} /> Gemini TTS
          </span>
        </div>
      </header>

      {recap && active ? (
        <>
          <section className="recap-player panel" aria-label="Recap player">
            <div className="recap-player-head">
              <div>
                <span className="eyebrow">
                  Your recap · {recap.from.slice(5, 10)} to {recap.to.slice(5, 10)}
                </span>
                <h2>{recap.title}</h2>
                <p>
                  {chapters.length} chapters · {recap.sources.length} memories · {secondsToClock(duration)}
                  {alternate && (
                    <>
                      {" · "}
                      <Link href={`/recap?id=${alternate.id}`} className="text-link">
                        <Languages size={13} className="inline" /> {alternate.language === "fil" ? "Pakinggan sa Filipino" : "Listen in English"}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <span className={`voice-orb ${playing ? "is-playing" : ""}`} aria-hidden>
                <AudioLines size={22} />
              </span>
            </div>

            <div className="recap-cinema">
              <div className="recap-aura" aria-hidden>
                <i />
                <i />
                <i />
              </div>
              <div className="lyric-stack">
                {lineIndex > 0 && (
                  <button className="lyric-line previous" onClick={() => seekTo(lines[lineIndex - 1].start, true)}>
                    {lines[lineIndex - 1].text}
                  </button>
                )}
                <div className="lyric-line active" key={lineIndex} aria-live="polite">
                  <span>
                    {secondsToClock(active.startSeconds)} · {active.title}
                  </span>
                  <p>
                    <span className="spoken">{spoken}</span>
                    <span className="unspoken">{unspoken}</span>
                  </p>
                </div>
                {lineIndex < lines.length - 1 && (
                  <button className="lyric-line next" onClick={() => seekTo(lines[lineIndex + 1].start, true)}>
                    {lines[lineIndex + 1].text}
                  </button>
                )}
              </div>
              <div className="cinema-caption">
                <Sparkles size={14} /> Read-along follows the audio. Select any line or chapter to jump.
              </div>
            </div>

            <div className="player-controls">
              <button className="player-icon" onClick={() => seekTo(time - 15)} aria-label="Back 15 seconds">
                <RotateCcw size={17} />
                <small>15</small>
              </button>
              <button className="player-toggle" onClick={toggle} aria-label={playing ? "Pause recap" : "Play recap"}>
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <div className="player-timeline">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={time}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Recap playback position"
                  aria-valuetext={`${secondsToClock(time)} of ${secondsToClock(duration)}`}
                  style={{ "--progress": `${progress}%` } as CSSProperties}
                />
                <div>
                  <span>{secondsToClock(time)}</span>
                  <span>{secondsToClock(duration)}</span>
                </div>
              </div>
              <button className="speed-button" onClick={cycleSpeed} aria-label={`Playback speed ${speed} times`}>
                {speed}×
              </button>
              <button className="player-icon" onClick={() => seekTo(time + 15)} aria-label="Forward 15 seconds">
                <RotateCcw className="forward" size={17} />
                <small>15</small>
              </button>
            </div>
            <audio
              ref={audio}
              src={recap.audioUrl}
              preload="metadata"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
                e.currentTarget.playbackRate = speed;
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          </section>

          <section className="recap-chapters" aria-label="Transcript and sources">
            <div className="section-heading">
              <div>
                <h2>Transcript and sources</h2>
                <p>Each chapter cites the memories it was written from. Select a source to inspect its evidence.</p>
              </div>
              <span className="badge">
                {activeIndex + 1} of {chapters.length}
              </span>
            </div>
            {chapters.map((c, i) => (
              <article
                key={i}
                className={`recap-chapter ${i === activeIndex ? "active" : ""}`}
                onClick={() => seekTo(c.startSeconds, true)}
                aria-current={i === activeIndex ? "true" : undefined}
              >
                <button
                  className="chapter-time"
                  aria-label={`Play from ${secondsToClock(c.startSeconds)}: ${c.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(c.startSeconds, true);
                  }}
                >
                  {secondsToClock(c.startSeconds)}
                </button>
                <div className="chapter-copy">
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  {c.memoryIds.length > 0 && (
                    <div className="chapter-sources">
                      {c.memoryIds.map((mid, n) => {
                        const s = sourcesById.get(mid);
                        if (!s) return null;
                        const label =
                          s.memoryType === "video_moment" && s.startSeconds !== undefined
                            ? `${s.title.split(" — ")[0]} · ${secondsToClock(s.startSeconds)}`
                            : s.title;
                        return (
                          <button
                            key={mid}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEvidence({ ...s, claim: c.text });
                            }}
                          >
                            <span>{n + 1}</span>
                            <SourceIcon source={s.source} size={13} className="shrink-0" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {i === activeIndex && playing && (
                  <span className="now-playing" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </article>
            ))}
          </section>
        </>
      ) : (
        <p className="muted">No recap yet. Make one below.</p>
      )}

      <section className="new-recap panel" aria-labelledby="make-title">
        <div>
          <span className="eyebrow">Create another</span>
          <h2 id="make-title">Choose what Corvus should recap</h2>
          <p>Gemini writes a grounded script from the selected period, then records it as audio.</p>
        </div>
        <div className="recap-form">
          <label>
            <span>Time span</span>
            <select className="field-select" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="last_7_days">Last 7 days</option>
              <option value="this_week">This week</option>
              <option value="last_week">Last week</option>
            </select>
          </label>
          <label>
            <span>Language</span>
            <select className="field-select" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "fil")}>
              <option value="en">English</option>
              <option value="fil">Filipino</option>
            </select>
          </label>
          <button className="button" onClick={make} disabled={making}>
            <Sparkles size={16} /> {making ? "Making…" : "Make recap"}
          </button>
        </div>
        {making && (
          <p className="loading-line mt-3 text-sm" aria-live="polite">
            Gemini is writing your script and recording it. This takes about a minute.
          </p>
        )}
        {error && <p className="error-note mt-3">{error}</p>}
      </section>
    </div>
  );
}
