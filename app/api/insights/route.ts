import { listMemories } from "@/lib/db/store";
import { RANGES, computeInsights, type Range } from "@/lib/insights";
import { getScope } from "@/lib/workspace";

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("range") as Range | null;
  const range: Range = asked && RANGES.includes(asked) ? asked : "30d";
  const { workspaceIds, hidden } = await getScope();
  const memories = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id));
  return Response.json(computeInsights(memories, range));
}
