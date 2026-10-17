import { z } from "zod";
import { ingestRecords } from "@/lib/ingest/records";
import { TakeoutRecord } from "@/lib/takeout";
import { getWorkspace } from "@/lib/workspace";

/** One batch of minimal records parsed from Takeout in the browser (raw files never reach the server). */
const Body = z.object({ records: z.array(TakeoutRecord).min(1).max(300) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid import batch" }, { status: 400 });
  const ws = await getWorkspace();
  const result = await ingestRecords(ws.id, "user_import", parsed.data.records);
  return Response.json(result);
}
