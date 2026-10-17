import { z } from "zod";
import { exchangePairingCode, workspaceForToken, bearer } from "@/lib/extension";

const Body = z.object({ code: z.string().min(8).max(12) });

/** Extension exchanges a pairing code for its capture token. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter the 8-character code from Corvus." }, { status: 400 });
  const token = await exchangePairingCode(parsed.data.code);
  if (!token) return Response.json({ error: "That code is wrong or expired. Make a new one in Corvus." }, { status: 401 });
  return Response.json({ token });
}

/** Extension checks that its token still works. */
export async function GET(request: Request) {
  const workspaceId = await workspaceForToken(bearer(request));
  return workspaceId ? Response.json({ connected: true }) : Response.json({ connected: false }, { status: 401 });
}
