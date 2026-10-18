"use client";

import { ArrowLeft, ArrowRight, Lightbulb, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MemoryView } from "@/lib/db/store";
import type { Explanation, ThreadSummary } from "@/lib/threads";
import { useEvidence } from "./Evidence";
import { SOURCE_LABEL, SourceIcon, formatSeen } from "./ui";

type Data = { thread: ThreadSummary; items: MemoryView[]; moments: MemoryView[]; explanation: Explanation & { generated: boolean } };

const MAX_NODES = 9;
const label = (m: MemoryView) => (m.memoryType === "search" ? m.excerpt : m.title.split(" — ")[0]);

/** One interest thread: its activities as a small network, and Gemini's explanation of how they connect. */
export function ThreadView() {
  const id = useSearchParams().get("t") ?? "";
  const { openEvidence } = useEvidence();
  const [data, setData] = useState<Data | null | undefined>();

  useEffect(() => {
    fetch(`/api/threads/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(setData);
  }, [id]);

  if (data === undefined) return <p className="loading-line content-wide">Connecting the thread…</p>;
  if (data === null)
    return (
      <div className="content-wide">
        <p className="muted">This thread isn’t in your memory any more.</p>
        <Link href="/library" className="button secondary compact">
          <ArrowLeft size={14} /> Memory
        </Link>
      </div>
    );

  const { thread, items, moments, explanation } = data;
  const nodes = items.slice(-MAX_NODES);
  // Nodes on an ellipse around the topic, starting top-left.
  const place = (i: number) => {
    const a = -Math.PI * 0.75 + (i / nodes.length) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 36, y: 50 + Math.sin(a) * 36 };
  };

  return (
    <div className="content-wide">
      <Link href="/library" className="button ghost compact mb-4">
        <ArrowLeft size={14} /> Memory
      </Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">Interest thread · latest {formatSeen(thread.latest)}</span>
          <h1 className="capitalize">{thread.topic}</h1>
          <p>
            Corvus connected these {thread.count} activities because they share this topic, not because it inferred a permanent
            interest.
          </p>
        </div>
        <div className="page-actions">
          <Link href={`/?ask=${encodeURIComponent(`What have I learned about ${thread.topic}?`)}`} className="button">
            <MessageSquare size={16} /> Ask about this
          </Link>
        </div>
      </header>

      <div className="thread-layout">
        <section className="panel p-5" aria-label="Thread network">
          <div className="network-canvas">
            <svg aria-hidden>
              {nodes.map((m, i) => {
                const p = place(i);
                return <line key={m.id} x1="50%" y1="50%" x2={`${p.x}%`} y2={`${p.y}%`} />;
              })}
            </svg>
            <div className="node central" style={{ left: "50%", top: "50%" }}>
              <Lightbulb size={17} />
              <span className="capitalize">{thread.topic}</span>
            </div>
            {nodes.map((m, i) => {
              const p = place(i);
              return (
                <button
                  key={m.id}
                  className="node"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 50}ms` }}
                  onClick={() => openEvidence(m)}
                  title={`${SOURCE_LABEL[m.source]} · ${formatSeen(m.occurredAt)}`}
                >
                  <SourceIcon source={m.source} size={15} />
                  <span>{label(m)}</span>
                </button>
              );
            })}
          </div>
          <div className="network-legend">
            <span>
              <i /> Observed activity ({items.length})
            </span>
            <span>
              <i className="inferred" /> Gemini video moments on this topic ({moments.length})
            </span>
            {items.length > MAX_NODES && <span>Showing the latest {MAX_NODES}</span>}
          </div>
        </section>

        <aside className="panel thread-summary">
          <span className="badge accent">
            <Sparkles size={12} /> Why these connect{explanation.generated ? " · Gemini" : ""}
          </span>
          <h2>{explanation.title}</h2>
          <p>{explanation.why}</p>
          <div className="thread-facts">
            <div>
              <span>First seen</span>
              <strong>{formatSeen(thread.firstSeen)}</strong>
            </div>
            <div>
              <span>Latest activity</span>
              <strong>{formatSeen(thread.latest)}</strong>
            </div>
            <div>
              <span>Activities</span>
              <strong>
                {thread.counts.videos} videos · {thread.counts.searches} searches · {thread.counts.pages} pages
              </strong>
            </div>
            {explanation.bridge && (
              <div>
                <span>Strongest bridge</span>
                <strong className="text-right">{explanation.bridge}</strong>
              </div>
            )}
          </div>
          <Link href="/for-you" className="button secondary">
            Continue exploring <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      {moments.length > 0 && (
        <section className="mt-6">
          <span className="eyebrow">Moments Gemini found on this topic</span>
          <div className="thread-chips">
            {moments.map((m) => (
              <button key={m.id} className="chip" onClick={() => openEvidence(m)}>
                <SourceIcon source={m.source} size={13} /> {m.excerpt.slice(0, 70)}
                {m.excerpt.length > 70 ? "…" : ""}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
