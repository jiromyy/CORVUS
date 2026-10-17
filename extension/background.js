// Corvus Capture — service worker. Receives activity from the content scripts and sends it to Corvus.
const SERVERS = {
  production: "https://corvus-378059077328.asia-southeast1.run.app",
  local: "http://localhost:3000",
};
const DEDUPE_MS = 10 * 60_000;
const recentlySent = new Map(); // key -> timestamp

async function settings() {
  const s = await chrome.storage.local.get({ server: "production", token: null, enabled: true, recent: [] });
  return { ...s, base: SERVERS[s.server] ?? SERVERS.production };
}

async function remember(entry) {
  const { recent } = await chrome.storage.local.get({ recent: [] });
  const next = [entry, ...recent.filter((r) => r.id !== entry.id)].slice(0, 15);
  await chrome.storage.local.set({ recent: next });
}

async function capture(record) {
  const s = await settings();
  if (!s.enabled || !s.token) return { skipped: !s.enabled ? "paused" : "not connected" };

  const key = `${record.kind}|${record.videoId ?? record.query ?? record.url}`;
  if (Date.now() - (recentlySent.get(key) ?? 0) < DEDUPE_MS) return { skipped: "duplicate" };
  recentlySent.set(key, Date.now());

  const entry = { id: key, kind: record.kind, title: record.title, time: record.time, status: "sending" };
  await remember(entry);
  try {
    const res = await fetch(`${s.base}/api/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({ records: [record] }),
    });
    if (res.status === 401) {
      await chrome.storage.local.set({ token: null });
      await remember({ ...entry, status: "not connected" });
      return { error: "not connected" };
    }
    if (!res.ok) throw new Error(String(res.status));
    await remember({ ...entry, status: record.kind === "watched" ? "remembered — analysing moments…" : "remembered" });

    if (record.kind === "watched") {
      const a = await fetch(`${s.base}/api/videos/${record.videoId}/analyse`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.token}` },
      }).then((r) => r.json());
      const status =
        a.status === "done" ? `remembered with ${a.moments} moments` : a.status === "too_long" ? "remembered (too long to analyse)" : "remembered";
      await remember({ ...entry, status });
    }
    return { ok: true };
  } catch (err) {
    recentlySent.delete(key);
    await remember({ ...entry, status: "failed — will retry next time" });
    return { error: String(err) };
  }
}

async function connect(code, server) {
  const base = SERVERS[server] ?? SERVERS.production;
  const res = await fetch(`${base}/api/extension/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.error ?? "Could not connect" };
  await chrome.storage.local.set({ token: body.token, server, recent: [] });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const work =
    message.type === "capture" ? capture(message.record)
    : message.type === "connect" ? connect(message.code, message.server)
    : message.type === "disconnect" ? chrome.storage.local.set({ token: null, recent: [] }).then(() => ({ ok: true }))
    : Promise.resolve({ error: "unknown message" });
  work.then(sendResponse);
  return true; // keep the channel open for the async response
});
