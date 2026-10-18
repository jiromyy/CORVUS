/**
 * Hourly usage caps for endpoints that spend Gemini credits. Counted per workspace and per client IP
 * (a visitor who clears cookies gets a new workspace but keeps the same IP). Fixed one-hour windows
 * in Firestore are enough for a public demo; they are not a security boundary.
 */
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./db/firestore";

export type Bucket = "ask" | "recap" | "analyse" | "import" | "capture";

const LIMITS: Record<Bucket, { workspace: number; ip: number }> = {
  ask: { workspace: 60, ip: 200 },
  recap: { workspace: 5, ip: 10 },
  analyse: { workspace: 25, ip: 60 },
  import: { workspace: 60, ip: 120 },
  capture: { workspace: 300, ip: 600 },
};

const MESSAGES: Record<Bucket, string> = {
  ask: "You’ve asked a lot in the last hour. Please try again a bit later.",
  recap: "You’ve made several recaps in the last hour. Please try again later.",
  analyse: "Corvus has analysed many videos for you this hour; the rest stay searchable by title. Try again later.",
  import: "Too many import batches this hour. Please try again later.",
  capture: "Capture limit reached for this hour.",
};

export function clientIp(request: Request) {
  // Cloud Run puts the original client first in X-Forwarded-For.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Counts one use; returns a 429 Response when over the cap, otherwise undefined. */
export async function rateLimit(request: Request, bucket: Bucket, workspaceId: string): Promise<Response | undefined> {
  const hour = new Date().toISOString().slice(0, 13); // e.g. 2026-10-18T03
  const ip = clientIp(request).replace(/[^0-9a-fA-F.:]/g, "_");
  const db = getDb();
  const keys = [
    { id: `${bucket}_ws_${workspaceId}_${hour}`, limit: LIMITS[bucket].workspace },
    { id: `${bucket}_ip_${ip}_${hour}`, limit: LIMITS[bucket].ip },
  ];
  try {
    const counts = await Promise.all(
      keys.map(async (k) => {
        const ref = db.collection("rate_limits").doc(k.id);
        await ref.set({ count: FieldValue.increment(1), expiresAt: new Date(Date.now() + 2 * 3600_000) }, { merge: true });
        return { ...k, count: ((await ref.get()).data()?.count as number) ?? 0 };
      }),
    );
    if (counts.some((c) => c.count > c.limit)) {
      return Response.json({ error: MESSAGES[bucket] }, { status: 429, headers: { "Retry-After": "600" } });
    }
  } catch (err) {
    // Never block real use because the counter itself failed.
    console.warn("rate limit check failed:", err instanceof Error ? err.message : err);
  }
  return undefined;
}
