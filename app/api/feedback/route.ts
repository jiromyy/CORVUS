import { FeedbackInput, getFeedback, setFeedback } from "@/lib/feedback";
import { getScope } from "@/lib/workspace";

/** All of this workspace's feedback on suggestions, the inferred focus, and patterns. */
export async function GET() {
  const { ws } = await getScope();
  return Response.json({ feedback: await getFeedback(ws.id) });
}

/** Records (or with verdict null, clears) one piece of feedback. */
export async function POST(request: Request) {
  const parsed = FeedbackInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const { ws } = await getScope();
  await setFeedback(ws.id, parsed.data);
  return Response.json({ feedback: await getFeedback(ws.id) });
}
