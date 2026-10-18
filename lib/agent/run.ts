/**
 * Ask Corvus agent (spec §11 F2): a Gemini function-calling loop over the user's memories.
 * Every citation is checked against memories the tools actually returned this turn.
 */
import { FunctionCallingConfigMode, ThinkingLevel, type Content, type FunctionDeclaration, type GenerateContentResponse } from "@google/genai";
import { getAI } from "../ai/client";
import { geminiSchema } from "../ai/json";
import { AgentAnswer, SourceKind, validateCitations } from "../ai/schemas";
import { getMemory, type MemoryView } from "../db/store";
import { getEnv } from "../env";
import { dayRange, namedRanges } from "../dates";
import { activityOverview } from "../retrieval/activity";
import { searchMemories } from "../retrieval/search";
import { secondsToClock } from "../time";

/** Up to 3 rounds of tool calls, then a forced answer. */
const MAX_STEPS = 4;
/** Normal calls take 2–4 s; the model occasionally stalls, so give up early and retry once. */
const CALL_TIMEOUT_MS = 12_000;

export type TraceStep = { tool: string; input: string; resultCount: number; ms: number };

export type SourceCard = Pick<
  MemoryView,
  | "id" | "memoryType" | "source" | "title" | "excerpt" | "visualDescription" | "deepLink"
  | "startSeconds" | "endSeconds" | "language" | "occurredAt" | "contentId" | "sourceMode"
>;

export type AskResult = {
  answer: string;
  confidence: "high" | "medium" | "low";
  citations: Array<{ memoryId: string; supportingClaim: string }>;
  sources: SourceCard[];
  suggestedFollowUps: string[];
  trace: TraceStep[];
  mode: "agent" | "fallback" | "explore";
  /** Explore mode only: public web pages Gemini found with Google Search. */
  webSources?: Array<{ title: string; url: string; domain: string }>;
  rejectedCitations: number;
};

const tools: FunctionDeclaration[] = [
  {
    name: "search_memories",
    description:
      "Search the user's own memories (YouTube video moments they watched, Google searches, articles they read) by meaning and keywords. Works across languages.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for. Rephrase the user's question into a focused search." },
        sources: {
          type: "array",
          items: { type: "string", enum: SourceKind.options },
          description: "Optional filter: youtube, google_search, web.",
        },
        limit: { type: "integer", description: "Max results, default 6." },
        from: { type: "string", description: "Optional start day YYYY-MM-DD (inclusive) for questions about a time period." },
        to: { type: "string", description: "Optional end day YYYY-MM-DD (inclusive)." },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_activity",
    description:
      "Overview of everything the user watched, searched, and read in a date range: counts, titles with dates, frequent topics, repeated searches. Use for 'summarise my week', 'what did I do yesterday', 'what have I been learning'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start day YYYY-MM-DD (inclusive)." },
        to: { type: "string", description: "End day YYYY-MM-DD (inclusive)." },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_memory",
    description: "Get the full details of one memory by ID (from search results).",
    parametersJsonSchema: {
      type: "object",
      properties: { memoryId: { type: "string" } },
      required: ["memoryId"],
    },
  },
];

function systemInstruction() {
  const r = namedRanges();
  return `You are Corvus, a personal media-memory assistant.
Today is ${r.weekdayName}, ${r.today} (Asia/Manila). Yesterday: ${r.yesterday}. This week: ${r.thisWeek.from} to ${r.thisWeek.to}. Last week: ${r.lastWeek.from} to ${r.lastWeek.to}. Last 7 days: ${r.last7Days.from} to ${r.last7Days.to}. Last 30 days: ${r.last30Days.from} to ${r.last30Days.to}.
For questions about a time period, pass these exact days as from/to. For summaries of a period, call summarize_activity and cite the items you mention.
Use the tools to find evidence in the user's own memories before answering. Usually one search is enough; never search more than twice.
If the searches find nothing that answers the question, say plainly that you could not find it in their memories, mention the closest related memory if there is one, and set confidence to low.
Answer only from tool results. Every statement about what the user watched, searched, or read must cite memory IDs returned by tools in this conversation.
Never invent titles, URLs, timestamps, quotes, or events. When a video moment is relevant, mention its timestamp.
If relevant memories come from different places (for example a video moment and an article, or a search), mention and cite each of them, so the user can see where they met the idea.
Language: reply in the language the user's question is written in. An English question gets an English answer even when sources are in Filipino; a Filipino or Taglish question gets a Filipino answer even when sources are in English. Never switch language because of the sources.
Label anything inferred (for example a guessed goal) as inferred.
If evidence is weak, say so briefly and set confidence to low.
Keep answers to 2-4 sentences. Never write memory IDs in the answer text; put them only in the citations field.
Return JSON matching the provided schema.`;
}

/** Removes memory IDs the model sometimes writes inline, e.g. "[demo-maya__yt_x__m001]". */
export function stripInlineIds(text: string) {
  return text
    .replace(/\s*\[[^\]\s]*__[^\]]*\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

const brief = (m: MemoryView) => ({
  id: m.id,
  type: m.memoryType,
  source: m.source,
  title: m.title,
  seen: m.occurredAt.slice(0, 10),
  ...(m.startSeconds !== undefined && m.memoryType === "video_moment" ? { at: secondsToClock(m.startSeconds) } : {}),
  excerpt: m.excerpt,
  ...(m.visualDescription ? { shownOnScreen: m.visualDescription } : {}),
  language: m.language,
});

export const card = (m: MemoryView): SourceCard => ({
  id: m.id,
  memoryType: m.memoryType,
  source: m.source,
  title: m.title,
  excerpt: m.excerpt,
  visualDescription: m.visualDescription,
  deepLink: m.deepLink,
  startSeconds: m.startSeconds,
  endSeconds: m.endSeconds,
  language: m.language,
  occurredAt: m.occurredAt,
  contentId: m.contentId,
  sourceMode: m.sourceMode,
});

async function generate(contents: Content[], final: boolean): Promise<GenerateContentResponse> {
  const env = getEnv();
  const request = () =>
    getAI().models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction(),
        tools: [{ functionDeclarations: tools }],
        // On the final step tools are switched off, so the model must answer.
        ...(final ? { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } } } : {}),
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(AgentAnswer),
        temperature: 0.2,
        // Retrieval and citing need little reasoning; lower thinking cuts latency a lot.
        thinkingConfig: { thinkingLevel: (process.env.AGENT_THINKING_LEVEL as ThinkingLevel) || ThinkingLevel.LOW },
        abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      },
    });
  try {
    return await request();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("agent call failed, retrying once:", message);
    // Quota errors (429) clear quickly; back off briefly before the retry.
    if (/429|RESOURCE_EXHAUSTED/.test(message)) await new Promise((r) => setTimeout(r, 1500));
    return request();
  }
}

export async function askCorvus(question: string, workspaceIds: string[], hidden: Set<string>): Promise<AskResult> {
  const retrieved = new Map<string, MemoryView>();
  const trace: TraceStep[] = [];
  const history: Content[] = [{ role: "user", parts: [{ text: question }] }];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await generate(history, step === MAX_STEPS - 1);
      const calls = res.functionCalls ?? [];
      if (!calls.length) {
        const parsed = AgentAnswer.parse(JSON.parse(res.text ?? ""));
        const { answer, rejected } = validateCitations(parsed, new Set(retrieved.keys()));
        const citedIds = [...new Set(answer.citations.map((c) => c.memoryId))];
        return {
          answer: stripInlineIds(answer.answer),
          confidence: answer.citations.length ? answer.confidence : "low",
          citations: answer.citations,
          sources: citedIds.map((id) => card(retrieved.get(id)!)),
          suggestedFollowUps: answer.suggestedFollowUps.slice(0, 3),
          trace,
          mode: "agent",
          rejectedCitations: rejected.length,
        };
      }

      history.push(res.candidates![0].content!);
      const responses = await Promise.all(
        calls.map(async (call) => {
          const started = Date.now();
          const args = (call.args ?? {}) as Record<string, unknown>;
          let output: unknown;
          if (call.name === "search_memories") {
            const query = String(args.query ?? question);
            const range = dayRange(args.from, args.to);
            const { results } = await searchMemories({
              workspaceIds,
              hidden,
              query,
              from: range.from,
              to: range.to,
              limit: Math.min(Number(args.limit) || 6, 10),
              sources: Array.isArray(args.sources) ? (args.sources as SourceKind[]) : undefined,
            });
            results.forEach((r) => retrieved.set(r.memory.id, r.memory));
            output = { results: results.map((r) => brief(r.memory)) };
            trace.push({ tool: "search_memories", input: query, resultCount: results.length, ms: Date.now() - started });
          } else if (call.name === "summarize_activity") {
            const range = dayRange(args.from, args.to);
            const { overview, memories } = await activityOverview(workspaceIds, hidden, range.from, range.to);
            memories.forEach((m) => retrieved.set(m.id, m));
            output = overview;
            const total = overview.counts.videosWatched + overview.counts.searches + overview.counts.articlesRead;
            trace.push({ tool: "summarize_activity", input: `${String(args.from)} – ${String(args.to)}`, resultCount: total, ms: Date.now() - started });
          } else if (call.name === "get_memory") {
            const id = String(args.memoryId ?? "");
            const memory = workspaceIds.length && !hidden.has(id) ? await getMemory(id) : undefined;
            const visible = memory && memory.active && workspaceIds.includes(memory.workspaceId) ? memory : undefined;
            if (visible) retrieved.set(visible.id, visible);
            output = visible ? { memory: { ...brief(visible), text: visible.text } } : { error: "not found" };
            trace.push({ tool: "get_memory", input: id, resultCount: visible ? 1 : 0, ms: Date.now() - started });
          } else {
            output = { error: `unknown tool ${call.name}` };
          }
          return { functionResponse: { id: call.id, name: call.name!, response: output as Record<string, unknown> } };
        }),
      );
      history.push({ role: "user", parts: responses });
    }
    throw new Error("agent did not finish");
  } catch (err) {
    console.warn("agent failed, using search fallback:", err instanceof Error ? err.message : err);
    const { results } = await searchMemories({ workspaceIds, hidden, query: question, limit: 4 });
    return {
      answer: results.length
        ? "Corvus couldn't write a summary right now. These are the closest matches in your memories."
        : "Corvus couldn't find anything in your memories for that.",
      confidence: "low",
      citations: [],
      sources: results.map((r) => card(r.memory)),
      suggestedFollowUps: [],
      trace,
      mode: "fallback",
      rejectedCitations: 0,
    };
  }
}
