/**
 * The user's verdicts on what Corvus suggests and assumes: suggestions ("more like this" / "not right"),
 * the inferred focus, and Insights patterns ("right" / "not right"). Stored per workspace and applied
 * on the server, so feedback changes what Corvus shows next rather than just hiding a card.
 */
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "./db/firestore";
import type { Suggestion } from "./foryou";

export const Verdict = z.enum(["right", "wrong", "more"]);
export type Verdict = z.infer<typeof Verdict>;

export const FeedbackInput = z.object({
  key: z.string().min(3).max(300),
  verdict: Verdict.nullable(),
  kind: z.string().max(40).optional(),
  channel: z.string().max(200).optional(),
  title: z.string().max(300).optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;
export type FeedbackEntry = Omit<FeedbackInput, "key" | "verdict"> & { verdict: Verdict; at: string };
export type FeedbackMap = Record<string, FeedbackEntry>;

// Firestore map keys can't contain dots in update paths; keep keys simple.
const field = (key: string) => key.replace(/[.~*/[\]]/g, "_");

export async function getFeedback(workspaceId: string): Promise<FeedbackMap> {
  const doc = (await getDb().collection("workspaces").doc(workspaceId).get()).data() as { feedback?: FeedbackMap } | undefined;
  return doc?.feedback ?? {};
}

export async function setFeedback(workspaceId: string, input: FeedbackInput) {
  const { key, verdict, ...meta } = input;
  const value = verdict ? { ...meta, verdict, at: new Date().toISOString() } : FieldValue.delete();
  await getDb().collection("workspaces").doc(workspaceId).set({ feedback: { [field(key)]: value } }, { merge: true });
}

export const feedbackKey = (prefix: "suggestion" | "focus" | "pattern", id: string) => field(`${prefix}:${id}`);

/**
 * Drops suggestions marked "not right" and lifts ones similar (same channel, or same kind) to those the
 * user asked more of, saying so in the reasons.
 */
export function applySuggestionFeedback(items: Suggestion[], feedback: FeedbackMap, limit: number): Suggestion[] {
  const liked = Object.values(feedback).filter((f) => f.verdict === "more");
  return items
    .filter((s) => feedback[feedbackKey("suggestion", s.id)]?.verdict !== "wrong")
    .map((s) => {
      // The liked item itself stays near the top; similar ones rise, same channel more than same format.
      if (feedback[feedbackKey("suggestion", s.id)]?.verdict === "more") return { ...s, score: s.score + 0.15 };
      const sameChannel = liked.find((f) => f.channel && f.channel === s.channel);
      const sameKind = liked.find((f) => f.kind === s.kind);
      const like = sameChannel ?? sameKind;
      if (!like) return s;
      const why = sameChannel ? `same channel as “${like.title}”` : `same format as “${like.title}”`;
      return { ...s, score: s.score + (sameChannel ? 0.15 : 0.05), reasons: [`You asked for more like this: ${why}`, ...s.reasons] };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
