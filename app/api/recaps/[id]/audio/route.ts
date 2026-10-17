import { getRecap, readRecapAudio } from "@/lib/recap";
import { getScope } from "@/lib/workspace";

// Small per-instance cache: a recap is ~5 MB and is replayed and seeked repeatedly.
const cache = new Map<string, Buffer>();

/** Streams the recap WAV with byte-range support so the player can seek between chapters. */
export async function GET(request: Request, ctx: RouteContext<"/api/recaps/[id]/audio">) {
  const id = (await ctx.params).id;
  const recap = await getRecap(id);
  const { ws, workspaceIds } = await getScope();
  if (!recap || ![...workspaceIds, ws.id].includes(recap.workspaceId)) return new Response("Not found", { status: 404 });

  let audio = cache.get(id);
  if (!audio) {
    audio = await readRecapAudio(recap);
    if (cache.size > 20) cache.clear();
    cache.set(id, audio);
  }

  const headers = { "Content-Type": "audio/wav", "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
  if (!range) return new Response(new Uint8Array(audio), { headers: { ...headers, "Content-Length": String(audio.length) } });

  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), audio.length - 1) : audio.length - 1;
  if (start >= audio.length || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${audio.length}` } });
  }
  return new Response(new Uint8Array(audio.subarray(start, end + 1)), {
    status: 206,
    headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${audio.length}`, "Content-Length": String(end - start + 1) },
  });
}
