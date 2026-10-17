/**
 * Shared domain contracts (spec §13). All streams code against these shapes.
 * Firestore stores embeddings as vector values; here they are plain number arrays.
 */
import { z } from "zod";

const isoDate = z.iso.datetime({ offset: true });

export const SourceKind = z.enum(["youtube", "google_search", "web"]);
export const SourceMode = z.enum(["demo_seed", "user_capture", "user_import"]);

export const ActivityEvent = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  source: SourceKind,
  sourceMode: SourceMode,
  action: z.enum(["watched", "rewatched_span", "searched", "read", "added"]),
  contentId: z.string().optional(),
  occurredAt: isoDate,
  payload: z.object({
    query: z.string().optional(),
    url: z.url().optional(),
    spanStartSeconds: z.number().nonnegative().optional(),
    spanEndSeconds: z.number().nonnegative().optional(),
  }),
});

export const ContentItem = z.object({
  id: z.string().min(1),
  source: SourceKind,
  title: z.string().min(1),
  url: z.url(),
  creator: z.string().optional(),
  language: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  summary: z.string().optional(),
  topics: z.array(z.string()),
  analysisStatus: z.enum(["none", "pending", "done", "failed"]),
});

export const MemoryRecord = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  memoryType: z.enum(["video_moment", "video", "search", "article_passage", "article"]),
  source: SourceKind,
  sourceMode: SourceMode,
  contentId: z.string().optional(),
  sourceEventIds: z.array(z.string()),
  title: z.string().min(1),
  text: z.string().min(1),
  excerpt: z.string(),
  visualDescription: z.string().optional(),
  deepLink: z.string().min(1),
  startSeconds: z.number().nonnegative().optional(),
  endSeconds: z.number().nonnegative().optional(),
  language: z.string().min(2),
  occurredAt: isoDate,
  topics: z.array(z.string()),
  threadIds: z.array(z.string()),
  provenance: z.object({
    observed: z.array(z.string()),
    extracted: z.array(z.string()),
    inferred: z.array(z.string()),
  }),
  embedding: z.array(z.number()),
  embeddingModel: z.string().min(1),
  active: z.boolean(),
  deletedAt: isoDate.optional(),
});

export const Thread = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  memoryIds: z.array(z.string()),
  centroid: z.array(z.number()).optional(),
  updatedAt: isoDate,
  provenance: z.enum(["inferred", "user_edited"]),
});

export const Recap = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  threadId: z.string().optional(),
  language: z.string().min(2),
  audioUrl: z.string().min(1),
  durationSeconds: z.number().positive(),
  chapters: z.array(
    z.object({
      startSeconds: z.number().nonnegative(),
      title: z.string(),
      memoryIds: z.array(z.string()),
    }),
  ),
  createdAt: isoDate,
});

export const LearningGap = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  threadId: z.string().min(1),
  concept: z.string().min(1),
  why: z.string().min(1),
  evidenceMemoryIds: z.array(z.string()).min(1),
  suggestedNext: z
    .object({ memoryId: z.string().optional(), searchQuery: z.string().optional() })
    .optional(),
  dismissed: z.boolean(),
});

/** Final structured answer from the Ask Corvus agent (spec §11 F2). */
export const AgentAnswer = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  citations: z.array(z.object({ memoryId: z.string(), supportingClaim: z.string() })),
  actions: z
    .array(z.object({ type: z.enum(["open_recap", "open_thread"]), id: z.string() }))
    .optional(),
  suggestedFollowUps: z.array(z.string()),
});

/** Gemini video analysis output (spec §11 F1). */
export const VideoAnalysis = z.object({
  title: z.string(),
  summary: z.string(),
  language: z.string(),
  topics: z.array(z.string()),
  moments: z.array(
    z.object({
      startSeconds: z.number().nonnegative(),
      endSeconds: z.number().nonnegative(),
      spokenSummary: z.string(),
      visualDescription: z.string(),
      keyTerms: z.array(z.string()),
    }),
  ),
});

export type ActivityEvent = z.infer<typeof ActivityEvent>;
export type ContentItem = z.infer<typeof ContentItem>;
export type MemoryRecord = z.infer<typeof MemoryRecord>;
export type Thread = z.infer<typeof Thread>;
export type Recap = z.infer<typeof Recap>;
export type LearningGap = z.infer<typeof LearningGap>;
export type AgentAnswer = z.infer<typeof AgentAnswer>;
export type VideoAnalysis = z.infer<typeof VideoAnalysis>;
export type SourceKind = z.infer<typeof SourceKind>;
export type SourceMode = z.infer<typeof SourceMode>;

/**
 * Drops citations whose memory IDs were not returned by a tool during this turn.
 * The agent must never cite a memory it did not retrieve.
 */
export function validateCitations(answer: AgentAnswer, retrievedIds: ReadonlySet<string>) {
  const valid = answer.citations.filter((c) => retrievedIds.has(c.memoryId));
  const rejected = answer.citations.filter((c) => !retrievedIds.has(c.memoryId));
  return { answer: { ...answer, citations: valid }, rejected };
}
