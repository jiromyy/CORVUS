import { z } from "zod";
import { allowedRecords, getCaptureSettings } from "@/lib/capture";
import { bearer, workspaceForToken } from "@/lib/extension";
import { ingestRecords } from "@/lib/ingest/records";
import { rateLimit } from "@/lib/ratelimit";
import { TakeoutRecord } from "@/lib/takeout";

const Body = z.object({ records: z.array(TakeoutRecord).min(1).max(20) });

/** Live activity from the Chrome extension: a YouTube watch, a Google search, a clicked result, or an allowlisted page. */
export async function POST(request: Request) {
  const workspaceId = await workspaceForToken(bearer(request));
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  const limited = await rateLimit(request, "capture", workspaceId);
  if (limited) return limited;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid capture" }, { status: 400 });
  // The user's capture settings win over whatever the extension sends.
  const settings = await getCaptureSettings(workspaceId);
  const records = allowedRecords(settings, parsed.data.records);
  if (!records.length) return Response.json({ skipped: settings.paused ? "paused" : "disabled", imported: 0 });
  return Response.json(await ingestRecords(workspaceId, "user_capture", records));
}
