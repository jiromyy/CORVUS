// Corvus Capture — helpers shared by the service worker and the side panel.
export const SERVERS = {
  production: "https://corvus-378059077328.asia-southeast1.run.app",
  local: "http://localhost:3000",
};

export const DEFAULTS = { server: "production", token: null, enabled: true, recent: [], remote: null, link: "none" };

export async function settings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return { ...s, base: SERVERS[s.server] ?? SERVERS.production };
}

/** "https://www.Example.com/page" → "example.com"; undefined when it can't be remembered as a website (same rules as lib/capture.ts). */
export function normalizeDomain(input) {
  try {
    const url = new URL(input.includes("://") ? input.trim() : `https://${input.trim()}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return undefined;
    if (/(^|\.)(google\.[a-z.]+|youtube\.com)$/.test(host)) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

export function youtubeId(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) || u.pathname !== "/watch") return undefined;
    const id = u.searchParams.get("v");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** What kind of page a tab shows, as far as capture is concerned. */
export function pageKind(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return "none";
  }
  if (!/^https?:$/.test(u.protocol)) return "none";
  if (Object.values(SERVERS).some((base) => new URL(base).host === u.host)) return "corvus"; // Corvus itself
  if (/(^|\.)youtube\.com$/.test(u.hostname)) return youtubeId(url) ? "video" : "youtube";
  if (/^www\.google\.(com|com\.ph)$/.test(u.hostname) && u.pathname === "/search") return "search";
  if (/(^|\.)google\.[a-z.]+$/.test(u.hostname)) return "google";
  return u.protocol === "https:" ? "web" : "insecure";
}

/** True when the page is on a remembered website (or one of its subdomains). */
export function domainRemembered(url, domains = []) {
  const host = normalizeDomain(url ?? "");
  return Boolean(host && domains.some((d) => host === d || host.endsWith(`.${d}`)));
}

/**
 * The state the toolbar icon and the panel show for a tab:
 * disconnected → paused → active (capturing right now) → remembered → unremembered.
 */
export function siteState({ url, token, link, enabled, remote, active }) {
  if (!token || link === "unreachable") return "disconnected";
  if (!enabled || remote?.paused) return "paused";
  const kind = pageKind(url);
  const remembered =
    (kind === "video" || kind === "youtube") ? remote?.youtube !== false
    : kind === "search" ? remote?.search !== false
    : kind === "web" ? domainRemembered(url, remote?.domains)
    : false;
  if (remembered && active) return "active";
  return remembered ? "remembered" : "unremembered";
}

export const STATE_LABEL = {
  active: "Remembering now",
  remembered: "Remembered site",
  unremembered: "Not remembered",
  paused: "Capture paused",
  disconnected: "Not connected",
};
