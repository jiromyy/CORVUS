import { workspaceFromRequest } from "@/lib/extension";
import { analyseWatchedVideo } from "@/lib/ingest/analyse";
import { rateLimit } from "@/lib/ratelimit";

/** Analyses one watched video into moments (30–100 s). Works with the browser cookie or an extension token. */
export async function POST(request: Request, ctx: RouteContext<"/api/videos/[videoId]/analyse">) {
  const { videoId } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return Response.json({ error: "Invalid video" }, { status: 400 });
  const workspaceId = await workspaceFromRequest(request);
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  const limited = await rateLimit(request, "analyse", workspaceId);
  if (limited) return limited;
  const result = await analyseWatchedVideo(workspaceId, videoId);
  return Response.json(result, { status: result.status === "not_found" ? 404 : 200 });
}
