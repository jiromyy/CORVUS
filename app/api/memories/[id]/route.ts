import { deactivateMemory, getHiddenMemoryIds, getMemory, hideMemories, listMemories } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

async function visibleMemory(id: string) {
  const ws = await getWorkspace();
  const memory = await getMemory(id);
  if (!memory || !memory.active || ![ws.demoId, ws.id].includes(memory.workspaceId)) return { ws };
  if ((await getHiddenMemoryIds(ws.id)).has(id)) return { ws };
  return { ws, memory };
}

export async function GET(_request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  const { memory } = await visibleMemory((await ctx.params).id);
  if (!memory) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ memory });
}

/**
 * Own memories are deactivated; shared demo memories are hidden for this visitor only.
 * Deleting a whole video or article also removes its moments/passages (IDs prefixed `<id>__`).
 */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  const { ws, memory } = await visibleMemory((await ctx.params).id);
  if (!memory) return Response.json({ error: "Not found" }, { status: 404 });

  const children =
    memory.memoryType === "video" || memory.memoryType === "article"
      ? (await listMemories([memory.workspaceId])).filter((m) => m.id.startsWith(`${memory.id}__`))
      : [];
  const ids = [memory.id, ...children.map((m) => m.id)];

  if (memory.workspaceId === ws.id) await Promise.all(ids.map(deactivateMemory));
  else await hideMemories(ws.id, ids);
  return Response.json({ deleted: ids });
}
