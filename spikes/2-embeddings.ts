/**
 * Spike 2: do multilingual embeddings put the same idea close together across languages?
 *   npm run spike:embeddings
 * Override the second-language sentence for your chosen [L2]:
 *   SPIKE_L2_SENTENCE="..." npm run spike:embeddings
 */
import { GoogleGenAI } from "@google/genai";
import { cosine, fail, pass, requireEnv, timed } from "./_shared";

const SPIKE = "embeddings";
const env = requireEnv("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION");
const model = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const dims = Number(process.env.EMBEDDING_DIMENSION || 768);

const english = "Quantum error correction protects fragile qubits, like a choir keeping in tune when one singer drifts.";
// Default L2 is Japanese; replace with the team's chosen language.
const l2 =
  process.env.SPIKE_L2_SENTENCE ||
  "量子誤り訂正は、一人の歌手が音程を外しても合唱団が調和を保つように、壊れやすい量子ビットを守ります。";
const unrelated = "The best time to visit quiet temples in Kyoto is early morning before the tour buses arrive.";
const query = "where did I hear the choir analogy for fixing qubit errors?";

async function embed(ai: GoogleGenAI, text: string, taskType: string) {
  // One input per call: some deployments of this model reject batched inputs.
  const res = await ai.models.embedContent({
    model,
    contents: text,
    config: { taskType, outputDimensionality: dims },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("No embedding values returned");
  return values;
}

async function main() {
  const ai = new GoogleGenAI({
    enterprise: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
  const [en, other, off, q] = await timed("4 embeddings", async () =>
    Promise.all([
      embed(ai, english, "RETRIEVAL_DOCUMENT"),
      embed(ai, l2, "RETRIEVAL_DOCUMENT"),
      embed(ai, unrelated, "RETRIEVAL_DOCUMENT"),
      embed(ai, query, "RETRIEVAL_QUERY"),
    ]),
  );

  if (en.length !== dims) fail(SPIKE, `Expected ${dims} dims, got ${en.length}`);
  const sameIdea = cosine(en, other);
  const differentIdea = cosine(en, off);
  const queryToEn = cosine(q, en);
  const queryToL2 = cosine(q, other);
  const queryToOff = cosine(q, off);
  console.log(`  dims: ${en.length}`);
  console.log(`  EN vs L2 (same idea):       ${sameIdea.toFixed(3)}`);
  console.log(`  EN vs unrelated:            ${differentIdea.toFixed(3)}`);
  console.log(`  query → EN / L2 / unrelated: ${queryToEn.toFixed(3)} / ${queryToL2.toFixed(3)} / ${queryToOff.toFixed(3)}`);

  if (sameIdea <= differentIdea || queryToL2 <= queryToOff) {
    fail(SPIKE, "Cross-language similarity is not higher than the unrelated baseline.");
  }
  pass(SPIKE, `${model} @ ${dims} dims; cross-language margin ${(sameIdea - differentIdea).toFixed(3)}`);
}

main().catch((e) => fail(SPIKE, e, `Check EMBEDDING_MODEL is available in ${env.GOOGLE_CLOUD_LOCATION}.`));
