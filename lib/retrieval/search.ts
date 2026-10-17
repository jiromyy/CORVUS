/**
 * Hybrid memory search (spec §14.3): vector candidates from Firestore plus keyword matches,
 * re-ranked by 0.7 × vector + 0.2 × keyword + 0.1 × recency. Falls back to keyword-only
 * when embeddings are unavailable.
 */
import { embedQuery } from "../ai/embed";
import type { SourceKind } from "../ai/schemas";
import { listMemories, vectorSearch, type MemoryView } from "../db/store";

export type SearchOptions = {
  workspaceIds: string[];
  hidden?: Set<string>;
  query: string;
  limit?: number;
  sources?: SourceKind[];
};

export type ScoredMemory = { memory: MemoryView; score: number; vector: number; keyword: number };

const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "was", "did", "i", "my", "me", "where", "what", "which", "how", "that", "this", "with", "about", "ang", "ng", "sa", "na", "ko", "mo", "yung", "saan", "ano"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_()]+/u)
    .map((t) => t.replace(/[()]/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Fraction of query terms found in the memory's title, excerpt, or text. */
export function keywordScore(query: string, memory: Pick<MemoryView, "title" | "excerpt" | "text">): number {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return 0;
  const haystack = `${memory.title} ${memory.excerpt} ${memory.text}`.toLowerCase();
  return terms.filter((t) => haystack.includes(t)).length / terms.length;
}

/** 1 for today, decaying to ~0 after 60 days. */
export function recencyScore(occurredAt: string, now = Date.now()): number {
  const days = (now - Date.parse(occurredAt)) / 86_400_000;
  return Math.max(0, 1 - days / 60);
}

export function rerank(
  candidates: Map<string, { memory: MemoryView; vector: number }>,
  query: string,
  now = Date.now(),
): ScoredMemory[] {
  return [...candidates.values()]
    .map(({ memory, vector }) => {
      const keyword = keywordScore(query, memory);
      const score = 0.7 * vector + 0.2 * keyword + 0.1 * recencyScore(memory.occurredAt, now);
      return { memory, vector, keyword, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Keeps at most `perContent` results from the same video or article so one source
 * cannot crowd out related memories from other apps.
 */
export function diversify(ranked: ScoredMemory[], limit: number, perContent = 2): ScoredMemory[] {
  const counts = new Map<string, number>();
  const out: ScoredMemory[] = [];
  for (const r of ranked) {
    const key = r.memory.contentId;
    if (key) {
      const n = counts.get(key) ?? 0;
      if (n >= perContent) continue;
      counts.set(key, n + 1);
    }
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}

export async function searchMemories(opts: SearchOptions): Promise<{ results: ScoredMemory[]; mode: "hybrid" | "keyword" }> {
  const { workspaceIds, hidden = new Set(), query, limit = 6, sources } = opts;
  const allowed = (m: MemoryView) => !hidden.has(m.id) && (!sources?.length || sources.includes(m.source));
  const candidates = new Map<string, { memory: MemoryView; vector: number }>();
  let mode: "hybrid" | "keyword" = "hybrid";

  try {
    const vector = await embedQuery(query);
    const hits = (await Promise.all(workspaceIds.map((ws) => vectorSearch(ws, vector, 20)))).flat();
    for (const { memory, distance } of hits) {
      // Cosine distance → similarity.
      if (allowed(memory)) candidates.set(memory.id, { memory, vector: 1 - distance });
    }
  } catch (err) {
    console.warn("vector search unavailable, keyword fallback:", err instanceof Error ? err.message : err);
    mode = "keyword";
  }

  // Keyword candidates catch exact names (error messages, function names) the vector search may rank low.
  const all = await listMemories(workspaceIds);
  for (const memory of all) {
    if (!allowed(memory) || candidates.has(memory.id)) continue;
    if (keywordScore(query, memory) >= 0.5) candidates.set(memory.id, { memory, vector: 0 });
  }

  return { results: diversify(rerank(candidates, query), limit), mode };
}
