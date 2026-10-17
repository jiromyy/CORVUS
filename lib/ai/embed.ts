import { getEnv } from "../env";
import { getAI } from "./client";

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embedOne(text: string, taskType: EmbedTask): Promise<number[]> {
  const env = getEnv();
  const res = await getAI().models.embedContent({
    model: env.EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: env.EMBEDDING_DIMENSION,
      abortSignal: AbortSignal.timeout(20_000),
    },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Embedding returned no values");
  return values;
}

/** Embeds texts one request each (batched requests are not reliable across models), with limited concurrency. */
export async function embedTexts(texts: string[], taskType: EmbedTask, concurrency = 8): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);
  let next = 0;
  async function worker() {
    while (next < texts.length) {
      const i = next++;
      out[i] = await embedOne(texts[i], taskType);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return out;
}

export const embedQuery = (text: string) => embedOne(text, "RETRIEVAL_QUERY");
