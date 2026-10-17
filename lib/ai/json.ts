import { z } from "zod";

/** Zod schema → JSON Schema accepted by Gemini's responseJsonSchema. */
export function geminiSchema(schema: z.ZodType) {
  const json = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete json.$schema;
  return json;
}

/** Abort signal for one model call. */
export const callTimeout = (ms: number) => AbortSignal.timeout(ms);
