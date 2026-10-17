/**
 * Spike 1: can Gemini analyse a public YouTube video into timestamped moments?
 *   npm run spike:video -- "https://www.youtube.com/watch?v=<id>"
 * Tries Gemini on Google Cloud first; if that rejects YouTube URLs and GEMINI_API_KEY is set,
 * retries with the Gemini Developer API (spec §11 F1 fallback).
 */
import { GoogleGenAI, MediaResolution } from "@google/genai";
import { VideoAnalysis } from "../lib/ai/schemas";
import { fail, geminiSchema, pass, requireEnv, timed, writeOut } from "./_shared";

const SPIKE = "video";
const env = requireEnv("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION");
const model = process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL;
const url = process.argv[2] || process.env.SPIKE_YOUTUBE_URL;

if (!model) fail(SPIKE, "Set GEMINI_VIDEO_MODEL (or GEMINI_MODEL) in .env.local");
if (!url) fail(SPIKE, 'Pass a public YouTube URL: npm run spike:video -- "https://www.youtube.com/watch?v=..."');

const PROMPT = `You are indexing a video for a personal memory app.
Split the video into consecutive moments of roughly 20-60 seconds (at most 40 moments).
For each moment give: startSeconds, endSeconds, spokenSummary (what is said, 1-2 sentences),
visualDescription (what is shown on screen: diagrams, demos, text, analogies drawn), keyTerms.
Also give the video title, a 2-sentence summary, the spoken language as a BCP-47 code, and topics.
Use only what is actually in the video. Timestamps must be accurate.`;

async function analyse(ai: GoogleGenAI, label: string) {
  const response = await timed(`${label} generateContent`, () =>
    ai.models.generateContent({
      model: model!,
      contents: [
        {
          role: "user",
          parts: [{ fileData: { fileUri: url!, mimeType: "video/*" } }, { text: PROMPT }],
        },
      ],
      config: {
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema(VideoAnalysis),
      },
    }),
  );
  const parsed = VideoAnalysis.parse(JSON.parse(response.text ?? ""));
  console.log(`  tokens: ${JSON.stringify(response.usageMetadata?.totalTokenCount ?? "n/a")}`);
  return parsed;
}

async function main() {
  const cloud = new GoogleGenAI({
    enterprise: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  let result;
  let path = "Google Cloud (enterprise)";
  try {
    result = await analyse(cloud, "cloud");
  } catch (cloudErr) {
    console.error(`  cloud path failed: ${cloudErr instanceof Error ? cloudErr.message : cloudErr}`);
    if (!process.env.GEMINI_API_KEY) throw cloudErr;
    path = "Gemini Developer API (fallback)";
    result = await analyse(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), "developer-api");
  }

  const file = writeOut("video-analysis.json", JSON.stringify(result, null, 2));
  console.log(`\n  "${result.title}" [${result.language}] — ${result.moments.length} moments`);
  for (const m of result.moments.slice(0, 5)) {
    console.log(`  ${m.startSeconds}s–${m.endSeconds}s  ${m.spokenSummary}`);
    console.log(`      shown: ${m.visualDescription}`);
  }
  console.log(`  full output: ${file}`);
  console.log("  Check by hand: open the video at two of these timestamps — do they match?");
  pass(SPIKE, `${result.moments.length} moments via ${path}. Record the path used in the plan §9.`);
}

main().catch((e) =>
  fail(SPIKE, e, "If the cloud path rejects YouTube URLs, add GEMINI_API_KEY (AI Studio) to .env.local and rerun, or try another model/location."),
);
