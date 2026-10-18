import { inferFocus, loadMemories, MODES, suggestions, type Mode } from "@/lib/foryou";
import { applySuggestionFeedback, feedbackKey, getFeedback } from "@/lib/feedback";
import { getScope } from "@/lib/workspace";

/** Inferred focus plus suggestions for the context the user picked (study, commute, rest). */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("mode");
  const mode: Mode = MODES.includes(requested as Mode) ? (requested as Mode) : "study";
  const { ws, workspaceIds, hidden, focusOverride } = await getScope();
  const memories = await loadMemories(workspaceIds, hidden);
  const focus = await inferFocus(memories, focusOverride).catch((err) => {
    console.warn("focus inference failed:", err instanceof Error ? err.message : err);
    return undefined;
  });
  const feedback = await getFeedback(ws.id);
  // A focus the user said is not right is dropped: not shown, and not used to rank suggestions.
  const dismissedFocus = focus && feedback[feedbackKey("focus", focus.label)]?.verdict === "wrong" ? focus.label : undefined;
  const usedFocus = dismissedFocus ? undefined : focus;
  // Extra candidates so "not right" feedback can drop some and still leave a full list.
  const candidates = await suggestions({ workspaceIds, hidden, mode, focus: usedFocus, memories, limit: 10 });
  const items = applySuggestionFeedback(candidates, feedback, 5);
  return Response.json({ mode, focus: usedFocus, dismissedFocus, suggestions: items, feedback, activityCount: memories.filter((m) => ["video", "search", "article"].includes(m.memoryType)).length, workspaceId: ws.id });
}
