import { z } from "zod";
import { CaptureSettings, getCaptureSettings, normalizeDomain, saveCaptureSettings } from "@/lib/capture";
import { workspaceFromRequest } from "@/lib/extension";
import { getScope } from "@/lib/workspace";

/** Capture settings for this browser's workspace, or for an extension token (Bearer). */
export async function GET(request: Request) {
  const workspaceId = await workspaceFromRequest(request);
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  return Response.json(await getCaptureSettings(workspaceId));
}

const Patch = CaptureSettings.partial().extend({ domains: z.array(z.string().max(300)).max(50).optional() });

/** Changes capture settings from the web app (cookie session only). Domains are normalised; invalid ones are dropped. */
export async function PUT(request: Request) {
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
  const { ws } = await getScope();
  const current = await getCaptureSettings(ws.id);
  const domains = parsed.data.domains
    ? [...new Set(parsed.data.domains.map(normalizeDomain).filter((d): d is string => Boolean(d)))]
    : current.domains;
  return Response.json(await saveCaptureSettings(ws.id, { ...current, ...parsed.data, domains }));
}
