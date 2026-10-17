import { z } from "zod";
import { bearer, workspaceForToken } from "@/lib/extension";
import { ingestRecords } from "@/lib/ingest/records";
import { TakeoutRecord } from "@/lib/takeout";

const Body = z.object({ records: z.array(TakeoutRecord).min(1).max(20) });

/** Live activity from the Chrome extension: a YouTube watch, a Google search, or a clicked result. */
export async function POST(request: Request) {
  const workspaceId = await workspaceForToken(bearer(request));
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid capture" }, { status: 400 });
  return Response.json(await ingestRecords(workspaceId, "user_capture", parsed.data.records));
}
