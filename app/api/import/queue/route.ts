import { getContent, listMemories } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

/** The visitor's most recently watched videos that still need moment analysis. */
export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 10, 25);
  const ws = await getWorkspace();
  const videos = (await listMemories([ws.id])).filter((m) => m.memoryType === "video");
  const queue = [];
  for (const v of videos) {
    const content = v.contentId ? await getContent(v.contentId) : undefined;
    if (content && content.analysisStatus !== "done") {
      queue.push({ videoId: content.id.replace(/^yt_/, ""), title: content.title, status: content.analysisStatus });
    }
    if (queue.length >= limit) break;
  }
  return Response.json({ queue, totalVideos: videos.length });
}
