import { inferFocus, loadMemories, MODES, suggestions, type Mode } from "@/lib/foryou";
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
  const items = await suggestions({ workspaceIds, hidden, mode, focus, memories });
  return Response.json({ mode, focus, suggestions: items, workspaceId: ws.id });
}
