import { z } from "zod";
import { askCorvus } from "@/lib/agent/run";
import { getHiddenMemoryIds } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

const Body = z.object({ question: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question (1–500 characters)." }, { status: 400 });

  const ws = await getWorkspace();
  const hidden = await getHiddenMemoryIds(ws.id);
  const started = Date.now();
  const result = await askCorvus(parsed.data.question, [ws.demoId, ws.id], hidden);
  return Response.json({ ...result, ms: Date.now() - started });
}
