"use client";

import { ArrowRight, ExternalLink, PanelRightOpen, Play } from "lucide-react";
import Link from "next/link";
import type { SourceCard as SourceCardData } from "@/lib/agent/run";
import { secondsToClock } from "@/lib/time";
import { thumbnailUrl } from "@/lib/youtube";
import { useEvidence } from "./Evidence";
import { LanguageBadge, SOURCE_LABEL, SourceIcon, formatSeen, memoryHref, videoIdOf } from "./ui";

const TILE_CLASS = { youtube: "", google_search: "search", web: "web" } as const;

/** A cited memory: thumbnail or source icon, what it says, and actions to open it or inspect the evidence. */
export function SourceCard({ memory, index, claim }: { memory: SourceCardData; index?: number; claim?: string }) {
  const { openEvidence } = useEvidence();
  const isMoment = memory.memoryType === "video_moment" && memory.startSeconds !== undefined;
  const href = memoryHref(memory);
  const external = href.startsWith("http");
  const action = isMoment ? `Open at ${secondsToClock(memory.startSeconds!)}` : memory.source === "google_search" ? "Search again" : "Open";
  const videoId = memory.source === "youtube" ? videoIdOf(memory) : undefined;

  return (
    <article className="source-card">
      {videoId ? (
        <Link
          href={href}
          className="source-thumb"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(9,8,13,.05), rgba(9,8,13,.32)), url(${thumbnailUrl(videoId)})` }}
          aria-label={action}
        >
          <span className="play-orb">
            <Play size={16} fill="currentColor" />
          </span>
          {isMoment && <span className="time">{secondsToClock(memory.startSeconds!)}</span>}
        </Link>
      ) : (
        <span className={`source-icon-tile ${TILE_CLASS[memory.source]}`} aria-hidden>
          <SourceIcon source={memory.source} size={21} />
        </span>
      )}
      <div className="source-body">
        <div className="source-meta">
          {index !== undefined && <span className="cite-num">{index + 1}</span>}
          <span>{SOURCE_LABEL[memory.source]}</span>
          <span aria-hidden>·</span>
          <span>Seen {formatSeen(memory.occurredAt)}</span>
          <LanguageBadge language={memory.language} />
          {isMoment && <span className="badge accent">Video moment</span>}
          {memory.sourceMode === "demo_seed" && <span className="badge">Sample</span>}
        </div>
        <h3>{memory.title}</h3>
        {memory.excerpt && memory.excerpt !== memory.title && <p>{memory.excerpt}</p>}
        {memory.visualDescription && (
          <p className="on-screen">
            <b>On screen: </b>
            {memory.visualDescription}
          </p>
        )}
        <div className="source-actions">
          {external ? (
            <a href={href} target="_blank" rel="noreferrer" className="button compact">
              {action} <ExternalLink size={14} />
            </a>
          ) : (
            <Link href={href} className="button compact">
              {isMoment ? <Play size={14} fill="currentColor" /> : null} {action} {!isMoment && <ArrowRight size={14} />}
            </Link>
          )}
          <button className="button secondary compact" onClick={() => openEvidence({ ...memory, claim })}>
            <PanelRightOpen size={14} /> View evidence
          </button>
        </div>
      </div>
    </article>
  );
}
