/** Small shared UI pieces: source icons, badges, date formatting, links. Server- and client-safe. */
import { FileText, Search, Video } from "lucide-react";
import type { SourceKind } from "@/lib/ai/schemas";
import type { MemoryView } from "@/lib/db/store";
import { parseYouTubeId } from "@/lib/youtube";

export const SOURCE_LABEL: Record<SourceKind, string> = {
  youtube: "YouTube",
  google_search: "Google Search",
  web: "Article",
};

const SOURCE_ICON = { youtube: Video, google_search: Search, web: FileText } as const;

export function SourceIcon({ source, size = 16, className }: { source: SourceKind; size?: number; className?: string }) {
  const Icon = SOURCE_ICON[source];
  return <Icon size={size} className={className} aria-hidden />;
}

const LANGUAGE_NAME: Record<string, string> = { en: "English", fil: "Filipino", tl: "Filipino" };

export function LanguageBadge({ language }: { language: string }) {
  const name = LANGUAGE_NAME[language] ?? language.toUpperCase();
  return (
    <span className="badge" title={`Language: ${name}`}>
      {name}
    </span>
  );
}

export function formatSeen(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(iso));
}

export function formatClockTime(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(iso));
}

/** Where "Open" goes: our own viewer for videos and articles, Google for searches. */
export function memoryHref(m: Pick<MemoryView, "id" | "source" | "deepLink">) {
  if (m.source === "youtube") return `/watch?m=${encodeURIComponent(m.id)}`;
  return m.deepLink;
}

export function videoIdOf(m: Partial<Pick<MemoryView, "contentId" | "deepLink">>) {
  if (m.contentId?.startsWith("yt_")) return m.contentId.slice(3);
  return m.deepLink ? parseYouTubeId(m.deepLink) : undefined;
}
