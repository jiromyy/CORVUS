import { z } from "zod";
import { deleteWorkspaceData, listMemories, setIncludeSample } from "@/lib/db/store";
import { getScope } from "@/lib/workspace";

export async function GET() {
  const { ws, includeSample, hidden, signedIn } = await getScope();
  const own = await listMemories([ws.id]);
  const count = (type: string) => own.filter((m) => m.memoryType === type).length;
  return Response.json({
    includeSample,
    signedIn,
    hiddenSampleCount: hidden.size,
    own: { videos: count("video"), searches: count("search"), pages: count("article"), total: own.length },
  });
}

const Patch = z.object({ includeSample: z.boolean() });

export async function PATCH(request: Request) {
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
  const { ws, signedIn } = await getScope();
  if (signedIn && parsed.data.includeSample) return Response.json({ error: "Raven’s sample is only for trying Corvus while signed out." }, { status: 400 });
  await setIncludeSample(ws.id, parsed.data.includeSample);
  return Response.json({ includeSample: parsed.data.includeSample });
}

/** Deletes everything this visitor imported or captured. The shared sample is untouched. */
export async function DELETE() {
  const { ws } = await getScope();
  await deleteWorkspaceData(ws.id);
  return Response.json({ deleted: true });
}
