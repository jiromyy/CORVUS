import { listMemories } from "@/lib/db/store";
import { computeThreads, explainThread, threadItems } from "@/lib/threads";
import { getScope } from "@/lib/workspace";

/** One thread: its activities, related video moments, and Gemini's explanation of how they connect. */
export async function GET(_request: Request, ctx: RouteContext<"/api/threads/[id]">) {
  const id = (await ctx.params).id;
  const { workspaceIds, hidden } = await getScope();
  const memories = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id));
  const thread = computeThreads(memories).find((t) => t.id === id);
  if (!thread) return Response.json({ error: "Not found" }, { status: 404 });
  const { items, moments } = threadItems(memories, id);
  const explanation = await explainThread(thread.topic, items);
  return Response.json({ thread, items, moments: moments.slice(0, 8), explanation });
}
