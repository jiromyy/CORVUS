/**
 * Media-intake insights computed from the visitor's own memories: what topics, when, which languages,
 * and what keeps coming back. Everything is counted from observed activity; the only inference is the
 * peak-time pattern, which is labelled as such in the UI.
 */
import type { MemoryView } from "./db/store";

export type Range = "7d" | "30d" | "all";
export const RANGES: Range[] = ["7d", "30d", "all"];
const RANGE_DAYS: Record<Range, number | undefined> = { "7d": 7, "30d": 30, all: undefined };

/** A new session starts after this much quiet time. */
const SESSION_GAP_MS = 45 * 60_000;
/** Time-of-day buckets (Asia/Manila), three hours each. */
const BUCKETS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"] as const;
const TOP_TOPICS = 6;

type Activity = Pick<MemoryView, "id" | "memoryType" | "source" | "title" | "excerpt" | "occurredAt" | "language" | "topics" | "sourceEventIds" | "sourceMode">;

export type Insights = {
  range: Range;
  total: number;
  counts: { videos: number; searches: number; articles: number };
  activeDays: number;
  sessions: number;
  longestSessionMinutes: number;
  revisited: number;
  languages: Array<{ language: string; count: number }>;
  topics: Array<{ label: string; count: number; share: number }>;
  rhythm: Array<{ label: (typeof BUCKETS)[number]; count: number }>;
  peak?: { label: string; count: number; days: number };
  repeatedSearches: Array<{ query: string; times: number }>;
  latest?: string;
};

const manilaHour = (iso: string) =>
  Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date(iso))) % 24;
const manilaDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(iso));

/** Whole activities only (a video, a search, a page), not the moments and passages derived from them. */
export function computeInsights(memories: Activity[], range: Range, now = Date.now()): Insights {
  const days = RANGE_DAYS[range];
  const since = days ? now - days * 86_400_000 : -Infinity;
  const items = memories
    .filter((m) => ["video", "search", "article"].includes(m.memoryType) && Date.parse(m.occurredAt) >= since)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const count = <K extends string>(keys: K[]) => {
    const map = new Map<K, number>();
    keys.forEach((k) => map.set(k, (map.get(k) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  // Sessions: runs of activity without a long gap.
  let sessions = 0;
  let longest = 0;
  let start = 0;
  let prev = 0;
  for (const m of items) {
    const t = Date.parse(m.occurredAt);
    if (!sessions || t - prev > SESSION_GAP_MS) {
      sessions++;
      start = t;
    }
    longest = Math.max(longest, t - start);
    prev = t;
  }

  // Topic labels are fine-grained, so report the ones that recur, as a share of activities that mention them.
  const top = count(items.flatMap((m) => [...new Set(m.topics.map((t) => t.toLowerCase()))]))
    .filter(([, c]) => c > 1)
    .slice(0, TOP_TOPICS)
    .map(([label, c]) => ({ label, count: c, share: c / (items.length || 1) }));

  const rhythm = BUCKETS.map((label) => ({ label, count: 0 }));
  const peakDays = BUCKETS.map(() => new Set<string>());
  for (const m of items) {
    const b = Math.floor(manilaHour(m.occurredAt) / 3);
    rhythm[b].count++;
    peakDays[b].add(manilaDay(m.occurredAt));
  }
  const peakIndex = rhythm.reduce((best, r, i) => (r.count > rhythm[best].count ? i : best), 0);

  const searches = items.filter((m) => m.memoryType === "search");
  return {
    range,
    total: items.length,
    counts: {
      videos: items.filter((m) => m.memoryType === "video").length,
      searches: searches.length,
      articles: items.filter((m) => m.memoryType === "article").length,
    },
    activeDays: new Set(items.map((m) => manilaDay(m.occurredAt))).size,
    sessions,
    longestSessionMinutes: Math.round(longest / 60_000),
    revisited: items.filter((m) => m.sourceEventIds.length > 1).length,
    languages: count(items.map((m) => m.language)).map(([language, c]) => ({ language, count: c })),
    topics: top,
    rhythm,
    peak: items.length ? { label: rhythm[peakIndex].label, count: rhythm[peakIndex].count, days: peakDays[peakIndex].size } : undefined,
    repeatedSearches: count(searches.map((s) => s.excerpt.trim().toLowerCase()))
      .filter(([, n]) => n > 1)
      .map(([query, times]) => ({ query, times })),
    latest: items.at(-1)?.occurredAt,
  };
}
