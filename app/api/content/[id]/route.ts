import { getContent } from "@/lib/db/store";

/** Content (video moments, article text) is a shared catalogue with no personal data. */
export async function GET(_request: Request, ctx: RouteContext<"/api/content/[id]">) {
  const content = await getContent((await ctx.params).id);
  if (!content) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ content });
}
