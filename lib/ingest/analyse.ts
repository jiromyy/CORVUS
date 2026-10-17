/**
 * Full moment analysis for a video the user watched (imported or captured). The analysis of a
 * public video is shared content, so a second viewer of the same video reuses it.
 */
import type { ActivityEvent } from "../ai/schemas";
import { analyseVideo } from "../ai/video";
import { getContent, getMemory, saveContent, saveMemories } from "../db/store";
import { fetchYouTubeDuration, youtubeContentId } from "../youtube";
import { videoMemories, withEmbeddings } from "./memories";

export const MAX_ANALYSE_SECONDS = 45 * 60;

export type AnalyseResult =
  | { status: "done"; moments: number; reused: boolean }
  | { status: "too_long"; durationSeconds: number }
  | { status: "not_found" | "failed"; error?: string };

export async function analyseWatchedVideo(workspaceId: string, videoId: string): Promise<AnalyseResult> {
  const contentId = youtubeContentId(videoId);
  const memory = await getMemory(`${workspaceId}__${contentId}`);
  const content = await getContent(contentId);
  if (!memory || !memory.active || !content) return { status: "not_found" };

  let analysed = content;
  const reused = content.analysisStatus === "done";
  if (!reused) {
    const duration = content.durationSeconds ?? (await fetchYouTubeDuration(videoId));
    if (duration && duration > MAX_ANALYSE_SECONDS) return { status: "too_long", durationSeconds: duration };
    try {
      const analysis = await analyseVideo(videoId, duration);
      analysed = {
        ...content,
        durationSeconds: duration,
        summary: analysis.summary,
        topics: analysis.topics,
        language: analysis.language,
        moments: analysis.moments,
        analysisStatus: "done",
      };
      await saveContent(analysed);
    } catch (err) {
      await saveContent({ ...content, analysisStatus: "failed" });
      return { status: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  }

  const event: ActivityEvent = {
    id: memory.sourceEventIds[0] ?? `${workspaceId}__evt_${videoId}`,
    workspaceId,
    source: "youtube",
    sourceMode: memory.sourceMode,
    action: "watched",
    contentId,
    occurredAt: memory.occurredAt,
    payload: { url: content.url },
  };
  const records = await withEmbeddings(videoMemories(analysed, event));
  await saveMemories(records);
  return { status: "done", moments: records.length - 1, reused };
}
