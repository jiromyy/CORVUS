/**
 * What the extension may capture for a workspace: a global pause, per-source switches, and an allowlist
 * of websites remembered automatically. The server enforces these on every capture, so a paused or
 * disabled source is dropped even if an older extension still sends it.
 */
import { z } from "zod";
import { getDb } from "./db/firestore";
import type { TakeoutRecord } from "./takeout";

export const CaptureSettings = z.object({
  paused: z.boolean(),
  youtube: z.boolean(),
  search: z.boolean(),
  domains: z.array(z.string()).max(50),
});
export type CaptureSettings = z.infer<typeof CaptureSettings>;

export const DEFAULT_CAPTURE: CaptureSettings = { paused: false, youtube: true, search: true, domains: [] };

/** "https://www.Example.com/page" → "example.com"; undefined when it isn't a usable public domain. */
export function normalizeDomain(input: string): string | undefined {
  try {
    const url = new URL(input.includes("://") ? input.trim() : `https://${input.trim()}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return undefined;
    if (/(^|\.)(google\.[a-z.]+|youtube\.com)$/.test(host)) return undefined; // covered by their own switches
    return host;
  } catch {
    return undefined;
  }
}

/** True when a page's host is an allowlisted domain or one of its subdomains. */
export function domainAllowed(url: string | undefined, domains: string[]) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Which captured records the settings allow. Clicked search results count as Search. */
export function allowedRecords(s: CaptureSettings, records: TakeoutRecord[]) {
  if (s.paused) return [];
  return records.filter((r) =>
    r.kind === "watched" ? s.youtube : r.kind === "searched" ? s.search : s.search || domainAllowed(r.url, s.domains),
  );
}

export async function getCaptureSettings(workspaceId: string): Promise<CaptureSettings> {
  const doc = (await getDb().collection("workspaces").doc(workspaceId).get()).data() as { capture?: Partial<CaptureSettings> } | undefined;
  return { ...DEFAULT_CAPTURE, ...doc?.capture };
}

export async function saveCaptureSettings(workspaceId: string, settings: CaptureSettings) {
  await getDb().collection("workspaces").doc(workspaceId).set({ capture: settings }, { merge: true });
  return settings;
}
