/**
 * "For you now" (spec §8 Tier 1 item 4): inferred focus + context mode → suggestions with reasons.
 * Suggestions come from the user's own history (revisit what a repeated search was about) and from
 * the curated catalogue (things not watched yet). Context is chosen by the user, never detected.
 */
import { createHash } from "node:crypto";
import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { embedQuery } from "./ai/embed";
import { getAI } from "./ai/client";
import { geminiSchema } from "./ai/json";
import { getDb } from "./db/firestore";
import { listMemories, type MemoryView } from "./db/store";
import { getEnv } from "./env";
import { latestRecap } from "./recap";
import { searchMemories } from "./retrieval/search";
import { secondsToClock } from "./time";
import { thumbnailUrl, watchUrl } from "./youtube";
import type { CatalogItem } from "../scripts/seed/catalog";

export type Mode = "study" | "commute" | "rest";
export const MODES: Mode[] = ["study", "commute", "rest"];

export type Focus = {
  label: string;
  detail: string;
  confidence: "high" | "medium" | "low";
  evidence: Array<{ id: string; title: string }>;
  source: "inferred" | "user";
};

export type Suggestion = {
  id: string;
  type: "catalog" | "revisit" | "recap";
  kind: "lesson" | "podcast" | "music" | "moment" | "recap";
  title: string;
  channel?: string;
  durationSeconds?: number;
  language: string;
  href: string;
  external: boolean;
  thumbnail?: string;
  reasons: string[];
  score: number;
};

type CatalogEntry = CatalogItem & { embedding: number[] };

// ---------- catalogue ----------

let catalogCache: { at: number; items: CatalogEntry[] } | undefined;

async function getCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < 10 * 60_000) return catalogCache.items;
  const snap = await getDb().collection("catalog").get();
  const items = snap.docs.map((d) => d.data() as CatalogEntry);
  catalogCache = { at: Date.now(), items };
  return items;
}

const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

// ---------- focus ----------

const FocusAnswer = z.object({
  label: z.string(),
  detail: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceIds: z.array(z.string()),
});

const focusCache = new Map<string, { at: number; focus: Focus }>();

function recentActivity(memories: MemoryView[], days: number) {
  const since = Date.now() - days * 86_400_000;
  return memories.filter((m) => ["video", "search", "article"].includes(m.memoryType) && Date.parse(m.occurredAt) >= since);
}

/** What the user seems to be focused on lately. Always labelled inferred unless the user set it. */
export async function inferFocus(memories: MemoryView[], override?: string): Promise<Focus | undefined> {
  if (override) return { label: override, detail: "Set by you.", confidence: "high", evidence: [], source: "user" };
  let recent = recentActivity(memories, 14);
  if (recent.length < 3) recent = recentActivity(memories, 60);
  if (!recent.length) return undefined;
  recent = recent.slice(0, 60);

  // Same recent activity → same focus. Cached in memory and in Firestore so new instances reuse it.
  // Memory IDs carry their workspace, so the same activity gives the same key for every visitor (shared sample).
  const key = createHash("sha256").update(recent.map((m) => m.id).join(",")).digest("hex").slice(0, 32);
  const hit = focusCache.get(key);
  if (hit && Date.now() - hit.at < 60 * 60_000) return hit.focus;
  const stored = await getDb().collection("focus_cache").doc(key).get();
  if (stored.exists) {
    const focus = stored.data()!.focus as Focus;
    focusCache.set(key, { at: Date.now(), focus });
    return focus;
  }

  const list = recent.map((m) => `${m.id} | ${m.occurredAt.slice(0, 10)} | ${m.memoryType} | ${m.memoryType === "search" ? m.excerpt : m.title}`);
  const request = () =>
    getAI().models.generateContent({
      model: getEnv().GEMINI_MODEL,
      contents: `Here is a person's recent activity (id | date | type | title or search query):\n${list.join("\n")}\n\nWhat are they mainly focused on learning or doing lately? Give a short label (max 6 words, English), one sentence of detail, your confidence, and up to 5 ids that best show it. Only infer from what is listed; do not guess sensitive traits.`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(FocusAnswer),
        temperature: 0.2,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: AbortSignal.timeout(10_000),
      },
    });
  // The model occasionally stalls; one fresh attempt usually returns in a few seconds.
  const res = await request().catch(() => request());
  const answer = FocusAnswer.parse(JSON.parse(res.text ?? ""));
  const byId = new Map(recent.map((m) => [m.id, m]));
  const focus: Focus = {
    label: answer.label,
    detail: answer.detail,
    confidence: answer.confidence,
    evidence: answer.evidenceIds
      .map((id) => byId.get(id))
      .filter((m): m is MemoryView => Boolean(m))
      .map((m) => ({ id: m.id, title: m.memoryType === "search" ? `Searched “${m.excerpt}”` : m.title })),
    source: "inferred",
  };
  focusCache.set(key, { at: Date.now(), focus });
  await getDb().collection("focus_cache").doc(key).set({ focus, createdAt: new Date().toISOString() });
  return focus;
}

// ---------- suggestions ----------

const FIT: Record<Mode, Record<CatalogItem["kind"] | "moment", number>> = {
  study: { lesson: 1, moment: 1, podcast: 0.3, music: 0.25 },
  commute: { podcast: 1, music: 0.6, lesson: 0.35, moment: 0.4 },
  rest: { music: 1, podcast: 0.45, lesson: 0.05, moment: 0 },
};

const GENERIC_TERMS = new Set(["python", "programming", "tutorial", "beginners", "beginner", "basics", "concepts", "learning", "advice", "review", "news", "music", "focus"]);

const minutes = (s: number) => (s ? `${Math.max(1, Math.round(s / 60))} min` : "Live");

function catalogReasons(item: CatalogEntry, mode: Mode, focus: Focus | undefined, similarity: number, recentTerms: Set<string>, fil: boolean) {
  const reasons: string[] = [];
  const overlap = item.topics.filter((t) => t !== "python" && recentTerms.has(t.toLowerCase()));
  if (item.kind !== "music" && focus && similarity > 0.5) {
    reasons.push(
      overlap.length
        ? `Builds on ${overlap.slice(0, 2).join(" and ")}, which you’ve been looking at`
        : `Fits your focus: ${focus.label}${focus.source === "inferred" ? " (inferred)" : ""}`,
    );
  }
  if (mode === "commute" && item.kind === "podcast") reasons.push("Audio-friendly — you can listen without watching");
  if (mode === "commute" && item.kind === "lesson" && item.durationSeconds <= 12 * 60) reasons.push(`${minutes(item.durationSeconds)} — fits a commute`);
  if (mode === "study" && item.kind === "lesson") reasons.push(`${minutes(item.durationSeconds)} lesson`);
  if (mode === "study" && item.kind === "music") reasons.push("Focus music while you practise");
  if (mode === "rest" && item.kind === "music") reasons.push("Something calm to wind down");
  if (item.language === "fil" && fil) reasons.push("In Filipino, like other tutorials you watched");
  reasons.push("You haven’t watched this yet");
  return reasons;
}

export async function suggestions(opts: {
  workspaceIds: string[];
  hidden: Set<string>;
  mode: Mode;
  focus?: Focus;
  memories: MemoryView[];
  limit?: number;
}): Promise<Suggestion[]> {
  const { workspaceIds, hidden, mode, focus, memories, limit = 5 } = opts;
  const out: Suggestion[] = [];

  // 0. Commute: a spoken recap of recent activity is the best fit for listening on the go.
  if (mode === "commute") {
    const recap = await latestRecap(workspaceIds).catch(() => undefined);
    const fresh = recap && Date.now() - Date.parse(recap.createdAt) < 7 * 86_400_000;
    out.push(
      fresh
        ? {
            id: `recap:${recap.id}`,
            type: "recap",
            kind: "recap",
            title: recap.title,
            durationSeconds: recap.durationSeconds,
            language: recap.language,
            href: `/recap?id=${recap.id}`,
            external: false,
            reasons: [
              "Made from your own recent activity",
              `${Math.max(1, Math.round(recap.durationSeconds / 60))}-minute listen — fits a commute`,
              "Each chapter links back to the video moment or article it came from",
            ],
            score: 2,
          }
        : {
            id: "recap:new",
            type: "recap",
            kind: "recap",
            title: "Make a 2-minute recap of your week",
            language: "en",
            href: "/recap",
            external: false,
            reasons: ["Turns your week of watching and searching into a short listen", "Fits a commute"],
            score: 2,
          },
    );
  }

  // 1. Revisit: a search repeated in the last 30 days points to the moment that answers it.
  if (mode !== "rest") {
    const counts = new Map<string, { query: string; times: number }>();
    for (const m of recentActivity(memories, 30).filter((m) => m.memoryType === "search")) {
      const key = m.excerpt.trim().toLowerCase();
      counts.set(key, { query: m.excerpt.trim(), times: (counts.get(key)?.times ?? 0) + 1 });
    }
    const repeated = [...counts.values()].filter((c) => c.times >= 2).sort((a, b) => b.times - a.times).slice(0, 2);
    for (const { query, times } of repeated) {
      const { results } = await searchMemories({ workspaceIds, hidden, query, limit: 3, sources: ["youtube"] });
      const moment = results.find((r) => r.memory.memoryType === "video_moment")?.memory;
      if (!moment) continue;
      out.push({
        id: `revisit:${moment.id}`,
        type: "revisit",
        kind: "moment",
        title: moment.title,
        language: moment.language,
        href: `/watch?m=${encodeURIComponent(moment.id)}`,
        external: false,
        thumbnail: moment.contentId ? thumbnailUrl(moment.contentId.replace(/^yt_/, "")) : undefined,
        reasons: [
          `You searched “${query}” ${times} times — this looks like a sticking point`,
          `This moment at ${secondsToClock(moment.startSeconds ?? 0)} explains it`,
        ],
        score: (mode === "study" ? 1.1 : 0.6) + times * 0.02,
      });
    }
  }

  // 2. Catalogue items not watched yet, by similarity to the focus and fit for the mode.
  const catalog = await getCatalog();
  const watched = new Set(memories.filter((m) => m.memoryType === "video").map((m) => m.contentId?.replace(/^yt_/, "")));
  const focusText = focus ? `${focus.label}. ${focus.detail}` : memories.slice(0, 10).map((m) => m.title).join("; ");
  const focusVec = focusText ? await embedQuery(focusText) : undefined;
  // Topics of what they watched/read plus words they searched for — not generic words from summaries.
  const recentTerms = new Set(
    recentActivity(memories, 30)
      .flatMap((m) => (m.memoryType === "search" ? m.excerpt.split(/\s+/) : m.topics))
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 2 && !GENERIC_TERMS.has(t)),
  );
  const filShare = memories.filter((m) => m.language === "fil").length / Math.max(1, memories.length);
  const fil = filShare >= 0.05;

  const ranked = catalog
    .filter((item) => !watched.has(item.videoId))
    .map((item) => {
      const similarity = focusVec ? cosine(focusVec, item.embedding) : 0.5;
      const fit = FIT[mode][item.kind];
      const score =
        item.kind === "music" ? fit * 0.9 : 0.55 * similarity + 0.45 * fit + (item.language === "fil" && fil && mode === "study" ? 0.05 : 0);
      return { item, similarity, fit, score };
    })
    .filter((r) => r.fit > 0.1)
    .sort((a, b) => b.score - a.score);

  // At most one music item unless the user is resting.
  let music = 0;
  for (const r of ranked) {
    if (r.item.kind === "music" && mode !== "rest" && music++ >= 1) continue;
    out.push({
      id: `catalog:${r.item.videoId}`,
      type: "catalog",
      kind: r.item.kind,
      title: r.item.title,
      channel: r.item.channel,
      durationSeconds: r.item.durationSeconds,
      language: r.item.language,
      href: watchUrl(r.item.videoId),
      external: true,
      thumbnail: thumbnailUrl(r.item.videoId),
      reasons: catalogReasons(r.item, mode, focus, r.similarity, recentTerms, fil),
      score: r.score,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function loadMemories(workspaceIds: string[], hidden: Set<string>) {
  return (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id));
}
