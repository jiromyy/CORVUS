/**
 * Interest threads: activities (videos, searches, pages) connected by a shared topic. Grouping is
 * deterministic and inspectable; Gemini only writes the short "why these connect" explanation, from the
 * thread's own items, and it is cached per thread contents.
 */
import { z } from "zod";
import { getAI } from "./ai/client";
import { geminiSchema } from "./ai/json";
import type { MemoryView } from "./db/store";
import { getEnv } from "./env";

type Item = Pick<MemoryView, "id" | "memoryType" | "title" | "excerpt" | "occurredAt" | "topics" | "source">;

export type ThreadSummary = {
  id: string;
  topic: string;
  count: number;
  counts: { videos: number; searches: number; pages: number };
  firstSeen: string;
  latest: string;
};

const WHOLE = ["video", "search", "article"];
export const threadId = (topic: string) => topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** An activity belongs to a topic when it is labelled with it, or (for searches, which carry no labels) its query mentions it. */
function inTopic(m: Item, topic: string) {
  if (m.topics.some((t) => t.toLowerCase().trim() === topic)) return true;
  if (m.memoryType !== "search") return false;
  const escaped = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(m.excerpt);
}

/** Topics shared by at least two activities, strongest first. */
export function computeThreads(memories: Item[], min = 2): ThreadSummary[] {
  const whole = memories.filter((m) => WHOLE.includes(m.memoryType));
  const topics = new Set(whole.flatMap((m) => m.topics.map((t) => t.toLowerCase().trim())).filter(Boolean));
  const byTopic = new Map([...topics].map((t) => [t, whole.filter((m) => inTopic(m, t))] as const));
  return [...byTopic.entries()]
    .filter(([, items]) => items.length >= min)
    .map(([topic, items]) => {
      const dates = items.map((m) => m.occurredAt).sort();
      return {
        id: threadId(topic),
        topic,
        count: items.length,
        counts: {
          videos: items.filter((m) => m.memoryType === "video").length,
          searches: items.filter((m) => m.memoryType === "search").length,
          pages: items.filter((m) => m.memoryType === "article").length,
        },
        firstSeen: dates[0],
        latest: dates.at(-1)!,
      };
    })
    // More activities first; then threads mixing formats; then the most recent.
    .sort(
      (a, b) =>
        b.count - a.count ||
        Object.values(b.counts).filter(Boolean).length - Object.values(a.counts).filter(Boolean).length ||
        b.latest.localeCompare(a.latest),
    );
}

/** The activities and video moments in one thread. */
export function threadItems<T extends Item>(memories: T[], id: string) {
  const topic = memories.flatMap((m) => m.topics).find((t) => threadId(t) === id)?.toLowerCase().trim() ?? id;
  const items = memories.filter((m) => WHOLE.includes(m.memoryType) && inTopic(m, topic)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const moments = memories.filter((m) => m.memoryType === "video_moment" && inTopic(m, topic));
  return { items, moments };
}

const Explanation = z.object({
  title: z.string().describe("A short, specific name for this learning thread, max 7 words"),
  why: z.string().describe("2 sentences on how these activities connect and progress, addressed to 'you'"),
  bridge: z.string().describe("The single activity that best links the others, by its title"),
});
export type Explanation = z.infer<typeof Explanation>;

const cache = new Map<string, Explanation>();

/** Gemini's explanation of a thread, grounded only in the listed activities. Falls back to a plain description. */
export async function explainThread(topic: string, items: Item[]): Promise<Explanation & { generated: boolean }> {
  const key = `${topic}|${items.map((m) => m.id).join(",")}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, generated: true };
  const fallback = {
    title: topic.replace(/\b\w/g, (c) => c.toUpperCase()),
    why: `These ${items.length} activities all touch on ${topic}, from ${items[0]?.occurredAt.slice(0, 10)} to ${items.at(-1)?.occurredAt.slice(0, 10)}.`,
    bridge: items.find((m) => m.memoryType === "video")?.title ?? items[0]?.title ?? "",
    generated: false,
  };
  try {
    const lines = items.map((m) => `${m.occurredAt.slice(0, 10)} | ${m.memoryType} | ${m.memoryType === "search" ? `searched "${m.excerpt}"` : m.title}`);
    const res = await getAI().models.generateContent({
      model: getEnv().GEMINI_MODEL,
      contents: `Topic: ${topic}\nActivities (date | type | details):\n${lines.join("\n")}`,
      config: {
        systemInstruction:
          "You explain why a person's activities form one learning thread. Use only the activities listed; never invent videos, searches, or facts. Plain sentences, no markdown, no emojis. Describe the progression, not a permanent trait.",
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(Explanation),
        temperature: 0.4,
        abortSignal: AbortSignal.timeout(15_000),
      },
    });
    const parsed = Explanation.parse(JSON.parse(res.text ?? ""));
    if (cache.size > 200) cache.clear();
    cache.set(key, parsed);
    return { ...parsed, generated: true };
  } catch {
    return fallback;
  }
}
