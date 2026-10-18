import { z } from "zod";
import { exploreWeb } from "@/lib/agent/explore";
import { askCorvus } from "@/lib/agent/run";
import { listMemories } from "@/lib/db/store";
import { scopeFromRequest } from "@/lib/extension";
import { rateLimit } from "@/lib/ratelimit";
import { secondsToClock } from "@/lib/time";

/** What the extension's side panel shares about the open tab, only when the user keeps it selected. */
const Context = z.object({
  kind: z.enum(["video", "page"]),
  title: z.string().trim().min(1).max(300),
  url: z.url().max(2000),
  channel: z.string().max(200).optional(),
  positionSeconds: z.number().min(0).max(86_400).optional(),
});

const Body = z.object({
  question: z.string().trim().min(1).max(500),
  explore: z.boolean().optional(),
  context: Context.optional(),
});

/** The question as the agent sees it: the user's words, then the source they are looking at. */
function withContext(question: string, context?: z.infer<typeof Context>) {
  if (!context) return question;
  const where =
    context.kind === "video"
      ? `watching the YouTube video "${context.title}"${context.channel ? ` by ${context.channel}` : ""}` +
        (context.positionSeconds !== undefined ? `, currently at ${secondsToClock(context.positionSeconds)}` : "")
      : `reading the page "${context.title}" (${context.url})`;
  return `${question}\n\n(Context the user chose to share: they are ${where}. "This" refers to that source.)`;
}

/** Ask Corvus from the web app (cookie) or from the extension side panel (Bearer token). */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question (1–500 characters)." }, { status: 400 });

  const scope = await scopeFromRequest(request);
  if (!scope) return Response.json({ error: "Not connected" }, { status: 401 });
  const { ws, workspaceIds, hidden, signedIn } = scope;
  const limited = await rateLimit(request, "ask", ws.id);
  if (limited) return limited;
  const started = Date.now();
  const question = withContext(parsed.data.question, parsed.data.context);
  if (parsed.data.explore) {
    const result = await exploreWeb(question, workspaceIds, hidden).catch(() => undefined);
    if (!result) return Response.json({ error: "Explore mode couldn’t reach the web just now. Try again." }, { status: 502 });
    return Response.json({ ...result, ms: Date.now() - started });
  }
  // Nothing to answer from: say so (and how to fix it) instead of a hollow answer.
  const activities = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id) && ["video", "search", "article"].includes(m.memoryType));
  if (!activities.length) return Response.json({ empty: true, signedIn });
  const result = await askCorvus(question, workspaceIds, hidden);
  return Response.json({ ...result, ms: Date.now() - started });
}
