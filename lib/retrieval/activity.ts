/**
 * Activity overview for a time range ("summarise my week"). Groups whole videos, searches,
 * and articles (not individual moments) so the agent can summarise and cite them.
 */
import { listMemories, type MemoryView } from "../db/store";

export type ActivityItem = { id: string; title: string; date: string; source: MemoryView["source"]; language: string };

export type ActivityOverview = {
  from?: string;
  to?: string;
  counts: { videosWatched: number; searches: number; articlesRead: number };
  videos: ActivityItem[];
  searches: ActivityItem[];
  articles: ActivityItem[];
  frequentTopics: string[];
  repeatedSearches: Array<{ query: string; times: number }>;
};

const inRange = (m: Pick<MemoryView, "occurredAt">, from?: string, to?: string) =>
  (!from || Date.parse(m.occurredAt) >= Date.parse(from)) && (!to || Date.parse(m.occurredAt) <= Date.parse(to));

const item = (m: MemoryView): ActivityItem => ({
  id: m.id,
  title: m.memoryType === "search" ? m.excerpt : m.title,
  date: m.occurredAt.slice(0, 10),
  source: m.source,
  language: m.language,
});

export async function activityOverview(
  workspaceIds: string[],
  hidden: Set<string>,
  from?: string,
  to?: string,
  maxPerGroup = 30,
): Promise<{ overview: ActivityOverview; memories: MemoryView[] }> {
  const memories = (await listMemories(workspaceIds)).filter(
    (m) => !hidden.has(m.id) && inRange(m, from, to) && ["video", "search", "article"].includes(m.memoryType),
  );
  const chronological = [...memories].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const videos = chronological.filter((m) => m.memoryType === "video");
  const searches = chronological.filter((m) => m.memoryType === "search");
  const articles = chronological.filter((m) => m.memoryType === "article");

  const topicCounts = new Map<string, number>();
  for (const m of [...videos, ...articles]) {
    for (const t of m.topics) topicCounts.set(t.toLowerCase(), (topicCounts.get(t.toLowerCase()) ?? 0) + 1);
  }
  const queryCounts = new Map<string, number>();
  for (const s of searches) {
    const q = s.excerpt.trim().toLowerCase();
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
  }

  const shown = [...videos.slice(-maxPerGroup), ...searches.slice(-maxPerGroup), ...articles.slice(-maxPerGroup)];
  const overview: ActivityOverview = {
    from,
    to,
    counts: { videosWatched: videos.length, searches: searches.length, articlesRead: articles.length },
    videos: videos.slice(-maxPerGroup).map(item),
    searches: searches.slice(-maxPerGroup).map(item),
    articles: articles.slice(-maxPerGroup).map(item),
    frequentTopics: [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t),
    repeatedSearches: [...queryCounts.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([query, times]) => ({ query, times })),
  };
  return { overview, memories: shown };
}
