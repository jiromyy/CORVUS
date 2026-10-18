import { z } from "zod";
import { ingestRecords } from "@/lib/ingest/records";
import { rateLimit } from "@/lib/ratelimit";
import { sanitizeRecord, type TakeoutRecord } from "@/lib/takeout";
import { getWorkspace } from "@/lib/workspace";

/** One batch of minimal records parsed from Takeout in the browser (raw files never reach the server). */
const Body = z.object({ records: z.array(z.unknown()).min(1).max(300) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid import batch" }, { status: 400 });

  // Validate record by record so one odd entry cannot block the whole import.
  const records: TakeoutRecord[] = [];
  for (const item of parsed.data.records) {
    const r = item && typeof item === "object" ? sanitizeRecord(item as TakeoutRecord) : undefined;
    if (r) records.push(r);
  }
  const skipped = parsed.data.records.length - records.length;
  if (!records.length) return Response.json({ memories: 0, videos: [], searches: 0, pages: 0, skipped });

  const ws = await getWorkspace();
  const limited = await rateLimit(request, "import", ws.id);
  if (limited) return limited;
  const result = await ingestRecords(ws.id, "user_import", records);
  return Response.json({ ...result, skipped });
}
