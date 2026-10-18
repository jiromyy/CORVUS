import { listMemories } from "@/lib/db/store";
import { suggestPrompts } from "@/lib/prompts";
import { getScope } from "@/lib/workspace";

/** Starter questions based on the visitor's most recent memories (empty when there are none). */
export async function GET() {
  const { workspaceIds, hidden, signedIn } = await getScope();
  const memories = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id));
  return Response.json({ prompts: suggestPrompts(memories), signedIn });
}
