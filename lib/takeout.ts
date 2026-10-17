/**
 * Google Takeout parsing (spec §9.3). Runs in the browser so raw files never leave the device;
 * only these minimal records are sent to Corvus. Items are recognised by URL pattern, not by
 * title text, so exports in any account language (e.g. "Pinanood ang…") work.
 */
import { z } from "zod";
import { parseYouTubeId } from "./youtube";

export const TakeoutRecord = z.object({
  kind: z.enum(["watched", "searched", "visited"]),
  time: z.iso.datetime({ offset: true }),
  title: z.string().max(500),
  url: z.url().max(2000).optional(),
  query: z.string().max(500).optional(),
  channel: z.string().max(200).optional(),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
});
export type TakeoutRecord = z.infer<typeof TakeoutRecord>;

const clip = (s: string | undefined, max: number) => (s === undefined ? undefined : s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Makes a record safe to send: long titles and queries (people paste whole error messages into
 * Google) are shortened, and records with unusable links are dropped instead of failing a batch.
 */
export function sanitizeRecord(r: TakeoutRecord): TakeoutRecord | undefined {
  const cleaned = {
    ...r,
    title: clip(r.title.trim(), 300) || "(untitled)",
    query: clip(r.query?.trim(), 300),
    channel: clip(r.channel?.trim(), 100),
  };
  const parsed = TakeoutRecord.safeParse(cleaned);
  return parsed.success ? parsed.data : undefined;
}

type ActivityEntry = {
  header?: string;
  title?: string;
  titleUrl?: string;
  time?: string;
  subtitles?: Array<{ name?: string; url?: string }>;
  details?: Array<{ name?: string }>;
};

const WATCH_PREFIXES = [/^Watched\s+/i, /^Pinanood ang\s+/i, /^Napanood ang\s+/i, /^Pinanood\s+/i];
const VISIT_PREFIXES = [/^Visited\s+/i, /^Binisita ang\s+/i, /^Binisita\s+/i];

const stripPrefix = (title: string, prefixes: RegExp[]) => {
  for (const p of prefixes) if (p.test(title)) return title.replace(p, "").trim();
  return title.trim();
};

function safeUrl(value?: string): URL | undefined {
  try {
    return value ? new URL(value) : undefined;
  } catch {
    return undefined;
  }
}

/** Google wraps clicked results as https://www.google.com/url?q=<target>. */
function unwrapGoogleRedirect(url: URL): URL {
  if (url.hostname.endsWith("google.com") && url.pathname === "/url") return safeUrl(url.searchParams.get("q") ?? "") ?? url;
  return url;
}

function fromActivity(e: ActivityEntry): TakeoutRecord | undefined {
  if (!e.time || !e.titleUrl) return undefined;
  if (e.details?.some((d) => /google ads/i.test(d.name ?? ""))) return undefined; // ads, not user activity
  const time = new Date(e.time).toISOString();
  const raw = safeUrl(e.titleUrl);
  if (!raw) return undefined;
  const url = unwrapGoogleRedirect(raw);
  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (host === "google.com" && url.pathname === "/search" && url.searchParams.get("q")) {
    const query = url.searchParams.get("q")!.trim();
    return { kind: "searched", time, title: query, query };
  }
  if (host === "youtube.com" && url.pathname === "/results" && url.searchParams.get("search_query")) {
    const query = url.searchParams.get("search_query")!.trim();
    return { kind: "searched", time, title: query, query };
  }
  const videoId = host === "youtube.com" || host === "youtu.be" ? parseYouTubeId(url.toString()) : undefined;
  if (videoId) {
    const title = stripPrefix(e.title ?? "", WATCH_PREFIXES);
    // Removed or private videos only have their URL as title.
    if (!title || /^https?:\/\//.test(title)) return undefined;
    return { kind: "watched", time, title, videoId, url: `https://www.youtube.com/watch?v=${videoId}`, channel: e.subtitles?.[0]?.name };
  }
  if ((url.protocol === "https:" || url.protocol === "http:") && !host.endsWith("google.com")) {
    const title = stripPrefix(e.title ?? "", VISIT_PREFIXES) || host;
    return { kind: "visited", time, title, url: url.toString() };
  }
  return undefined;
}

type BrowserHistory = { "Browser History"?: Array<{ title?: string; url?: string; time_usec?: number }> };

function fromBrowserHistory(json: BrowserHistory): TakeoutRecord[] {
  const out: TakeoutRecord[] = [];
  for (const e of json["Browser History"] ?? []) {
    const url = safeUrl(e.url);
    if (!url || !e.time_usec || !/^https?:$/.test(url.protocol)) continue;
    const host = url.hostname.replace(/^www\./, "");
    // Searches and YouTube already come from My Activity; skip local and Google pages.
    if (/(^|\.)google\.|youtube\.com$|^localhost$|^127\./.test(host)) continue;
    out.push({ kind: "visited", time: new Date(e.time_usec / 1000).toISOString(), title: (e.title || host).slice(0, 500), url: url.toString() });
  }
  return out;
}

export type ParsedFile = { name: string; kind: "my-activity" | "watch-history" | "browser-history" | "unknown"; records: TakeoutRecord[] };

/** Detects the Takeout file type from its structure and parses it. */
export function parseTakeoutFile(name: string, json: unknown): ParsedFile {
  if (Array.isArray(json)) {
    const records = json.map((e) => fromActivity(e as ActivityEntry)).filter((r): r is TakeoutRecord => Boolean(r));
    const kind = /watch-history/i.test(name) ? "watch-history" : "my-activity";
    return { name, kind, records };
  }
  if (json && typeof json === "object" && "Browser History" in json) {
    return { name, kind: "browser-history", records: fromBrowserHistory(json as BrowserHistory) };
  }
  return { name, kind: "unknown", records: [] };
}

/**
 * Keeps the last `days` days, drops duplicates (watch-history.json and My Activity both list
 * watches), caps pages visited, and sorts oldest first so the latest watch of a video wins.
 */
export function prepareImport(
  files: ParsedFile[],
  opts: { days?: number; includeVisited?: boolean; maxVisited?: number; now?: number } = {},
): TakeoutRecord[] {
  const { days = 90, includeVisited = true, maxVisited = 300, now = Date.now() } = opts;
  const since = now - days * 86_400_000;
  const seen = new Set<string>();
  const kept: TakeoutRecord[] = [];
  for (const raw of files.flatMap((f) => f.records)) {
    const r = sanitizeRecord(raw);
    if (!r) continue;
    const t = Date.parse(r.time);
    if (t < since || t > now + 86_400_000) continue;
    if (r.kind === "visited" && !includeVisited) continue;
    const key = `${r.kind}|${r.videoId ?? r.query ?? r.url}|${Math.floor(t / 60_000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(r);
  }
  const visited = kept.filter((r) => r.kind === "visited").sort((a, b) => b.time.localeCompare(a.time)).slice(0, maxVisited);
  return [...kept.filter((r) => r.kind !== "visited"), ...visited].sort((a, b) => a.time.localeCompare(b.time));
}

const FILIPINO = /\b(ang|ng|mga|sa|paano|ano|bakit|saan|kailan|ito|yung|naman|para|lang|ba|po|ko|mo)\b/i;

/** Rough language tag for titles and queries: Filipino if it contains common Filipino function words. */
export const guessLanguage = (text: string) => (FILIPINO.test(text) ? "fil" : "en");
