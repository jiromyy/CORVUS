import { extensionStatus } from "@/lib/extension";
import { getScope } from "@/lib/workspace";

/** Whether a browser extension is paired to this workspace and checking in. */
export async function GET() {
  const { ws } = await getScope();
  return Response.json(await extensionStatus(ws.id));
}
