import { z } from "zod";
import { CaptureSettings, getCaptureSettings, normalizeDomain, saveCaptureSettings } from "@/lib/capture";
import { workspaceFromRequest } from "@/lib/extension";

/** Capture settings for this browser's workspace, or for an extension token (Bearer). */
export async function GET(request: Request) {
  const workspaceId = await workspaceFromRequest(request);
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  return Response.json(await getCaptureSettings(workspaceId));
}

const Patch = CaptureSettings.partial().extend({
  domains: z.array(z.string().max(300)).max(50).optional(),
  /** One website to start or stop remembering (the extension's "Always remember" / "Forget this site"). */
  addDomain: z.string().max(300).optional(),
  removeDomain: z.string().max(300).optional(),
});

/**
 * Changes capture settings from the web app (cookie) or the extension (Bearer).
 * Domains are normalised; invalid ones are dropped.
 */
export async function PUT(request: Request) {
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
  const workspaceId = await workspaceFromRequest(request);
  if (!workspaceId) return Response.json({ error: "Not connected" }, { status: 401 });
  const { addDomain, removeDomain, ...patch } = parsed.data;
  const current = await getCaptureSettings(workspaceId);

  let domains = patch.domains ? patch.domains.map(normalizeDomain).filter((d): d is string => Boolean(d)) : current.domains;
  if (addDomain) {
    const d = normalizeDomain(addDomain);
    if (!d) return Response.json({ error: "Corvus can’t remember this site automatically." }, { status: 400 });
    domains = [...domains, d];
  }
  if (removeDomain) {
    const d = normalizeDomain(removeDomain);
    domains = domains.filter((x) => x !== d);
  }
  domains = [...new Set(domains)].slice(0, 50);
  return Response.json(await saveCaptureSettings(workspaceId, { ...current, ...patch, domains }));
}
