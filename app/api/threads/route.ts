import { listMemories } from "@/lib/db/store";
import { computeThreads } from "@/lib/threads";
import { getScope } from "@/lib/workspace";

/** Interest threads across the visitor's memories, strongest first. */
export async function GET() {
  const { workspaceIds, hidden } = await getScope();
  const memories = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id));
  return Response.json({ threads: computeThreads(memories).slice(0, 8) });
}
