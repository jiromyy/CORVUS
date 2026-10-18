/**
 * Explore mode: goes beyond the user's memory. Gemini answers with Google Search grounding, starting from
 * the memories most related to the question (e.g. "find more readings like the article I read"), and
 * cites the public pages it used. Memory sources and web sources are kept apart in the result.
 */
import { getAI } from "../ai/client";
import { getEnv } from "../env";
import { searchMemories } from "../retrieval/search";
import { card, type AskResult } from "./run";

export async function exploreWeb(question: string, workspaceIds: string[], hidden: Set<string>): Promise<AskResult> {
  const t0 = Date.now();
  const { results } = await searchMemories({ workspaceIds, hidden, query: question, limit: 4 }).catch(() => ({ results: [] }));
  const memories = results.map((r) => r.memory);
  const t1 = Date.now();

  const context = memories.length
    ? memories.map((m, i) => `${i + 1}. ${m.memoryType === "search" ? `searched "${m.excerpt}"` : `${m.title} — ${m.excerpt}`}`).join("\n")
    : "(no related memories)";
  const res = await getAI().models.generateContent({
    model: getEnv().GEMINI_MODEL,
    contents: `The user's question: ${question}\n\nRelated things they watched, searched, or read before:\n${context}`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are Corvus in Explore mode. Help the user go beyond what they already saw: use Google Search to find relevant, reputable public sources (documentation, articles, papers, reviews of related literature) and briefly say what each offers.
Connect your answer to their related memories when they are relevant, by name. Reply in the language of the question. Keep it under 170 words, plain text with short lines, no markdown headings. Do not invent sources.`,
      temperature: 0.4,
      abortSignal: AbortSignal.timeout(30_000),
    },
  });

  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const webSources = chunks
    .map((c) => c.web)
    .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
    .map((w) => ({ title: w.title ?? w.uri, url: w.uri, domain: (w.title ?? "").includes(".") ? w.title! : new URL(w.uri).hostname }))
    .filter((w) => !seen.has(w.url) && seen.add(w.url))
    .slice(0, 6);
  const queries = res.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];

  return {
    answer: (res.text ?? "").replace(/\*\*/g, "").trim() || "I couldn’t find public sources for that. Try rephrasing.",
    confidence: webSources.length ? "medium" : "low",
    citations: [],
    sources: memories.map(card),
    suggestedFollowUps: [],
    trace: [
      { tool: "search_memories", input: question, resultCount: memories.length, ms: t1 - t0 },
      ...queries.slice(0, 3).map((q) => ({ tool: "google_search", input: q, resultCount: webSources.length, ms: Date.now() - t1 })),
    ],
    mode: "explore",
    rejectedCitations: 0,
    webSources,
  };
}
