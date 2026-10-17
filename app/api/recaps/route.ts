import { z } from "zod";
import { dayRange, namedRanges } from "@/lib/dates";
import { createRecap } from "@/lib/recap";
import { getScope } from "@/lib/workspace";

const Body = z.object({
  period: z.enum(["this_week", "last_week", "last_7_days"]).default("last_7_days"),
  language: z.enum(["en", "fil"]).default("en"),
  focus: z.string().max(80).optional(),
});

/** Generates a ~2-minute spoken recap of a period (20–60 s). */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid recap request" }, { status: 400 });
  const r = namedRanges();
  const days = { this_week: r.thisWeek, last_week: r.lastWeek, last_7_days: r.last7Days }[parsed.data.period];
  const range = dayRange(days.from, days.to);
  const { ws, workspaceIds, hidden, focusOverride } = await getScope();
  try {
    const recap = await createRecap({
      ownerWorkspaceId: ws.id,
      workspaceIds,
      hidden,
      from: range.from!,
      to: range.to!,
      language: parsed.data.language,
      focus: parsed.data.focus ?? focusOverride,
    });
    return Response.json({ recap });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("recap failed:", message);
    const empty = /No activity/.test(message);
    return Response.json({ error: empty ? "There’s no activity in that period to recap." : "Couldn’t make the recap. Try again." }, { status: empty ? 422 : 500 });
  }
}
