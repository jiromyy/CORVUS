const SERVERS = {
  production: "https://corvus-378059077328.asia-southeast1.run.app",
  local: "http://localhost:3000",
};
const $ = (id) => document.getElementById(id);
const KIND = { watched: "▶ Watched", searched: "🔎 Searched", visited: "📄 Opened" };

async function render() {
  const s = await chrome.storage.local.get({ token: null, enabled: true, server: "production", recent: [] });
  $("pair").hidden = Boolean(s.token);
  $("connected").hidden = !s.token;
  $("server").value = s.server;
  $("enabled").checked = s.enabled;
  $("state").textContent = s.enabled ? "on" : "paused";
  $("empty").hidden = s.recent.length > 0;
  $("recent").replaceChildren(
    ...s.recent.map((r) => {
      const li = document.createElement("li");
      const title = document.createElement("div");
      title.textContent = `${KIND[r.kind] ?? r.kind}: ${r.title}`;
      const meta = document.createElement("div");
      meta.className = "muted";
      meta.textContent = `${new Date(r.time).toLocaleTimeString()} · ${r.status}`;
      li.append(title, meta);
      return li;
    }),
  );
}

$("connect").addEventListener("click", async () => {
  $("pair-error").textContent = "";
  const res = await chrome.runtime.sendMessage({ type: "connect", code: $("code").value, server: $("server").value });
  if (res?.error) $("pair-error").textContent = res.error;
  render();
});
$("enabled").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ enabled: e.target.checked });
  render();
});
$("disconnect").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "disconnect" });
  render();
});
$("open").addEventListener("click", async () => {
  const { server } = await chrome.storage.local.get({ server: "production" });
  chrome.tabs.create({ url: SERVERS[server] ?? SERVERS.production });
});
chrome.storage.onChanged.addListener(render);
render();
