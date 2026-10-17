/**
 * Spike 5: does Firestore vector search work on the real `memories` collection,
 * filtered by workspace (spec §13)?
 *   npm run spike:firestore
 * Writes 3 documents with workspaceId "spike", queries them, then deletes them.
 * Needs the composite vector index — the failure message prints the command.
 */
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../lib/db/firestore";
import { fail, pass, requireEnv, timed } from "./_shared";

const SPIKE = "firestore-vector";
requireEnv("GOOGLE_CLOUD_PROJECT", "GEMINI_MODEL");
const dims = Number(process.env.EMBEDDING_DIMENSION || 768);
const database = process.env.FIRESTORE_DATABASE || "(default)";

const INDEX_COMMAND = `gcloud firestore indexes composite create --database="${database}" --collection-group=memories --query-scope=COLLECTION --field-config=field-path=workspaceId,order=ASCENDING --field-config=field-path=active,order=ASCENDING --field-config=field-path=embedding,vector-config='{"dimension":"${dims}","flat":"{}"}'`;

/** Deterministic unit vector pointing mostly along one axis. */
function axisVector(axis: number) {
  const v = Array.from({ length: dims }, (_, i) => (i === axis ? 1 : 0.01));
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}

async function main() {
  const db = getDb();
  const col = db.collection("memories");
  const docs = [
    { id: "spike_a", axis: 0, active: true },
    { id: "spike_b", axis: 1, active: true },
    { id: "spike_deleted", axis: 0, active: false },
  ];

  await timed("write 3 docs", () =>
    Promise.all(
      docs.map((d) =>
        col.doc(d.id).set({
          workspaceId: "spike",
          active: d.active,
          title: d.id,
          embedding: FieldValue.vector(axisVector(d.axis)),
        }),
      ),
    ),
  );

  try {
    const snap = await timed("findNearest", () =>
      col
        .where("workspaceId", "==", "spike")
        .where("active", "==", true)
        .findNearest({
          vectorField: "embedding",
          queryVector: axisVector(0),
          limit: 3,
          distanceMeasure: "COSINE",
          distanceResultField: "distance",
        })
        .get(),
    );
    const ids = snap.docs.map((d) => `${d.id} (${Number(d.get("distance")).toFixed(3)})`);
    console.log(`  results: ${ids.join(", ")}`);
    if (snap.docs[0]?.id !== "spike_a") fail(SPIKE, "Nearest document was not spike_a.");
    if (snap.docs.some((d) => d.id === "spike_deleted")) fail(SPIKE, "Inactive (deleted) memory was returned.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/index/i.test(msg)) fail(SPIKE, e, `Create the vector index (takes a few minutes), then rerun:\n${INDEX_COMMAND}`);
    throw e;
  } finally {
    await Promise.all(docs.map((d) => col.doc(d.id).delete()));
    console.log("  cleaned up spike documents");
  }
  pass(SPIKE, "workspace-filtered vector search works and skips inactive memories");
}

main().catch((e) =>
  fail(SPIKE, e, "Check Firestore exists in Native mode and ADC is configured (gcloud auth application-default login)."),
);
