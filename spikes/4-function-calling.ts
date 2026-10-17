/**
 * Spike 4: does the agent loop work — tool call, tool result, then a structured, cited answer?
 *   npm run spike:tools
 * Uses fake memories so it runs without Firestore. Also checks whether the model accepts
 * tools and a JSON response schema in the same request (decides the agent design).
 */
import { GoogleGenAI, type Content, type FunctionDeclaration } from "@google/genai";
import { AgentAnswer, validateCitations } from "../lib/ai/schemas";
import { fail, geminiSchema, pass, requireEnv, timed } from "./_shared";

const SPIKE = "function-calling";
const env = requireEnv("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "GEMINI_MODEL");

const FAKE_MEMORIES = [
  { id: "mem_qec_142", title: "Quantum Error Correction, Visually Explained", source: "youtube", deepLink: "https://youtu.be/example?t=142", excerpt: "The lecturer compares error correction to a choir: if one singer drifts, the others pull them back in tune.", seen: "2026-10-09" },
  { id: "mem_search_decoh", title: "Searched: why qubits lose information", source: "google_search", deepLink: "/memory/mem_search_decoh", excerpt: "Search query", seen: "2026-10-11" },
  { id: "mem_kyoto_1", title: "A Respectful Guide to Temple Visits", source: "web", deepLink: "/read/kyoto#chunk-2", excerpt: "Arrive early and keep voices low.", seen: "2026-10-05" },
];

const searchMemories: FunctionDeclaration = {
  name: "search_memories",
  description: "Search the user's own memories (videos watched, searches, articles read) by meaning.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to look for, in any language." },
      limit: { type: "integer" },
    },
    required: ["query"],
  },
};

function runSearch(query: string) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hits = FAKE_MEMORIES.filter((m) => words.some((w) => `${m.title} ${m.excerpt}`.toLowerCase().includes(w)));
  return { results: hits.length ? hits : FAKE_MEMORIES.slice(0, 2) };
}

const SYSTEM = `You are Corvus, a personal media-memory assistant.
Use the tools to find evidence in the user's own memories before answering.
Answer only from tool results and cite memory IDs returned by tools. Never invent sources.
Answer in the language of the user's question.`;

async function main() {
  const ai = new GoogleGenAI({
    enterprise: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  const question = process.argv[2] || "Where did I hear the choir analogy about correcting errors?";
  const history: Content[] = [{ role: "user", parts: [{ text: question }] }];
  const retrieved = new Set<string>();
  const schema = geminiSchema(AgentAnswer);
  let combinedConfigWorks = true;

  for (let step = 1; step <= 6; step++) {
    let res;
    try {
      res = await timed(`step ${step}`, () =>
        ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: history,
          config: {
            systemInstruction: SYSTEM,
            tools: [{ functionDeclarations: [searchMemories] }],
            ...(combinedConfigWorks ? { responseMimeType: "application/json", responseJsonSchema: schema } : {}),
          },
        }),
      );
    } catch (e) {
      if (!combinedConfigWorks) throw e;
      console.log(`  tools + JSON schema in one request rejected: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
      console.log("  → retrying with tools only; the final answer will use a separate JSON call.");
      combinedConfigWorks = false;
      step--;
      continue;
    }

    const calls = res.functionCalls ?? [];
    if (calls.length) {
      history.push(res.candidates![0].content!);
      const parts = calls.map((call) => {
        const query = String(call.args?.query ?? "");
        const output = runSearch(query);
        output.results.forEach((r) => retrieved.add(r.id));
        console.log(`  tool: ${call.name}("${query}") → ${output.results.length} results`);
        return { functionResponse: { id: call.id, name: call.name!, response: output } };
      });
      history.push({ role: "user", parts });
      continue;
    }

    let raw = res.text ?? "";
    if (!combinedConfigWorks) {
      history.push(res.candidates![0].content!);
      history.push({ role: "user", parts: [{ text: "Return your final answer as JSON matching the schema." }] });
      const final = await timed("final JSON", () =>
        ai.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: history,
          config: { systemInstruction: SYSTEM, responseMimeType: "application/json", responseJsonSchema: schema },
        }),
      );
      raw = final.text ?? "";
    }

    const answer = AgentAnswer.parse(JSON.parse(raw));
    const { answer: checked, rejected } = validateCitations(answer, retrieved);
    console.log(`\n  answer (${checked.confidence}): ${checked.answer}`);
    console.log(`  citations: ${checked.citations.map((c) => c.memoryId).join(", ") || "none"}`);
    if (rejected.length) console.log(`  REJECTED invented citations: ${rejected.map((c) => c.memoryId).join(", ")}`);
    if (!retrieved.size) fail(SPIKE, "Model answered without calling the tool.");
    if (!checked.citations.length) fail(SPIKE, "No valid citations in the final answer.");
    pass(
      SPIKE,
      `${step} step(s); tools + JSON schema together: ${combinedConfigWorks ? "supported" : "NOT supported — use a separate final JSON call"}`,
    );
  }
  fail(SPIKE, "Agent did not finish within 6 steps.");
}

main().catch((e) => fail(SPIKE, e, "Check GEMINI_MODEL supports function calling in this location."));
