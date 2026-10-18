import { z } from "zod";
import { exploreWeb } from "@/lib/agent/explore";
import { askCorvus } from "@/lib/agent/run";
import { listMemories } from "@/lib/db/store";
import { rateLimit } from "@/lib/ratelimit";
import { getScope } from "@/lib/workspace";

const Body = z.object({ question: z.string().trim().min(1).max(500), explore: z.boolean().optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question (1–500 characters)." }, { status: 400 });

  const { ws, workspaceIds, hidden, signedIn } = await getScope();
  const limited = await rateLimit(request, "ask", ws.id);
  if (limited) return limited;
  const started = Date.now();
  if (parsed.data.explore) {
    const result = await exploreWeb(parsed.data.question, workspaceIds, hidden).catch(() => undefined);
    if (!result) return Response.json({ error: "Explore mode couldn’t reach the web just now. Try again." }, { status: 502 });
    return Response.json({ ...result, ms: Date.now() - started });
  }
  // Nothing to answer from: say so (and how to fix it) instead of a hollow answer.
  const activities = (await listMemories(workspaceIds)).filter((m) => !hidden.has(m.id) && ["video", "search", "article"].includes(m.memoryType));
  if (!activities.length) return Response.json({ empty: true, signedIn });
  const result = await askCorvus(parsed.data.question, workspaceIds, hidden);
  return Response.json({ ...result, ms: Date.now() - started });
}
