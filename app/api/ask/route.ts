import { z } from "zod";
import { askCorvus } from "@/lib/agent/run";
import { rateLimit } from "@/lib/ratelimit";
import { getScope } from "@/lib/workspace";

const Body = z.object({ question: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question (1–500 characters)." }, { status: 400 });

  const { ws, workspaceIds, hidden } = await getScope();
  const limited = await rateLimit(request, "ask", ws.id);
  if (limited) return limited;
  const started = Date.now();
  const result = await askCorvus(parsed.data.question, workspaceIds, hidden);
  return Response.json({ ...result, ms: Date.now() - started });
}
