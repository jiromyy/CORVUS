import { alternateRecap, latestRecap } from "@/lib/recap";
import { getScope } from "@/lib/workspace";

export async function GET(request: Request) {
  const language = new URL(request.url).searchParams.get("language") === "fil" ? "fil" : "en";
  const { workspaceIds } = await getScope();
  const recap = (await latestRecap(workspaceIds, language)) ?? null;
  return Response.json({ recap, alternate: recap ? await alternateRecap(workspaceIds, recap) : null });
}
