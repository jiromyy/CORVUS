/**
 * Audio recap (spec §11 F5): Gemini writes a short spoken script from the user's activity in a
 * period, each chapter citing the memories it draws from; Gemini TTS voices it; the WAV is stored
 * in Cloud Storage and served through the app (no public bucket).
 */
import { randomBytes } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import { z } from "zod";
import { getAI } from "./ai/client";
import { geminiSchema } from "./ai/json";
import type { Recap } from "./ai/schemas";
import { getDb } from "./db/firestore";
import type { MemoryView } from "./db/store";
import { getEnv } from "./env";
import { activityOverview } from "./retrieval/activity";
import { searchMemories } from "./retrieval/search";
import { secondsToClock } from "./time";

const RECAPS = "recaps";

const Script = z.object({
  title: z.string(),
  segments: z.array(z.object({ heading: z.string(), text: z.string(), memoryIds: z.array(z.string()) })).min(2).max(6),
});

export type RecapChapter = Recap["chapters"][number] & { text: string };
export type StoredRecap = Omit<Recap, "chapters"> & {
  title: string;
  from: string;
  to: string;
  chapters: RecapChapter[];
  sources: Array<Pick<MemoryView, "id" | "title" | "source" | "memoryType" | "deepLink" | "startSeconds">>;
};

/** Wraps 16-bit mono PCM (what Gemini TTS returns) in a WAV header. */
export function pcmToWav(pcm: Buffer, sampleRate: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Chapter start times, proportional to how much text comes before each segment. */
export function chapterStarts(lengths: number[], totalSeconds: number) {
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let before = 0;
  return lengths.map((len) => {
    const start = (before / total) * totalSeconds;
    before += len;
    return Math.round(start * 10) / 10;
  });
}

let storage: Storage | undefined;
const bucket = () => {
  const name = getEnv().GCS_BUCKET;
  if (!name) throw new Error("GCS_BUCKET is not set");
  storage ??= new Storage({ projectId: getEnv().GOOGLE_CLOUD_PROJECT });
  return storage.bucket(name);
};

async function writeScript(material: string, language: string) {
  const res = await getAI().models.generateContent({
    model: getEnv().GEMINI_MODEL,
    contents: material,
    config: {
      systemInstruction: `You write short spoken recaps for a personal memory app, like a friendly 2-minute podcast for a commute.
Write in ${language === "fil" ? "natural conversational Filipino (Taglish is fine for technical terms)" : "English"}.
Use only the activity provided. Never invent videos, searches, facts, or timestamps. Mention specific videos and moments by name.
Talk to the listener as "you". About 250-300 words in total, 3 to 5 segments, plain sentences (no lists, no markdown, no emojis).
The first segment is a warm one-sentence intro of what the week was about; the last suggests one concrete next step.
Each segment lists the memory ids it is based on.`,
      responseMimeType: "application/json",
      responseJsonSchema: geminiSchema(Script),
      temperature: 0.6,
      abortSignal: AbortSignal.timeout(40_000),
    },
  });
  return Script.parse(JSON.parse(res.text ?? ""));
}

async function speak(text: string, language: string) {
  const res = await getAI().models.generateContent({
    model: getEnv().GEMINI_TTS_MODEL ?? "gemini-2.5-flash-tts",
    contents: [{ role: "user", parts: [{ text: `Read this as a warm, upbeat podcast host, at a relaxed pace:\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { languageCode: language === "fil" ? "fil-PH" : "en-US", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      abortSignal: AbortSignal.timeout(90_000),
    },
  });
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("TTS returned no audio");
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? "")?.[1] ?? 24000);
  const pcm = Buffer.from(part.inlineData.data, "base64");
  return { wav: pcmToWav(pcm, rate), seconds: pcm.length / (rate * 2) };
}

export async function createRecap(opts: {
  ownerWorkspaceId: string;
  workspaceIds: string[];
  hidden: Set<string>;
  from: string;
  to: string;
  language: "en" | "fil";
  focus?: string;
}): Promise<StoredRecap> {
  const { overview, memories } = await activityOverview(opts.workspaceIds, opts.hidden, opts.from, opts.to);
  if (!memories.length) throw new Error("No activity in this period");

  // Concrete moments make the recap specific: the best video moments for the focus and repeated searches.
  const probes = [opts.focus, ...overview.repeatedSearches.map((r) => r.query)].filter(Boolean).slice(0, 3) as string[];
  const moments = new Map<string, MemoryView>();
  for (const q of probes) {
    const { results } = await searchMemories({ workspaceIds: opts.workspaceIds, hidden: opts.hidden, query: q, limit: 4, sources: ["youtube"] });
    results.filter((r) => r.memory.memoryType === "video_moment").forEach((r) => moments.set(r.memory.id, r.memory));
  }

  const lines = [
    ...memories.map((m) => `${m.id} | ${m.occurredAt.slice(0, 10)} | ${m.memoryType} | ${m.memoryType === "search" ? `searched "${m.excerpt}"` : `${m.title}${m.excerpt && m.excerpt !== m.title ? ` — ${m.excerpt}` : ""}`}`),
    ...[...moments.values()].map((m) => `${m.id} | ${m.occurredAt.slice(0, 10)} | video moment at ${secondsToClock(m.startSeconds ?? 0)} | ${m.excerpt} (on screen: ${m.visualDescription ?? ""})`),
  ];
  const material = `Period: ${opts.from.slice(0, 10)} to ${opts.to.slice(0, 10)}.
Repeated searches: ${overview.repeatedSearches.map((r) => `"${r.query}" ×${r.times}`).join(", ") || "none"}.
Activity (id | date | type | details):
${lines.join("\n")}`;

  const script = await writeScript(material, opts.language);
  const allowed = new Map([...memories, ...moments.values()].map((m) => [m.id, m]));
  const segments = script.segments.map((s) => ({ ...s, memoryIds: s.memoryIds.filter((id) => allowed.has(id)) }));
  const { wav, seconds } = await speak(segments.map((s) => s.text).join("\n\n"), opts.language);

  const id = `recap_${randomBytes(8).toString("hex")}`;
  await bucket().file(`recaps/${opts.ownerWorkspaceId}/${id}.wav`).save(wav, { contentType: "audio/wav", resumable: false });

  const starts = chapterStarts(segments.map((s) => s.text.length), seconds);
  const cited = [...new Set(segments.flatMap((s) => s.memoryIds))].map((mid) => allowed.get(mid)!);
  const recap: StoredRecap = {
    id,
    workspaceId: opts.ownerWorkspaceId,
    title: script.title,
    language: opts.language,
    audioUrl: `/api/recaps/${id}/audio`,
    durationSeconds: Math.round(seconds),
    from: opts.from,
    to: opts.to,
    createdAt: new Date().toISOString(),
    chapters: segments.map((s, i) => ({ startSeconds: starts[i], title: s.heading, memoryIds: s.memoryIds, text: s.text })),
    sources: cited.map((m) => ({ id: m.id, title: m.title, source: m.source, memoryType: m.memoryType, deepLink: m.deepLink, startSeconds: m.startSeconds })),
  };
  await getDb().collection(RECAPS).doc(id).set(recap);
  return recap;
}

export async function getRecap(id: string): Promise<StoredRecap | undefined> {
  const snap = await getDb().collection(RECAPS).doc(id).get();
  return snap.exists ? (snap.data() as StoredRecap) : undefined;
}

/** Most recent recap the visitor may see (their own first, then the shared sample). */
export async function latestRecap(workspaceIds: string[]): Promise<StoredRecap | undefined> {
  const snap = await getDb().collection(RECAPS).where("workspaceId", "in", workspaceIds).get();
  const all = snap.docs.map((d) => d.data() as StoredRecap).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all.find((r) => r.workspaceId !== workspaceIds[0]) ?? all[0];
}

export async function readRecapAudio(recap: StoredRecap) {
  const [buffer] = await bucket().file(`recaps/${recap.workspaceId}/${recap.id}.wav`).download();
  return buffer;
}
