/**
 * Helpers for the Day-0 capability spikes. Each spike is a standalone script:
 *   npm run spike:<name> [-- args]
 * Results go to stdout; generated files go to spikes/out/ (git-ignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const OUT_DIR = path.join(process.cwd(), "spikes", "out");

export function requireEnv(...names: string[]): Record<string, string> {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing in .env.local: ${missing.join(", ")}`);
    process.exit(2);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n] as string]));
}

export function writeOut(name: string, data: string | Buffer) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  writeFileSync(file, data);
  return file;
}

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`  ${label}: ${((Date.now() - start) / 1000).toFixed(1)} s`);
  }
}

export function pass(spike: string, detail: string): never {
  console.log(`\nPASS  ${spike} — ${detail}`);
  process.exit(0);
}

export function fail(spike: string, err: unknown, hint?: string): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFAIL  ${spike} — ${message}`);
  if (hint) console.error(`HINT  ${hint}`);
  process.exit(1);
}

/** Zod schema → JSON Schema accepted by Gemini's responseJsonSchema. */
export function geminiSchema(schema: z.ZodType) {
  const json = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete json.$schema;
  return json;
}

export function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
