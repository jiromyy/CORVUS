import { alternateRecap, getRecap } from "@/lib/recap";
import { getScope } from "@/lib/workspace";

export async function GET(_request: Request, ctx: RouteContext<"/api/recaps/[id]">) {
  const recap = await getRecap((await ctx.params).id);
  const { ws, workspaceIds } = await getScope();
  if (!recap || ![...workspaceIds, ws.id].includes(recap.workspaceId)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ recap, alternate: await alternateRecap([...workspaceIds, ws.id], recap) });
}
