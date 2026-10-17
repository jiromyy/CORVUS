import Link from "next/link";
import type { SourceCard as SourceCardData } from "@/lib/agent/run";
import { secondsToClock } from "@/lib/time";
import { LanguageBadge, SOURCE_LABEL, SourceIcon, formatSeen } from "./ui";

/** Where "Open" goes: our own viewer for videos and articles, Google for searches. */
export function openHref(m: Pick<SourceCardData, "id" | "source" | "deepLink" | "memoryType">) {
  if (m.source === "youtube") return `/watch?m=${encodeURIComponent(m.id)}`;
  return m.deepLink;
}

export function SourceCard({ memory, index }: { memory: SourceCardData; index?: number }) {
  const isMoment = memory.memoryType === "video_moment" && memory.startSeconds !== undefined;
  const href = openHref(memory);
  const external = href.startsWith("http");
  const action = isMoment ? `Open at ${secondsToClock(memory.startSeconds!)}` : memory.source === "google_search" ? "Search again" : "Open";

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        {index !== undefined && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
            {index + 1}
          </span>
        )}
        <SourceIcon source={memory.source} />
        <span>{SOURCE_LABEL[memory.source]}</span>
        <span aria-hidden>·</span>
        <span>Seen {formatSeen(memory.occurredAt)}</span>
        <LanguageBadge language={memory.language} />
        {memory.sourceMode === "demo_seed" && <span className="ml-auto">Sample</span>}
      </div>
      <h3 className="mt-2 font-medium leading-snug">{memory.title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{memory.excerpt}</p>
      {memory.visualDescription && (
        <p className="mt-2 text-sm">
          <span className="font-medium">On screen: </span>
          <span className="text-[var(--muted)]">{memory.visualDescription}</span>
        </p>
      )}
      <div className="mt-3">
        {external ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {action} ↗
          </a>
        ) : (
          <Link href={href} className="text-sm font-medium text-[var(--accent)] hover:underline">
            {action} →
          </Link>
        )}
      </div>
    </article>
  );
}
