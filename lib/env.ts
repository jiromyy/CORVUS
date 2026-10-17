import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default("global"),
  GEMINI_MODEL: z.string().min(1),
  GEMINI_VIDEO_MODEL: z.string().optional(),
  GEMINI_TTS_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().max(2048).default(768),
  FIRESTORE_DATABASE: z.string().min(1).default("(default)"),
  GCS_BUCKET: z.string().optional(),
  WORKSPACE_COOKIE_SECRET: z.string().optional(),
  DEMO_WORKSPACE_ID: z.string().min(1).default("demo-maya"),
  GEMINI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated server configuration. Throws with the missing variable names. */
export function getEnv(): Env {
  if (cached) return cached;
  // Treat empty strings from .env files as unset.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${names}`);
  }
  cached = parsed.data;
  return cached;
}

/** Non-throwing summary for the health endpoint. Never includes values. */
export function envStatus() {
  const has = (k: string) => Boolean(process.env[k]);
  return {
    project: has("GOOGLE_CLOUD_PROJECT"),
    geminiModel: has("GEMINI_MODEL"),
    videoModel: has("GEMINI_VIDEO_MODEL"),
    ttsModel: has("GEMINI_TTS_MODEL"),
    bucket: has("GCS_BUCKET"),
    cookieSecret: has("WORKSPACE_COOKIE_SECRET"),
  };
}
