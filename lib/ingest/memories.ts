/**
 * Turns content + activity events into memory records (spec §14.1).
 * Builders return records without embeddings; `withEmbeddings` adds them in one batch.
 */
import { createHash } from "node:crypto";
import { embedTexts } from "../ai/embed";
import { getEnv } from "../env";
import type { ActivityEvent, ContentItem, MemoryRecord } from "../ai/schemas";
import { secondsToClock } from "../time";
import { watchAtUrl } from "../youtube";

export type DraftMemory = Omit<MemoryRecord, "embedding" | "embeddingModel">;

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const provenance = (observed: string[], extracted: string[], inferred: string[] = []) => ({
  observed,
  extracted,
  inferred,
});

const base = (event: ActivityEvent) => ({
  workspaceId: event.workspaceId,
  sourceMode: event.sourceMode,
  sourceEventIds: [event.id],
  occurredAt: event.occurredAt,
  threadIds: [] as string[],
  active: true,
});

/** One memory for the video plus one per analysed moment. */
export function videoMemories(content: ContentItem, event: ActivityEvent): DraftMemory[] {
  const videoId = content.id.replace(/^yt_/, "");
  const language = content.language ?? "en";
  const video: DraftMemory = {
    ...base(event),
    id: `${event.workspaceId}__${content.id}`,
    memoryType: "video",
    source: "youtube",
    contentId: content.id,
    title: content.title,
    text: [content.title, content.creator, content.summary, content.topics.join(", ")].filter(Boolean).join("\n"),
    excerpt: content.summary ?? content.title,
    deepLink: watchAtUrl(videoId, 0),
    startSeconds: 0,
    language,
    topics: content.topics,
    provenance: provenance(["watched", "occurredAt"], ["title", "summary", "topics"]),
  };
  const moments = (content.moments ?? []).map((m, i): DraftMemory => ({
    ...base(event),
    id: `${event.workspaceId}__${content.id}__m${String(i).padStart(3, "0")}`,
    memoryType: "video_moment",
    source: "youtube",
    contentId: content.id,
    title: `${content.title} — ${secondsToClock(m.startSeconds)}`,
    text: [
      content.title,
      `At ${secondsToClock(m.startSeconds)}: ${m.spokenSummary}`,
      `Shown on screen: ${m.visualDescription}`,
      `Key terms: ${m.keyTerms.join(", ")}`,
    ].join("\n"),
    excerpt: m.spokenSummary,
    visualDescription: m.visualDescription,
    deepLink: watchAtUrl(videoId, m.startSeconds),
    startSeconds: m.startSeconds,
    endSeconds: m.endSeconds,
    language,
    topics: m.keyTerms.slice(0, 8),
    provenance: provenance(["watched", "occurredAt"], ["spokenSummary", "visualDescription", "keyTerms", "startSeconds"]),
  }));
  return [video, ...moments];
}

export function searchMemory(event: ActivityEvent, language = "en"): DraftMemory {
  const query = event.payload.query ?? "";
  return {
    ...base(event),
    id: `${event.workspaceId}__search__${hash(query + event.occurredAt)}`,
    memoryType: "search",
    source: "google_search",
    title: `Searched: ${query}`,
    text: `Google search query: ${query}`,
    excerpt: query,
    deepLink: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    language,
    topics: [],
    provenance: provenance(["query", "occurredAt"], []),
  };
}

/** One memory for the article plus one per chunk, linked as /read?c=<id>#chunk-<n>. */
export function articleMemories(content: ContentItem, event: ActivityEvent): DraftMemory[] {
  const language = content.language ?? "en";
  const link = (n?: number) => `/read?c=${encodeURIComponent(content.id)}${n === undefined ? "" : `#chunk-${n}`}`;
  const article: DraftMemory = {
    ...base(event),
    id: `${event.workspaceId}__${content.id}`,
    memoryType: "article",
    source: "web",
    contentId: content.id,
    title: content.title,
    text: [content.title, content.creator, content.summary].filter(Boolean).join("\n"),
    excerpt: content.summary ?? content.title,
    deepLink: link(),
    language,
    topics: content.topics,
    provenance: provenance(["read", "occurredAt"], ["title", "summary"]),
  };
  const passages = (content.bodyChunks ?? []).map((chunk, n): DraftMemory => ({
    ...base(event),
    id: `${event.workspaceId}__${content.id}__c${String(n).padStart(3, "0")}`,
    memoryType: "article_passage",
    source: "web",
    contentId: content.id,
    title: chunk.heading ? `${content.title} — ${chunk.heading}` : content.title,
    text: [content.title, chunk.heading, chunk.text].filter(Boolean).join("\n"),
    excerpt: chunk.text.length > 280 ? `${chunk.text.slice(0, 277)}…` : chunk.text,
    deepLink: link(n),
    language,
    topics: content.topics,
    provenance: provenance(["read", "occurredAt"], ["passage"]),
  }));
  return [article, ...passages];
}

export async function withEmbeddings(drafts: DraftMemory[]): Promise<MemoryRecord[]> {
  const vectors = await embedTexts(drafts.map((d) => d.text), "RETRIEVAL_DOCUMENT");
  const model = getEnv().EMBEDDING_MODEL;
  return drafts.map((d, i) => ({ ...d, embedding: vectors[i], embeddingModel: model }));
}
