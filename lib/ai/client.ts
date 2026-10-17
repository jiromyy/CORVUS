import { GoogleGenAI } from "@google/genai";
import { getEnv } from "../env";

let enterpriseClient: GoogleGenAI | undefined;
let developerClient: GoogleGenAI | undefined;

/** Gemini on Google Cloud (Vertex AI / Gemini Enterprise Agent Platform), authenticated with ADC. */
export function getAI(): GoogleGenAI {
  if (!enterpriseClient) {
    const env = getEnv();
    enterpriseClient = new GoogleGenAI({
      enterprise: true,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    });
  }
  return enterpriseClient;
}

/** Gemini Developer API client. Only used as the fallback for YouTube URL analysis. */
export function getDeveloperAI(): GoogleGenAI | undefined {
  const key = getEnv().GEMINI_API_KEY;
  if (!key) return undefined;
  developerClient ??= new GoogleGenAI({ apiKey: key });
  return developerClient;
}
