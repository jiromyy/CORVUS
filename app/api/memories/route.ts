import { listMemories } from "@/lib/db/store";
import { getScope } from "@/lib/workspace";

export async function GET() {
  const { ws, workspaceIds, hidden, includeSample } = await getScope();
  const memories = await listMemories(workspaceIds);
  return Response.json({
    workspaceId: ws.id,
    includeSample,
    hiddenCount: hidden.size,
    memories: memories.filter((m) => !hidden.has(m.id)),
  });
}
