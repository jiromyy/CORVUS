/**
 * Starter questions for the Ask page, written from the visitor's most recent memories so they point at
 * things Corvus can actually answer. Deterministic (no model call), so they appear instantly.
 */
import type { MemoryView } from "./db/store";

export type PromptKind = "search" | "video" | "article" | "filipino" | "summary" | "explore";
export type Prompt = { text: string; kind: PromptKind; explore?: boolean };

type Item = Pick<MemoryView, "memoryType" | "title" | "excerpt" | "occurredAt" | "language">;

/** "Python Tutorial for Beginners - Learn the basics in 20 Min" → "Python Tutorial for Beginners". */
export function shortTitle(title: string, max = 48) {
  const head = (title.split(/\s[-–—|]\s/)[0].replace(/\s*\([^)]*\)\s*$/, "").trim() || title).trim();
  if (head.length <= max) return head;
  const cut = head.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max / 2 ? cut.lastIndexOf(" ") : cut.length).trimEnd()}…`;
}

const clip = (s: string, max = 60) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export function suggestPrompts(memories: Item[], limit = 4): Prompt[] {
  const recent = memories
    .filter((m) => ["video", "search", "article"].includes(m.memoryType))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  if (!recent.length) return [];

  const out: Prompt[] = [];
  const add = (p: Prompt | undefined) => p && !out.some((o) => o.text === p.text) && out.push(p);

  // A search made more than once is a question that may still be open; otherwise the latest search.
  const searches = recent.filter((m) => m.memoryType === "search");
  const counts = new Map<string, number>();
  searches.forEach((s) => counts.set(s.excerpt.toLowerCase(), (counts.get(s.excerpt.toLowerCase()) ?? 0) + 1));
  const search = searches.find((s) => (counts.get(s.excerpt.toLowerCase()) ?? 0) > 1) ?? searches[0];
  if (search) add({ kind: "search", text: `Where did I find the answer to “${clip(search.excerpt)}”?` });

  const video = recent.find((m) => m.memoryType === "video");
  if (video) add({ kind: "video", text: `What were the key moments in “${shortTitle(video.title)}”?` });

  // Filipino content gets a Filipino question, showing cross-language recall.
  const filipino = recent.find((m) => (m.language === "fil" || m.language === "tl") && m.memoryType !== "search");
  if (filipino) add({ kind: "filipino", text: `Ano ang natutunan ko sa “${shortTitle(filipino.title)}”?` });

  // Explore mode goes beyond memory: more readings like the latest article (or video).
  const articles = recent.filter((m) => m.memoryType === "article");
  const article = articles.find((m) => m !== filipino) ?? articles[0];
  if (article) add({ kind: "explore", explore: true, text: `Find more readings related to “${shortTitle(article.title)}”` });
  else if (video) add({ kind: "explore", explore: true, text: `Find more resources like “${shortTitle(video.title)}”` });
  add({ kind: "summary", text: "Give me a summary of my most recent week of activity" });

  return out.slice(0, limit);
}
