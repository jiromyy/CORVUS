import { listMemories, type MemoryView } from "@/lib/db/store";
import { extensionStatus } from "@/lib/extension";
import { getScope } from "@/lib/workspace";

const summarise = (items: MemoryView[]) => ({
  videos: items.filter((m) => m.memoryType === "video").length,
  searches: items.filter((m) => m.memoryType === "search").length,
  pages: items.filter((m) => m.memoryType === "article").length,
  moments: items.filter((m) => m.memoryType === "video_moment").length,
  latest: items.map((m) => m.occurredAt).sort().at(-1) ?? null,
});

/** What feeds this visitor's memory: the sample, Takeout imports, and extension capture. */
export async function GET() {
  const { ws, includeSample, hidden, signedIn } = await getScope();
  const [sample, own, browsers] = await Promise.all([listMemories([ws.demoId]), listMemories([ws.id]), extensionStatus(ws.id)]);
  return Response.json({
    sample: { ...summarise(sample.filter((m) => !hidden.has(m.id))), included: includeSample, signedIn, hidden: hidden.size },
    takeout: summarise(own.filter((m) => m.sourceMode === "user_import")),
    extension: { ...summarise(own.filter((m) => m.sourceMode === "user_capture")), ...browsers },
  });
}
