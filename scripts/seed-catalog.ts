/**
 * Writes the curated suggestion catalogue with embeddings to Firestore (collection "catalog").
 *   npm run seed:catalog
 */
import { embedTexts } from "../lib/ai/embed";
import { getDb } from "../lib/db/firestore";
import { catalog } from "./seed/catalog";

async function main() {
  const texts = catalog.map((c) => [c.title, c.channel, c.kind, c.description, c.topics.join(", ")].join("\n"));
  const vectors = await embedTexts(texts, "RETRIEVAL_DOCUMENT");
  const db = getDb();
  const existing = await db.collection("catalog").select().get();
  const batch = db.batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  catalog.forEach((c, i) => batch.set(db.collection("catalog").doc(c.videoId), { ...c, embedding: vectors[i] }));
  await batch.commit();
  console.log(`Saved ${catalog.length} catalogue items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
