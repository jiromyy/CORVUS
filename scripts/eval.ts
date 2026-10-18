/**
 * Recall benchmark (plan §8, deck benchmark slide): 10 fixed questions against a deployed Corvus,
 * asked as a fresh visitor over Raven's sample memory. Writes docs/eval/results-<revision>.md.
 *   npm run eval                       (production)
 *   npm run eval -- http://localhost:3000
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "https://corvus-378059077328.asia-southeast1.run.app";

type Source = { id: string; title: string; memoryType: string };
type Answer = {
  answer: string;
  confidence: "high" | "medium" | "low";
  citations: Array<{ memoryId: string }>;
  sources: Source[];
  trace: Array<{ tool: string }>;
  mode: string;
  rejectedCitations: number;
  ms: number;
};

type Case = {
  question: string;
  language: "en" | "fil";
  /** For answerable questions: at least one cited source must satisfy this. */
  expect?: (s: Source) => boolean;
  /** For unanswerable questions: Corvus should say so with low confidence. */
  unanswerable?: boolean;
  /** Tools the agent must use (e.g. summarize_activity for period questions). */
  tool?: string;
  note: string;
};

/**
 * Answer language: Filipino when Filipino function words make up at least 12% of the words. (A quoted title
 * such as "Listahan at Loop sa Python: Gabay para sa Baguhan" inside an English answer must not count.)
 */
const FIL_WORDS = /\b(ang|ng|mga|sa|mo|ko|ito|na|ay|para|kung|nang|ka|rin|din|po|yung|siya|ninyo|natin|mong|niya)\b/gi;
const answerLanguage = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const fil = (text.match(FIL_WORDS) ?? []).length;
  return fil >= 3 && fil / words >= 0.12 ? "fil" : "en";
};

const id = (prefix: string) => (s: Source) => s.id.startsWith(`demo-maya__${prefix}`);
const any = (...fns: Array<(s: Source) => boolean>) => (s: Source) => fns.some((f) => f(s));

const CASES: Case[] = [
  { question: "Where did I see how to fix the TypeError when adding a number to input()?", language: "en", expect: any(id("yt_Js05B8Z1ivE__m014"), id("web_input-returns-a-string")), note: "Tech With Tim 9:51 or the input() article" },
  { question: "Which video showed a tip calculator?", language: "en", expect: id("yt_Js05B8Z1ivE__m022"), note: "Tech With Tim 17:39" },
  { question: "What have I searched about Python errors?", language: "en", expect: (s) => s.memoryType === "search" && /TypeError/i.test(s.title), note: "repeated TypeError search" },
  { question: "Where was zero-based list indexing explained?", language: "en", expect: any((s) => s.memoryType === "video_moment" && /index/i.test(s.title + s.id), id("yt_Js05B8Z1ivE__m"), id("web_listahan-at-loop")), note: "list indexing moment or Filipino lists article" },
  { question: "Give me a summary of my week", language: "en", tool: "summarize_activity", expect: () => true, note: "uses summarize_activity and cites activity" },
  { question: "Saan ko napanood kung paano mag-install ng Python?", language: "fil", expect: any(id("yt_UBZs0-gUZsU"), id("yt_Js05B8Z1ivE__m001")), note: "Filipino tutorial or Tech With Tim 0:22" },
  { question: "Ano ang nabasa ko tungkol sa list at loop?", language: "fil", expect: id("web_listahan-at-loop"), note: "Filipino lists article" },
  { question: "Paano ko inayos ang TypeError kapag nagdadagdag ng number sa input?", language: "fil", expect: any(id("yt_Js05B8Z1ivE__m014"), id("web_input-returns-a-string"), id("yt_M-iZsW281CE"), id("yt_Ro_MScTDfU4")), note: "English sources, Filipino answer" },
  { question: "Where did I watch a video about baking sourdough bread?", language: "en", unanswerable: true, note: "not in memory" },
  { question: "What did I search about JavaScript promises?", language: "en", unanswerable: true, note: "not in memory" },
];

async function main() {
  let cookie = "";
  const call = async <T>(p: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${BASE}${p}`, { ...init, headers: { ...(init?.headers ?? {}), ...(cookie ? { cookie } : {}) } });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    if (!res.ok) throw new Error(`${p} → ${res.status}`);
    return res.json() as Promise<T>;
  };

  const health = await call<{ revision: string }>("/api/health");
  console.log(`Corvus eval against ${BASE} (revision ${health.revision})\n`);

  const rows: string[] = [];
  const results: Array<{ pass: boolean; ms: number; rejected: number; langOk: boolean; c: Case; a: Answer }> = [];
  for (const [i, c] of CASES.entries()) {
    const a = await call<Answer>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: c.question }),
    });
    const cited = new Set(a.citations.map((x) => x.memoryId));
    const citedSources = a.sources.filter((s) => cited.has(s.id));
    const sourceOk = c.unanswerable ? a.confidence === "low" : citedSources.some(c.expect!);
    const toolOk = !c.tool || a.trace.some((t) => t.tool === c.tool);
    const langOk = answerLanguage(a.answer) === c.language;
    const pass = sourceOk && toolOk && langOk && a.mode === "agent";
    results.push({ pass, ms: a.ms, rejected: a.rejectedCitations, langOk, c, a });
    console.log(`${pass ? "PASS" : "FAIL"} ${String(i + 1).padStart(2)}  ${(a.ms / 1000).toFixed(1)}s  [${c.language}] ${c.question}`);
    if (!pass) console.log(`        expected: ${c.note}; got (${a.confidence}, ${a.mode}): ${a.answer.slice(0, 140)}`);
    rows.push(
      `| ${i + 1} | ${c.language} | ${c.question} | ${c.note} | ${pass ? "✅" : "❌"} | ${a.confidence} | ${citedSources.length} | ${(a.ms / 1000).toFixed(1)} s |`,
    );
  }

  const ms = results.map((r) => r.ms).sort((x, y) => x - y);
  const pct = (p: number) => ms[Math.min(ms.length - 1, Math.ceil((p / 100) * ms.length) - 1)];
  const answerable = results.filter((r) => !r.c.unanswerable);
  const unanswerable = results.filter((r) => r.c.unanswerable);
  const fil = results.filter((r) => r.c.language === "fil");
  const summary = {
    passed: `${results.filter((r) => r.pass).length}/${results.length}`,
    correctSource: `${answerable.filter((r) => r.pass).length}/${answerable.length}`,
    honestUnknowns: `${unanswerable.filter((r) => r.pass).length}/${unanswerable.length}`,
    filipinoAnsweredInFilipino: `${fil.filter((r) => r.langOk).length}/${fil.length}`,
    inventedCitationsRejected: results.reduce((n, r) => n + r.rejected, 0),
    latencyP50: `${(pct(50) / 1000).toFixed(1)} s`,
    latencyP95: `${(pct(95) / 1000).toFixed(1)} s`,
  };
  console.log("\n", summary);

  const date = new Date().toISOString();
  const md = `# Corvus recall eval — ${health.revision}

Run ${date} against \`${BASE}\` as a fresh visitor over Raven's sample memory (125 memories). Warm instance (min-instances 1).
Generated by \`npm run eval\`; do not edit by hand.

| Measure | Result |
|---|---|
| Questions passed | ${summary.passed} |
| Correct source cited (answerable) | ${summary.correctSource} |
| Said "not found" with low confidence (unanswerable) | ${summary.honestUnknowns} |
| Filipino questions answered in Filipino | ${summary.filipinoAnsweredInFilipino} |
| Citations the model invented (removed by server check) | ${summary.inventedCitationsRejected} |
| Latency p50 / p95 | ${summary.latencyP50} / ${summary.latencyP95} |

| # | Lang | Question | Expected | Pass | Confidence | Cited | Time |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
  const dir = path.join(process.cwd(), "docs", "eval");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `results-${health.revision}.md`);
  writeFileSync(file, md);
  console.log(`\nWrote ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
