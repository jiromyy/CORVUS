/**
 * Spike 0: which Gemini models can this project call in GOOGLE_CLOUD_LOCATION?
 * Use the output to fill GEMINI_MODEL, GEMINI_VIDEO_MODEL, GEMINI_TTS_MODEL in .env.local.
 */
import { GoogleGenAI } from "@google/genai";
import { fail, requireEnv } from "./_shared";

const SPIKE = "list-models";
const env = requireEnv("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION");

async function main() {
  const ai = new GoogleGenAI({
    enterprise: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  const pager = await ai.models.list({ config: { queryBase: true, pageSize: 100 } });
  const names: string[] = [];
  for await (const model of pager) {
    if (model.name && /gemini|embedding|tts/i.test(model.name)) names.push(model.name);
  }
  names.sort();
  console.log(`Models visible in ${env.GOOGLE_CLOUD_LOCATION} (${names.length}):`);
  for (const n of names) console.log(`  ${n}`);
  if (!names.length) {
    console.log("No Gemini models listed. Listing can be incomplete; the other spikes are the real test.");
  }
  console.log("\nLook for: a fast Flash model (agent), a model that accepts video, a *-tts model, gemini-embedding-001.");
}

main().catch((e) =>
  fail(SPIKE, e, "Check `gcloud auth application-default login`, the project ID, and that aiplatform.googleapis.com is enabled."),
);
