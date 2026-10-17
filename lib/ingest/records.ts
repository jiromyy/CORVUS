/**
 * Turns minimal activity records (from Takeout import or the Chrome extension) into memories
 * in one workspace. Videos reuse any shared moment analysis that already exists.
 */
import { createHash } from "node:crypto";
import type { ActivityEvent, ContentItem, MemoryRecord, SourceMode } from "../ai/schemas";
import { getContent, saveContent, saveMemories } from "../db/store";
import { guessLanguage, type TakeoutRecord } from "../takeout";
import { thumbnailUrl, watchUrl, youtubeContentId } from "../youtube";
import { searchMemory, videoMemories, withEmbeddings, type DraftMemory } from "./memories";

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

function event(workspaceId: string, sourceMode: SourceMode, r: TakeoutRecord): ActivityEvent {
  const base = { workspaceId, sourceMode, occurredAt: r.time, id: `${workspaceId}__evt_${hash(`${r.kind}|${r.videoId ?? r.query ?? r.url}|${r.time}`)}` };
  if (r.kind === "searched") return { ...base, source: "google_search", action: "searched", payload: { query: r.query } };
  if (r.kind === "watched") return { ...base, source: "youtube", action: "watched", contentId: youtubeContentId(r.videoId!), payload: { url: r.url } };
  return { ...base, source: "web", action: "read", payload: { url: r.url } };
}

/** A page the user visited, remembered by title only (we do not fetch the page). */
function pageMemory(e: ActivityEvent, r: TakeoutRecord): DraftMemory {
  const host = r.url ? new URL(r.url).hostname.replace(/^www\./, "") : "";
  return {
    id: `${e.workspaceId}__page__${hash(r.url ?? r.title)}`,
    workspaceId: e.workspaceId,
    sourceMode: e.sourceMode,
    sourceEventIds: [e.id],
    occurredAt: e.occurredAt,
    threadIds: [],
    active: true,
    memoryType: "article",
    source: "web",
    title: r.title,
    text: `Web page: ${r.title}\n${host}`,
    excerpt: host,
    deepLink: r.url ?? "",
    language: guessLanguage(r.title),
    topics: [],
    provenance: { observed: ["visited", "url", "title", "occurredAt"], extracted: [], inferred: [] },
  };
}

async function videoContent(r: TakeoutRecord): Promise<ContentItem> {
  const id = youtubeContentId(r.videoId!);
  const existing = await getContent(id);
  if (existing) return existing;
  const content: ContentItem = {
    id,
    source: "youtube",
    title: r.title,
    url: watchUrl(r.videoId!),
    creator: r.channel,
    language: guessLanguage(r.title),
    topics: [],
    analysisStatus: "none",
    thumbnailUrl: thumbnailUrl(r.videoId!),
  };
  await saveContent(content);
  return content;
}

export async function ingestRecords(workspaceId: string, sourceMode: SourceMode, records: TakeoutRecord[]) {
  const drafts = new Map<string, DraftMemory>();
  const contents = new Map<string, Promise<ContentItem>>();

  // Records arrive oldest first, so a later watch of the same video overwrites the earlier one.
  for (const r of records) {
    const e = event(workspaceId, sourceMode, r);
    if (r.kind === "searched") {
      const m = searchMemory(e, guessLanguage(r.query ?? ""));
      drafts.set(m.id, m);
    } else if (r.kind === "watched" && r.videoId) {
      if (!contents.has(r.videoId)) contents.set(r.videoId, videoContent(r));
      const content = await contents.get(r.videoId)!;
      for (const m of videoMemories(content, e)) drafts.set(m.id, m);
    } else if (r.kind === "visited" && r.url) {
      const m = pageMemory(e, r);
      drafts.set(m.id, m);
    }
  }

  const memories: MemoryRecord[] = await withEmbeddings([...drafts.values()]);
  await saveMemories(memories);
  return {
    memories: memories.length,
    videos: [...contents.keys()],
    searches: records.filter((r) => r.kind === "searched").length,
    pages: records.filter((r) => r.kind === "visited").length,
  };
}
