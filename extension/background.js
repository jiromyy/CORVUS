// Corvus Capture — service worker. Receives activity from the content scripts and the side panel, sends it
// to Corvus, and keeps the toolbar icon showing what Corvus does on each tab.
import { SERVERS, STATE_LABEL, normalizeDomain, pageKind, settings, siteState, domainRemembered } from "./shared.js";

const DEDUPE_MS = 10 * 60_000;
const SETTINGS_TTL_MS = 2 * 60_000;
const recentlySent = new Map(); // key -> timestamp

chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);

async function remember(entry) {
  const { recent } = await chrome.storage.local.get({ recent: [] });
  const previous = recent.find((r) => r.id === entry.id);
  const next = [{ ...previous, ...entry }, ...recent.filter((r) => r.id !== entry.id)].slice(0, 20);
  await chrome.storage.local.set({ recent: next });
}

// Capture settings chosen in Corvus (pause, per-source switches, remembered websites), cached for 2 minutes.
// The result also says whether Corvus is reachable, which the icon and panel show.
let fetchedAt = 0;
async function captureSettings(s, { force = false } = {}) {
  if (!s.token) return null;
  if (!force && Date.now() - fetchedAt < SETTINGS_TTL_MS) return s.remote;
  fetchedAt = Date.now();
  try {
    const res = await fetch(`${s.base}/api/capture/settings`, { headers: { Authorization: `Bearer ${s.token}` } });
    if (res.status === 401) {
      await chrome.storage.local.set({ token: null, link: "none" });
      return null;
    }
    if (!res.ok) throw new Error(String(res.status));
    const remote = await res.json();
    await chrome.storage.local.set({ remote, link: "ok" });
    return remote;
  } catch {
    await chrome.storage.local.set({ link: "unreachable" });
    return s.remote;
  }
}

async function putSettings(s, patch) {
  const res = await fetch(`${s.base}/api/capture/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.error ?? "Corvus couldn’t save that." };
  fetchedAt = Date.now();
  await chrome.storage.local.set({ remote: body, link: "ok" });
  return { ok: true, remote: body };
}

// ---- Toolbar icon -------------------------------------------------------------------------------

const activeUntil = new Map(); // tabId -> timestamp while Corvus is capturing that tab
const shownIcon = new Map(); // tabId -> state last drawn

const iconPath = (state) => ({ 16: `icons/${state}-16.png`, 32: `icons/${state}-32.png` });

async function refreshIcon(tabId, s) {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  if (!tab) return;
  s ??= await settings();
  const state = siteState({ ...s, url: tab.url, active: (activeUntil.get(tabId) ?? 0) > Date.now() });
  if (shownIcon.get(tabId) === state) return;
  shownIcon.set(tabId, state);
  await chrome.action.setIcon({ tabId, path: iconPath(state) }).catch(() => undefined);
  await chrome.action.setTitle({ tabId, title: `Corvus — ${STATE_LABEL[state]}` }).catch(() => undefined);
}

async function refreshAllIcons() {
  const s = await settings();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((t) => refreshIcon(t.id, s)));
}

/** The glowing bird: Corvus is capturing this tab (a video playing, or a page just remembered). */
async function markActive(tabId, ms) {
  if (tabId === undefined || tabId < 0) return;
  const until = Date.now() + ms;
  const wasActive = (activeUntil.get(tabId) ?? 0) > Date.now();
  activeUntil.set(tabId, Math.max(until, activeUntil.get(tabId) ?? 0));
  if (!wasActive) {
    await chrome.storage.session.set({ active: Object.fromEntries(activeUntil) }).catch(() => undefined);
    await refreshIcon(tabId);
  }
  setTimeout(async () => {
    if ((activeUntil.get(tabId) ?? 0) > Date.now()) return;
    activeUntil.delete(tabId);
    await chrome.storage.session.set({ active: Object.fromEntries(activeUntil) }).catch(() => undefined);
    refreshIcon(tabId);
  }, ms + 250);
}

chrome.tabs.onActivated.addListener(({ tabId }) => refreshIcon(tabId));
chrome.tabs.onRemoved.addListener((tabId) => {
  activeUntil.delete(tabId);
  shownIcon.delete(tabId);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ["token", "enabled", "remote", "link", "server"].some((k) => k in changes)) {
    shownIcon.clear();
    refreshAllIcons();
  }
});

// ---- Capture ------------------------------------------------------------------------------------

const KEY = (record) => `${record.kind}|${record.videoId ?? record.query ?? record.url}`;

/** Sends one record to Corvus. `manual` is a click in the panel: it isn't de-duplicated against automatic capture. */
async function capture(record, { tabId, manual = false } = {}) {
  const s = await settings();
  if (!s.token) return { error: "Not connected to Corvus." };
  if (!s.enabled) return { skipped: "paused" };
  const remote = await captureSettings(s);
  if (remote?.paused) return { skipped: "paused in Corvus" };

  record = { ...record, time: record.time ?? new Date().toISOString() };
  const key = KEY(record);
  if (Date.now() - (recentlySent.get(key) ?? 0) < DEDUPE_MS) return manual ? { ok: true, already: true } : { skipped: "duplicate" };
  recentlySent.set(key, Date.now());

  const entry = { id: key, kind: record.kind, title: record.title, url: record.url, time: record.time, status: "sending" };
  await remember(entry);
  markActive(tabId, 6000);
  try {
    const res = await fetch(`${s.base}/api/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({ records: [record] }),
    });
    if (res.status === 401) {
      await chrome.storage.local.set({ token: null, link: "none" });
      await remember({ ...entry, status: "failed", detail: "Not connected" });
      return { error: "Not connected to Corvus." };
    }
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json().catch(() => ({}));
    await chrome.storage.local.set({ link: "ok" });
    if (body.skipped && !body.memories) {
      await remember({ ...entry, status: "skipped", detail: body.skipped === "paused" ? "Paused in Corvus" : "Turned off in Corvus settings" });
      return { skipped: body.skipped };
    }

    if (record.kind !== "watched") {
      await remember({ ...entry, status: "done" });
      return { ok: true };
    }
    await remember({ ...entry, status: "analysing", detail: "Analyzing" });
    const a = await fetch(`${s.base}/api/videos/${record.videoId}/analyse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.token}` },
    })
      .then((r) => r.json())
      .catch(() => ({}));
    const detail =
      a.status === "done" ? `${a.moments} moments` : a.status === "too_long" ? "Too long to analyse; searchable by title" : undefined;
    await remember({ ...entry, status: "done", detail });
    return { ok: true };
  } catch (err) {
    recentlySent.delete(key);
    await chrome.storage.local.set({ link: "unreachable" });
    await remember({ ...entry, status: "failed", detail: "Will retry next time" });
    return { error: "Couldn’t reach Corvus. Try again in a moment." };
  }
}

async function connect(code, server) {
  const base = SERVERS[server] ?? SERVERS.production;
  try {
    const res = await fetch(`${base}/api/extension/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? "Could not connect" };
    await chrome.storage.local.set({ token: body.token, server, recent: [], remote: null, link: "ok" });
    fetchedAt = 0;
    await captureSettings(await settings(), { force: true });
    return { ok: true };
  } catch {
    return { error: "Couldn’t reach Corvus." };
  }
}

/** "Always remember": add the site to the allowlist in Corvus, then remember the page that's open. */
async function rememberSite(record, tabId) {
  const s = await settings();
  if (!s.token) return { error: "Not connected to Corvus." };
  const domain = normalizeDomain(record.url ?? "");
  if (!domain) return { error: "Corvus can’t remember this site automatically." };
  const saved = await putSettings(s, { addDomain: domain }).catch(() => ({ error: "Couldn’t reach Corvus." }));
  if (saved.error) return saved;
  const captured = await capture(record, { tabId, manual: true });
  return { ok: true, domain, captured };
}

// Pages on websites the user chose to remember automatically.
chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  if (change.url) activeUntil.delete(tabId);
  if (change.url || change.status === "complete") refreshIcon(tabId);
  if (change.status !== "complete" || !tab.url || tab.incognito || pageKind(tab.url) !== "web") return;
  const s = await settings();
  if (!s.enabled || !s.token) return;
  const remote = await captureSettings(s);
  if (!remote || remote.paused || !domainRemembered(tab.url, remote.domains)) return;
  const host = new URL(tab.url).hostname.replace(/^www\./, "");
  capture({ kind: "visited", title: (tab.title || host).slice(0, 500), url: tab.url }, { tabId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = message.tabId ?? sender.tab?.id;
  const work =
    message.type === "capture" ? capture(message.record, { tabId })
    : message.type === "playing" ? markActive(tabId, 5000).then(() => ({ ok: true }))
    : message.type === "remember" ? capture(message.record, { tabId, manual: true })
    : message.type === "remember-site" ? rememberSite(message.record, tabId)
    : message.type === "forget-site" ? settings().then((s) => putSettings(s, { removeDomain: message.domain })).catch(() => ({ error: "Couldn’t reach Corvus." }))
    : message.type === "refresh" ? settings().then((s) => captureSettings(s, { force: true })).then(() => ({ ok: true }))
    : message.type === "connect" ? connect(message.code, message.server)
    : message.type === "disconnect" ? chrome.storage.local.set({ token: null, recent: [], remote: null, link: "none" }).then(() => ({ ok: true }))
    : Promise.resolve({ error: "unknown message" });
  work.then(sendResponse, (err) => sendResponse({ error: String(err) }));
  return true; // keep the channel open for the async response
});

chrome.runtime.onInstalled.addListener(refreshAllIcons);
chrome.runtime.onStartup.addListener(refreshAllIcons);
