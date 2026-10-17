import { latestRecap } from "@/lib/recap";
import { getScope } from "@/lib/workspace";

export async function GET() {
  const { workspaceIds } = await getScope();
  return Response.json({ recap: (await latestRecap(workspaceIds)) ?? null });
}
