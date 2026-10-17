import { clearHiddenMemories } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

/** Restores any demo memories this visitor deleted. */
export async function POST() {
  const ws = await getWorkspace();
  await clearHiddenMemories(ws.id);
  return Response.json({ reset: true });
}
