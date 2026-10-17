import { getHiddenMemoryIds, listMemories } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

export async function GET() {
  const ws = await getWorkspace();
  const [memories, hidden] = await Promise.all([listMemories([ws.demoId, ws.id]), getHiddenMemoryIds(ws.id)]);
  return Response.json({
    workspaceId: ws.id,
    hiddenCount: hidden.size,
    memories: memories.filter((m) => !hidden.has(m.id)),
  });
}
