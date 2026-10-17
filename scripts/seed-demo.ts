/**
 * Seeds the shared demo workspace (spec §17). Idempotent: replaces all demo memories.
 *   npm run seed            (reuses cached video analyses in scripts/seed/cache/)
 *   npm run seed -- --fresh (re-analyses every video with Gemini)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ActivityEvent, ContentItem, VideoAnalysis } from "../lib/ai/schemas";
import { analyseVideo } from "../lib/ai/video";
import { getDb } from "../lib/db/firestore";
import { replaceWorkspaceMemories, saveContent } from "../lib/db/store";
import {
  articleMemories,
  searchMemory,
  videoMemories,
  withEmbeddings,
  type DraftMemory,
} from "../lib/ingest/memories";
import { secondsToClock } from "../lib/time";
import { thumbnailUrl, watchUrl, youtubeContentId } from "../lib/youtube";
import { DEMO_WORKSPACE, articles, events, videos } from "./seed/demo-data";

const CACHE_DIR = path.join(process.cwd(), "scripts", "seed", "cache");
const fresh = process.argv.includes("--fresh");

async function videoContent(v: (typeof videos)[number]): Promise<ContentItem> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${v.videoId}.json`);
  let analysis: VideoAnalysis;
  if (!fresh && existsSync(cacheFile)) {
    analysis = JSON.parse(readFileSync(cacheFile, "utf8"));
    console.log(`  ${v.videoId}: cached (${analysis.moments.length} moments)`);
  } else {
    const start = Date.now();
    const result = await analyseVideo(v.videoId, v.durationSeconds);
    const { tokens, windows, ...rest } = result;
    analysis = rest;
    writeFileSync(cacheFile, JSON.stringify(analysis, null, 2));
    console.log(
      `  ${v.videoId}: analysed in ${((Date.now() - start) / 1000).toFixed(0)} s, ${windows} window(s), ${tokens} tokens, ${analysis.moments.length} moments (last at ${secondsToClock(analysis.moments.at(-1)?.startSeconds ?? 0)})`,
    );
  }
  return {
    id: youtubeContentId(v.videoId),
    source: "youtube",
    title: v.title,
    url: watchUrl(v.videoId),
    creator: v.creator,
    language: v.language,
    durationSeconds: v.durationSeconds,
    summary: analysis.summary,
    topics: analysis.topics,
    analysisStatus: "done",
    thumbnailUrl: thumbnailUrl(v.videoId),
    moments: analysis.moments,
  };
}

async function main() {
  console.log(`Seeding workspace "${DEMO_WORKSPACE}"`);

  console.log("Videos:");
  const videoItems = new Map<string, ContentItem>();
  for (const v of videos) videoItems.set(v.videoId, await videoContent(v));

  const articleItems = new Map<string, ContentItem>(
    articles.map((a) => [
      a.id,
      {
        id: a.id,
        source: "web",
        title: a.title,
        url: `https://corvus.example/read/${a.id}`,
        creator: a.creator,
        language: a.language,
        summary: a.summary,
        topics: a.topics,
        analysisStatus: "done",
        bodyChunks: a.chunks,
      },
    ]),
  );

  for (const item of [...videoItems.values(), ...articleItems.values()]) await saveContent(item);
  console.log(`Saved ${videoItems.size + articleItems.size} content items`);

  const activity: ActivityEvent[] = events.map((e, i) => {
    const common = {
      id: `${DEMO_WORKSPACE}__evt${String(i).padStart(3, "0")}`,
      workspaceId: DEMO_WORKSPACE,
      sourceMode: "demo_seed" as const,
      occurredAt: e.at,
    };
    switch (e.kind) {
      case "watched":
        return { ...common, source: "youtube", action: "watched", contentId: youtubeContentId(e.videoId), payload: { url: watchUrl(e.videoId) } };
      case "rewatched_span":
        return { ...common, source: "youtube", action: "rewatched_span", contentId: youtubeContentId(e.videoId), payload: { url: watchUrl(e.videoId), spanStartSeconds: e.start, spanEndSeconds: e.end } };
      case "searched":
        return { ...common, source: "google_search", action: "searched", payload: { query: e.query } };
      case "read":
        return { ...common, source: "web", action: "read", contentId: e.articleId, payload: {} };
    }
  });

  const drafts: DraftMemory[] = [];
  events.forEach((e, i) => {
    const event = activity[i];
    if (e.kind === "watched") drafts.push(...videoMemories(videoItems.get(e.videoId)!, event));
    if (e.kind === "searched") drafts.push(searchMemory(event, e.language));
    if (e.kind === "read") drafts.push(...articleMemories(articleItems.get(e.articleId)!, event));
  });

  console.log(`Embedding ${drafts.length} memories…`);
  const memories = await withEmbeddings(drafts);
  await replaceWorkspaceMemories(DEMO_WORKSPACE, memories);

  const db = getDb();
  const batch = db.batch();
  activity.forEach((e) => batch.set(db.collection("events").doc(e.id), e));
  await batch.commit();

  const byType = memories.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.memoryType]: (acc[m.memoryType] ?? 0) + 1 }), {});
  console.log(`Saved ${memories.length} memories ${JSON.stringify(byType)} and ${activity.length} events`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
