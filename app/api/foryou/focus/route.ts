import { z } from "zod";
import { setFocusOverride } from "@/lib/db/store";
import { getWorkspace } from "@/lib/workspace";

const Body = z.object({ label: z.string().trim().min(2).max(80).nullable() });

/** Lets the user correct the inferred focus, or clear the correction with null. */
export async function PUT(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Focus must be 2–80 characters" }, { status: 400 });
  const ws = await getWorkspace();
  await setFocusOverride(ws.id, parsed.data.label);
  return Response.json({ focusOverride: parsed.data.label });
}
