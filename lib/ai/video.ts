/**
 * Video moment understanding (spec §11 F1). Gemini watches a public YouTube video and
 * returns timestamped moments with what was said and what was shown.
 * Verified on Day 0: MM:SS timestamps and low media resolution are accurate on videos
 * up to ~20 minutes; videos over 15 minutes are analysed in balanced windows of ≤ 10 minutes.
 */
import { MediaResolution } from "@google/genai";
import { z } from "zod";
import { getEnv } from "../env";
import { CLOCK_PATTERN, clockToSeconds, secondsToClock } from "../time";
import { watchUrl } from "../youtube";
import { getAI } from "./client";
import { geminiSchema } from "./json";
import { VideoAnalysis } from "./schemas";

const SINGLE_PASS_MAX_SECONDS = 15 * 60;
const MAX_WINDOW_SECONDS = 10 * 60;
const CALL_TIMEOUT_MS = 150_000;

const Clock = z.string().regex(CLOCK_PATTERN);
const RawAnalysis = z.object({
  title: z.string(),
  summary: z.string(),
  language: z.string(),
  topics: z.array(z.string()),
  moments: z.array(
    z.object({
      start: Clock,
      end: Clock,
      spokenSummary: z.string(),
      visualDescription: z.string(),
      keyTerms: z.array(z.string()),
    }),
  ),
});

function prompt(window?: { start: number; end: number }) {
  const scope = window
    ? `You are given the part of the video from ${secondsToClock(window.start)} to ${secondsToClock(window.end)}.
Only describe this part. Report every timestamp as the time in the FULL video (for example a moment
one minute into this part starts at ${secondsToClock(window.start + 60)}).`
    : "Describe the whole video.";
  return `You are indexing a video for a personal memory app.
${scope}
Split it into consecutive moments of roughly 20-60 seconds (at most 40 moments).
For each moment give: start and end as MM:SS timestamps (H:MM:SS past one hour), spokenSummary
(what is said, 1-2 sentences, in English), visualDescription (what is shown on screen: code, slides,
diagrams, demos, text, analogies), keyTerms (include code identifiers and error names exactly as shown).
Also give the video title, a 2-sentence summary in English, the main spoken language as a BCP-47 code
(use "fil" for Filipino/Tagalog), and topics.
Use only what is actually in the video. A moment's start must be the exact time the topic or visual first appears.`;
}

/** The video model occasionally stalls; one retry with a fresh request usually succeeds. */
async function analyseWithRetry(videoId: string, window?: { start: number; end: number }) {
  try {
    return await analyseOnce(videoId, window);
  } catch (err) {
    const where = window ? ` ${secondsToClock(window.start)}–${secondsToClock(window.end)}` : "";
    console.warn(`video analysis ${videoId}${where} failed, retrying:`, err instanceof Error ? err.message : err);
    return analyseOnce(videoId, window);
  }
}

async function analyseOnce(videoId: string, window?: { start: number; end: number }) {
  const env = getEnv();
  const response = await getAI().models.generateContent({
    model: env.GEMINI_VIDEO_MODEL ?? env.GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: { fileUri: watchUrl(videoId), mimeType: "video/*" },
            ...(window
              ? { videoMetadata: { startOffset: `${window.start}s`, endOffset: `${window.end}s` } }
              : {}),
          },
          { text: prompt(window) },
        ],
      },
    ],
    config: {
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      responseMimeType: "application/json",
      responseJsonSchema: geminiSchema(RawAnalysis),
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    },
  });
  const raw = RawAnalysis.parse(JSON.parse(response.text ?? ""));
  let moments = raw.moments.map(({ start, end, ...rest }) => ({
    ...rest,
    startSeconds: clockToSeconds(start),
    endSeconds: clockToSeconds(end),
  }));
  // If the model reported times relative to the window despite the prompt, shift them.
  if (window && window.start > 0 && moments.length && moments[0].startSeconds < window.start - 5) {
    moments = moments.map((m) => ({
      ...m,
      startSeconds: m.startSeconds + window.start,
      endSeconds: m.endSeconds + window.start,
    }));
  }
  return { ...raw, moments, tokens: response.usageMetadata?.totalTokenCount ?? 0 };
}

export type VideoAnalysisResult = VideoAnalysis & { tokens: number; windows: number };

/** Analyse a public YouTube video. Pass the duration to enable windowing for long videos. */
export async function analyseVideo(
  videoId: string,
  durationSeconds?: number,
): Promise<VideoAnalysisResult> {
  if (!durationSeconds || durationSeconds <= SINGLE_PASS_MAX_SECONDS) {
    const result = await analyseWithRetry(videoId);
    return { ...VideoAnalysis.parse(result), tokens: result.tokens, windows: 1 };
  }

  // Balanced windows of at most 10 minutes (a 21-min video becomes 3 × 7 min, not 10 + 10 + 1).
  const count = Math.ceil(durationSeconds / MAX_WINDOW_SECONDS);
  const size = Math.ceil(durationSeconds / count);
  const windows = Array.from({ length: count }, (_, i) => ({
    start: i * size,
    end: Math.min(durationSeconds, (i + 1) * size),
  }));
  const parts = await Promise.all(windows.map((w) => analyseWithRetry(videoId, w)));
  const first = parts[0];
  const moments = parts
    .flatMap((p, i) =>
      p.moments.filter((m) => m.startSeconds >= windows[i].start - 2 && m.startSeconds < windows[i].end),
    )
    .sort((a, b) => a.startSeconds - b.startSeconds);
  return {
    ...VideoAnalysis.parse({
      title: first.title,
      summary: first.summary,
      language: first.language,
      topics: [...new Set(parts.flatMap((p) => p.topics))].slice(0, 12),
      moments,
    }),
    tokens: parts.reduce((sum, p) => sum + p.tokens, 0),
    windows: windows.length,
  };
}
