"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ContentItem } from "@/lib/ai/schemas";
import type { MemoryView } from "@/lib/db/store";
import { secondsToClock } from "@/lib/time";
import { embedUrl, watchAtUrl } from "@/lib/youtube";
import { LanguageBadge, formatSeen } from "./ui";

type Loaded = { memory: MemoryView; content: ContentItem };

/** Plays the source video from the remembered moment, with the moment list alongside. */
export function WatchView() {
  const params = useSearchParams();
  const memoryId = params.get("m");
  const [data, setData] = useState<Loaded | { error: string } | undefined>();
  const [start, setStart] = useState<number | undefined>();

  useEffect(() => {
    if (!memoryId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/memories/${encodeURIComponent(memoryId)}`);
      if (!res.ok) return !cancelled && setData({ error: "This memory doesn’t exist or was deleted." });
      const { memory } = (await res.json()) as { memory: MemoryView };
      const contentRes = await fetch(`/api/content/${encodeURIComponent(memory.contentId ?? "")}`);
      if (!contentRes.ok) return !cancelled && setData({ error: "The video for this memory is unavailable." });
      const { content } = (await contentRes.json()) as { content: ContentItem };
      if (!cancelled) {
        setData({ memory, content });
        setStart(memory.startSeconds ?? 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memoryId]);

  const loaded = data && !("error" in data) ? data : undefined;
  const currentStart = loaded?.content.moments?.findLast((m) => m.startSeconds <= (start ?? 0))?.startSeconds;
  useEffect(() => {
    if (currentStart === undefined) return;
    // Scroll only the moment list, never the page (on phones the list sits below the player).
    const item = document.getElementById(`moment-${currentStart}`);
    const list = item?.closest("ol");
    if (item && list) list.scrollTop = item.offsetTop - list.offsetTop - 8;
  }, [currentStart]);

  if (!memoryId) return <p className="muted">No memory selected.</p>;
  if (!data) return <p className="loading-line">Loading the moment…</p>;
  if ("error" in data) return <p className="muted">{data.error}</p>;

  const { memory, content } = data;
  const videoId = content.id.replace(/^yt_/, "");
  const moments = content.moments ?? [];
  const current = moments.findLastIndex((m) => m.startSeconds <= (start ?? 0));

  return (
    <div className="content-wide grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="aspect-video w-full overflow-hidden rounded-[18px] bg-black shadow-[var(--shadow)]">
          <iframe
            key={start}
            src={embedUrl(videoId, start, true)}
            title={content.title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span>{content.creator}</span>
          <span aria-hidden>·</span>
          <span>Watched {formatSeen(memory.occurredAt)}</span>
          {content.language && <LanguageBadge language={content.language} />}
        </div>
        <h1 className="mt-2 text-[24px] font-semibold leading-snug tracking-tight">{content.title}</h1>
        {current >= 0 && (
          <div className="panel mt-4 p-5" key={moments[current].startSeconds} style={{ animation: "item-rise 300ms ease-out both" }}>
            <span className="badge accent">Moment at {secondsToClock(moments[current].startSeconds)}</span>
            <p className="mb-0 mt-3 text-[15.5px] leading-relaxed">{moments[current].spokenSummary}</p>
            <p className="mb-0 mt-2 text-[14px]">
              <b>On screen: </b>
              <span className="muted">{moments[current].visualDescription}</span>
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={watchAtUrl(videoId, start)} target="_blank" rel="noreferrer" className="button secondary compact">
            Open on YouTube <ExternalLink size={14} />
          </a>
          <Link href="/" className="button ghost compact">
            <ArrowLeft size={14} /> Back to Ask
          </Link>
        </div>
      </div>

      <aside aria-label="Moments in this video">
        <span className="eyebrow">Moments Corvus remembers</span>
        <ol className="moment-list mt-3 max-h-[70vh] list-none space-y-1 overflow-y-auto p-0 pr-1">
          {moments.map((m, i) => (
            <li key={m.startSeconds} id={`moment-${m.startSeconds}`}>
              <button onClick={() => setStart(m.startSeconds)} aria-current={i === current ? "true" : undefined}>
                <span>{secondsToClock(m.startSeconds)}</span>
                {m.spokenSummary}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
