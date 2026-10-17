import { createPairingCode } from "@/lib/extension";
import { getWorkspace } from "@/lib/workspace";

/** Issues a one-time code that links the Chrome extension to this browser's workspace. */
export async function POST() {
  const ws = await getWorkspace();
  return Response.json(await createPairingCode(ws.id));
}
