// Corvus side panel: ask beside the open tab, remember it, and see what Corvus captured.
import { DEFAULTS, SERVERS, normalizeDomain, pageKind, siteState, youtubeId, STATE_LABEL } from "./shared.js";

const $ = (id) => document.getElementById(id);

/** Tiny element builder: h("div", { class: "x", onclick }, child, "text"). */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c !== undefined && c !== null && c !== false));
  return el;
}
function icon(name, cls = "i") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${name}`);
  svg.append(use);
  return svg;
}
function mark() {
  const svg = icon("mark", "");
  svg.setAttribute("viewBox", "0 0 761 453");
  const eye = document.createElementNS("http://www.w3.org/2000/svg", "use");
  eye.setAttribute("href", "#mark-eye");
  eye.setAttribute("class", "eye");
  svg.append(eye);
  return svg;
}
const favicon = (url) => chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return `${hh ? `${hh}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
};
function ago(iso) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// ---- State --------------------------------------------------------------------------------------

const state = {
  s: { ...DEFAULTS, base: SERVERS.production },
  active: {}, // tabId -> until (from the service worker)
  tab: null,
  video: null, // { videoId, title, channel, currentTime } when the tab is a YouTube video
  contextKey: null,
  contextOn: true,
  view: "ask",
  remembered: {}, // contextKey -> "once" | "always" | { error }
  dismissed: new Set(), // domains whose remember card was closed this session
  conversation: [],
  busy: false,
};

async function loadStorage() {
  const s = await chrome.storage.local.get(DEFAULTS);
  state.s = { ...s, base: SERVERS[s.server] ?? SERVERS.production };
  state.active = (await chrome.storage.session.get({ active: {} }).catch(() => ({ active: {} }))).active;
}

/** The open tab as context: a YouTube video (with its position) or a page. */
function context() {
  const tab = state.tab;
  if (!tab?.url) return null;
  const kind = pageKind(tab.url);
  if (kind === "none") return null;
  if (kind === "video") {
    const id = youtubeId(tab.url);
    const v = state.video?.videoId === id ? state.video : null;
    return {
      kind: "video",
      videoId: id,
      title: v?.title || tab.title?.replace(/^\(\d+\)\s*/, "").replace(/ - YouTube$/, "") || "YouTube video",
      channel: v?.channel,
      position: v?.currentTime,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    };
  }
  const host = new URL(tab.url).hostname.replace(/^www\./, "");
  return { kind: "page", pageKind: kind, title: tab.title || host, url: tab.url, host, domain: normalizeDomain(tab.url) };
}

function tabState() {
  const until = state.tab ? state.active[state.tab.id] ?? 0 : 0;
  return siteState({ ...state.s, url: state.tab?.url, active: until > Date.now() });
}

const connected = () => Boolean(state.s.token);

// ---- Rendering ----------------------------------------------------------------------------------

function renderHeader() {
  const pill = $("status-pill");
  const st = !connected() || state.s.link === "unreachable" ? "disconnected"
    : !state.s.enabled || state.s.remote?.paused ? "paused"
    : state.s.link === "ok" ? "capturing" : "checking";
  pill.dataset.state = st;
  $("status-text").textContent =
    { disconnected: connected() ? "Offline" : "Disconnected", paused: "Paused", capturing: "Capturing", checking: "Connecting…" }[st];
  pill.title = st === "disconnected" && connected() ? "Corvus can’t be reached right now" : "";

  const ts = tabState();
  for (const b of $("menu").querySelectorAll("[data-needs]")) {
    b.hidden = b.dataset.needs === "connected" ? !connected() : !(connected() && ["remembered", "active"].includes(ts) && context()?.kind === "page");
  }
  const pause = $("menu").querySelector('[data-action="pause"]');
  pause.querySelector("span").textContent = state.s.enabled ? "Pause capture" : "Resume capture";
  pause.querySelector("use").setAttribute("href", state.s.enabled ? "#i-pause" : "#i-play");
  const forget = $("menu").querySelector('[data-action="forget"] span');
  forget.textContent = `Stop remembering ${context()?.domain ?? "this site"}`;
}

function renderTabs() {
  const ask = state.view === "ask";
  $("tab-ask").setAttribute("aria-selected", String(ask));
  $("tab-activity").setAttribute("aria-selected", String(!ask));
  document.querySelector(".tabs").hidden = !connected();
  $("view-connect").hidden = connected();
  $("view-ask").hidden = !connected() || !ask;
  $("view-activity").hidden = !connected() || ask;
}

function renderContext() {
  const ctx = context();
  const box = $("context");
  box.replaceChildren();
  if (!ctx) return;
  const ts = tabState();
  const chip = h("span", { class: "site-chip", dataset: { state: ts } }, STATE_LABEL[ts]);
  const sub =
    ctx.kind === "video"
      ? h("div", { class: "sub" }, h("span", { id: "ctx-position" }, ctx.position !== undefined ? `Current position · ${clock(ctx.position)}` : ctx.channel ?? "YouTube"), "·", chip)
      : h("div", { class: "sub" }, h("span", {}, ctx.host), "·", chip);
  const visual =
    ctx.kind === "video"
      ? h("img", { class: "thumb", src: ctx.thumb, alt: "" })
      : h("div", { class: "tile" }, h("img", { src: favicon(ctx.url), alt: "", onerror: (e) => e.target.replaceWith(icon("i-globe")) }));

  if (!state.contextOn) {
    box.append(
      h("div", { class: "card context off" }, visual,
        h("div", { class: "grow" }, h("div", { class: "label" }, `Not using this ${ctx.kind}`), h("div", { class: "title" }, ctx.title)),
        h("button", { type: "button", class: "btn", onclick: () => { state.contextOn = true; render(); } }, "Use it")),
    );
    return;
  }
  box.append(
    h("div", { class: "card context" }, visual,
      h("div", { class: "grow" }, h("div", { class: "label" }, `Using this ${ctx.kind}`), h("div", { class: "title", title: ctx.title }, ctx.title), sub),
      h("button", { type: "button", class: "icon-btn remove", "aria-label": `Don’t use this ${ctx.kind}`, title: "Don’t share this with Corvus", onclick: () => { state.contextOn = false; render(); } }, icon("i-x"))),
  );
}

function renderRemember() {
  const box = $("remember");
  box.replaceChildren();
  const ctx = context();
  if (!ctx || ctx.kind !== "page" || ctx.pageKind !== "web" || !ctx.domain || !connected()) return;
  const done = state.remembered[state.contextKey];
  const ts = tabState();
  const siteKnown = ["remembered", "active"].includes(ts);

  if (done === "always" || (siteKnown && done)) {
    box.append(
      h("div", { class: "card remember done" }, h("div", { class: "tile" }, icon("i-check")),
        h("p", { class: "grow" }, "Corvus will remember pages from ", h("b", {}, ctx.domain), "."),
        h("button", { type: "button", class: "text-link", onclick: () => forgetSite(ctx.domain) }, "Undo")),
    );
    return;
  }
  if (siteKnown || ts === "disconnected" || ts === "paused" || state.dismissed.has(ctx.domain)) return;

  const error = done?.error;
  box.append(
    h("div", { class: "card remember" }, h("div", { class: "tile" }, icon("i-globe")),
      h("div", { class: "grow" },
        h("h3", {}, done === "once" ? "Saved this page. Remember the rest of this site?" : "Remember pages from this site?"),
        h("p", {}, error ?? (done === "once"
          ? `Corvus kept this one page. Other pages on ${ctx.domain} still need your OK.`
          : "Corvus currently has one-time access to this page. Automatic memory requires your permission.")),
        h("div", { class: "actions" },
          done === "once" ? null : h("button", { type: "button", class: "btn", onclick: (e) => rememberOnce(e.currentTarget) }, "Remember once"),
          h("button", { type: "button", class: "btn primary", onclick: (e) => rememberAlways(e.currentTarget) }, `Always remember ${ctx.domain}`),
        ),
      ),
      h("button", { type: "button", class: "icon-btn", "aria-label": "Not now", style: "width:26px;height:26px;margin:-6px -6px 0 0", onclick: () => { state.dismissed.add(ctx.domain); render(); } }, icon("i-x")),
    ),
  );
}

function renderEmpty() {
  const ctx = context();
  const empty = $("empty");
  empty.hidden = state.conversation.length > 0;
  if (empty.hidden) return;
  $("empty-mark").dataset.state = connected() ? tabState() : "disconnected";
  $("empty-title").textContent = !ctx || !state.contextOn ? "Ask what you remember." : ctx.kind === "video" ? "Ask beside what you watch." : "Ask beside what you read.";
  empty.querySelector("p").textContent = ctx && state.contextOn
    ? "Recall related ideas, understand this source, or remember it for later."
    : "Ask about anything you watched, searched, or read — Corvus answers from your memory.";

  const items = !ctx || !state.contextOn
    ? [
        { text: "What did I learn this week?", run: () => ask("What did I learn this week?") },
        { text: "What have I been searching for lately?", run: () => ask("What have I been searching for lately?") },
        { text: "Summarize my week", run: () => ask("Summarize my week") },
      ]
    : ctx.kind === "video"
      ? [
          { text: "Where have I seen this idea?", run: () => ask("Where have I seen this idea before?") },
          { text: "Summarize this moment", run: () => ask("Summarize what this video is covering at this moment.") },
          { text: "Remember this video", icon: "i-bookmark", run: (b) => rememberOnce(b) },
        ]
      : [
          { text: "Where have I seen this idea?", run: () => ask("Where have I seen this idea before?") },
          { text: "Summarize this page", run: () => ask("Summarize this page.", { explore: true }) },
          { text: "Remember this page", icon: "i-bookmark", run: (b) => rememberOnce(b) },
        ];
  $("suggestions").replaceChildren(
    ...items.map((it) => h("button", { type: "button", onclick: (e) => it.run(e.currentTarget) }, it.icon ? icon(it.icon) : null, it.text)),
  );
}

function sourceRow(src) {
  const kindIcon = src.source === "youtube" ? "i-video" : src.source === "google_search" ? "i-search" : "i-page";
  const when = src.source === "youtube" && src.startSeconds !== undefined ? clock(src.startSeconds) : null;
  const sub = [src.excerpt && src.source !== "youtube" ? src.excerpt : null, src.occurredAt ? ago(src.occurredAt) : null].filter(Boolean).join(" · ");
  const ctx = context();
  const sameVideo = ctx?.kind === "video" && src.deepLink?.includes(ctx.videoId) && src.startSeconds !== undefined;
  return h("a", {
      class: "source", href: src.deepLink || "#", target: "_blank", rel: "noreferrer",
      onclick: sameVideo ? (e) => { e.preventDefault(); seek(ctx.videoId, src.startSeconds); } : undefined,
    },
    icon(kindIcon),
    h("div", { class: "grow" }, h("div", { class: "t" }, src.title), sub ? h("div", { class: "s" }, sub) : null),
    when ? h("span", { class: "when" }, sameVideo ? `Jump to ${when}` : when) : null,
  );
}

function renderMessage(m) {
  if (m.role === "user") return h("div", { class: "msg-user" }, m.text, m.ctx ? h("span", { class: "ctx" }, m.ctx) : null);
  if (m.role === "note") return h("div", { class: `notice ${m.tone ?? ""}` }, m.text);
  const avatar = h("div", { class: "mark-tile avatar", dataset: { state: m.status === "loading" ? "active" : "remembered" } }, mark());
  let body;
  if (m.status === "loading") body = h("div", { class: "thinking" }, h("i"), h("i"), h("i"), m.explore ? "Searching the web…" : "Searching your memory…");
  else if (m.status === "error") body = h("div", { class: "notice error" }, m.text);
  else if (m.status === "empty")
    body = h("div", { class: "notice" }, "Your Corvus memory is still empty. Remember this page, or watch a video for 30 seconds, then ask again.");
  else {
    const r = m.result;
    body = h("div", {},
      h("div", { class: "answer" }, ...String(r.answer).split(/\n{2,}/).map((p) => h("p", {}, p))),
      h("div", { class: "meta" },
        r.mode === "explore" ? h("span", { class: "badge new" }, icon("i-globe"), "From the web") : null,
        r.confidence === "low" ? h("span", { class: "badge low" }, "Low confidence") : null,
        r.ms ? h("span", {}, `${(r.ms / 1000).toFixed(1)} s`) : null,
      ),
      r.sources?.length ? h("div", { class: "sources" }, r.sources.slice(0, 5).map(sourceRow)) : null,
      r.webSources?.length
        ? h("div", { class: "sources" }, r.webSources.slice(0, 4).map((w) =>
            h("a", { class: "source", href: w.url, target: "_blank", rel: "noreferrer" }, icon("i-globe"),
              h("div", { class: "grow" }, h("div", { class: "t" }, w.title), h("div", { class: "s" }, w.domain)))))
        : null,
      r.suggestedFollowUps?.length
        ? h("div", { class: "followups" }, r.suggestedFollowUps.map((q) => h("button", { type: "button", onclick: () => ask(q) }, q)))
        : null,
    );
  }
  return h("div", { class: "msg-ai" }, avatar, h("div", { class: "body" }, body));
}

function renderThread({ scroll = false } = {}) {
  $("thread").replaceChildren(...state.conversation.map(renderMessage));
  if (scroll) $("ask-scroll").scrollTo({ top: $("ask-scroll").scrollHeight, behavior: "smooth" });
}

function renderComposer() {
  const ctx = context();
  $("send").disabled = state.busy || !$("question").value.trim();
  $("privacy-text").textContent = ctx && state.contextOn ? "Only selected context is shared" : "Only your question is shared";
}

const KIND_ICON = { watched: "i-video", searched: "i-search", visited: "i-page" };

function renderActivity() {
  const { s } = state;
  const remote = s.remote;
  const paused = !s.enabled || remote?.paused;
  $("enabled").checked = s.enabled;
  document.querySelector(".capture-card").dataset.state = paused ? "paused" : "on";
  $("capture-title").textContent = !s.enabled ? "Capture is paused" : remote?.paused ? "Paused in Corvus" : "Capture is active";
  const sources = [remote?.youtube !== false && "YouTube", remote?.search !== false && "Search", remote?.domains?.length && `${remote.domains.length} site${remote.domains.length === 1 ? "" : "s"}`].filter(Boolean);
  $("capture-sub").textContent = !s.enabled ? "Nothing new is remembered until you turn it back on" : remote?.paused ? "Resume it in Corvus → Settings" : sources.join(" + ") || "Every source is off in Corvus settings";

  const recent = s.recent ?? [];
  $("recent-empty").hidden = recent.length > 0;
  $("recent").replaceChildren(
    ...recent.map((r) => {
      const fresh = Date.now() - Date.parse(r.time) < 3 * 60_000;
      const verb = r.kind === "searched" ? "Sent" : "Captured";
      const detail = r.status === "sending" ? "Sending…" : r.detail;
      const st =
        r.status === "done" ? (fresh ? h("span", { class: "badge new" }, "New") : h("span", { class: "st done", title: "Remembered" }, icon("i-check")))
        : r.status === "analysing" ? h("span", { class: "badge new" }, "New")
        : r.status === "failed" ? h("span", { class: "st failed", title: "Didn’t reach Corvus" }, icon("i-alert"))
        : r.status === "skipped" ? h("span", { class: "st skipped", title: r.detail }, icon("i-alert"))
        : h("span", { class: "thinking" }, h("i"), h("i"), h("i"));
      return h("li", {},
        h("span", { class: "kind" }, icon(KIND_ICON[r.kind] ?? "i-page")),
        h("div", { class: "grow" }, h("div", { class: "t", title: r.title }, r.title), h("div", { class: "s" }, [`${verb} ${ago(r.time)}`, detail].filter(Boolean).join(" · "))),
        st,
      );
    }),
  );

  const sending = recent.filter((r) => r.status === "sending" || r.status === "analysing").length;
  const failed = recent.filter((r) => r.status === "failed").length;
  const q = $("queue");
  const [qs, qi, qt] =
    s.link === "unreachable" ? ["off", "i-alert", "Corvus can’t be reached. New activity will be sent when it’s back."]
    : failed ? ["warn", "i-alert", `${failed} item${failed === 1 ? "" : "s"} didn’t reach Corvus and will be retried next time.`]
    : sending ? ["busy", "i-radio", `Sending ${sending} item${sending === 1 ? "" : "s"} to Corvus…`]
    : ["ok", "i-check-circle", "Everything is up to date. No queued events."];
  q.dataset.state = qs;
  q.replaceChildren(icon(qi), h("span", {}, qt));

  const domains = remote?.domains ?? [];
  $("sites-empty").hidden = domains.length > 0;
  $("sites").replaceChildren(
    ...domains.map((d) =>
      h("li", {},
        h("img", { src: favicon(`https://${d}`), alt: "", onerror: (e) => e.target.replaceWith(icon("i-globe")) }),
        h("span", { class: "d" }, d),
        h("span", { class: "site-chip", dataset: { state: "remembered" } }, "Remembered"),
        h("button", { type: "button", onclick: () => forgetSite(d) }, "Remove"),
      ),
    ),
  );
}

function render() {
  shownState = tabState();
  renderHeader();
  renderTabs();
  if (!connected()) return;
  renderContext();
  renderRemember();
  renderEmpty();
  renderComposer();
  renderActivity();
}

// ---- Actions ------------------------------------------------------------------------------------

async function refreshTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tab = tab ?? null;
  const id = tab?.url ? youtubeId(tab.url) : undefined;
  state.video = id ? await chrome.tabs.sendMessage(tab.id, { type: "context" }).catch(() => null) : null;
  const key = id ? `yt:${id}` : tab?.url?.split("#")[0] ?? null;
  if (key !== state.contextKey) {
    state.contextKey = key;
    state.contextOn = true;
  }
  render();
}

/** Updates only the position line while a video plays, so the rest of the panel doesn't flicker. */
async function tickPosition() {
  const ctx = context();
  if (ctx?.kind !== "video" || document.hidden) return;
  const v = await chrome.tabs.sendMessage(state.tab.id, { type: "context" }).catch(() => null);
  if (!v || v.videoId !== ctx.videoId) return;
  state.video = v;
  const el = $("ctx-position");
  if (el && v.currentTime !== undefined) el.textContent = `Current position · ${clock(v.currentTime)}`;
  const st = tabState();
  if ($("empty-mark").dataset.state !== st) render();
}

function contextPayload() {
  const ctx = context();
  if (!ctx || !state.contextOn) return undefined;
  if (ctx.kind === "video")
    return { kind: "video", title: ctx.title.slice(0, 300), url: ctx.url, channel: ctx.channel?.slice(0, 200), positionSeconds: ctx.position };
  return { kind: "page", title: ctx.title.slice(0, 300), url: ctx.url };
}

async function ask(text, { explore = false } = {}) {
  const question = text.trim().slice(0, 500);
  if (!question || state.busy) return;
  const ctx = contextPayload();
  state.busy = true;
  $("question").value = "";
  autosize();
  const reply = { role: "ai", status: "loading", explore };
  state.conversation.push(
    { role: "user", text: question, ctx: ctx ? `With ${ctx.kind === "video" && ctx.positionSeconds !== undefined ? `${context().title} at ${clock(ctx.positionSeconds)}` : ctx.title}` : undefined },
    reply,
  );
  render();
  renderThread({ scroll: true });
  try {
    const res = await fetch(`${state.s.base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.s.token}` },
      body: JSON.stringify({ question, explore, context: ctx }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      await chrome.storage.local.set({ token: null, link: "none" });
      throw new Error("This browser isn’t connected to Corvus any more. Connect it again.");
    }
    if (!res.ok) throw new Error(body.error ?? `Corvus couldn’t answer (${res.status}).`);
    if (body.empty) Object.assign(reply, { status: "empty" });
    else Object.assign(reply, { status: "done", result: body });
  } catch (err) {
    const offline = err instanceof TypeError;
    if (offline) chrome.storage.local.set({ link: "unreachable" });
    Object.assign(reply, { status: "error", text: offline ? "Couldn’t reach Corvus. Check your connection and try again." : err.message });
  }
  state.busy = false;
  render();
  renderThread({ scroll: true });
}

function captureRecord() {
  const ctx = context();
  if (!ctx) return null;
  if (ctx.kind === "video")
    return { kind: "watched", title: ctx.title.slice(0, 500), videoId: ctx.videoId, url: ctx.url, channel: ctx.channel };
  return { kind: "visited", title: ctx.title.slice(0, 500), url: ctx.url };
}

function note(text, tone) {
  state.conversation.push({ role: "note", text, tone });
  render();
  renderThread({ scroll: true });
}

async function rememberOnce(button) {
  const record = captureRecord();
  if (!record) return;
  const key = state.contextKey;
  const fromCard = Boolean(button?.closest("#remember")); // the card re-renders while this runs
  if (button) button.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "remember", record, tabId: state.tab.id });
  if (button) button.disabled = false;
  const what = record.kind === "watched" ? "this video" : "this page";
  if (res?.ok) {
    if (state.remembered[key] !== "always") state.remembered[key] = "once";
    if (!fromCard) note(res.already ? `Corvus already remembered ${what}.` : `Saved ${what} to your memory.${record.kind === "watched" ? " Corvus is finding its key moments." : ""}`, "ok");
  } else {
    const msg = res?.skipped ? "Capture is paused, so nothing was saved." : res?.error ?? "Couldn’t save that.";
    if (fromCard) state.remembered[key] = { error: msg };
    else note(msg, "error");
  }
  render();
}

async function rememberAlways(button) {
  const record = captureRecord();
  if (!record) return;
  const key = state.contextKey;
  button.disabled = true;
  button.textContent = "Saving…";
  const res = await chrome.runtime.sendMessage({ type: "remember-site", record, tabId: state.tab.id });
  state.remembered[key] = res?.ok ? "always" : { error: res?.error ?? "Couldn’t save that." };
  await loadStorage();
  render();
}

async function forgetSite(domain) {
  const res = await chrome.runtime.sendMessage({ type: "forget-site", domain });
  if (res?.error) note(res.error, "error");
  delete state.remembered[state.contextKey];
  state.dismissed.add(domain); // don't ask again straight after "stop remembering"
  await loadStorage();
  render();
}

async function seek(videoId, seconds) {
  await chrome.tabs.sendMessage(state.tab.id, { type: "seek", videoId, seconds }).catch(() => undefined);
}

function autosize() {
  const t = $("question");
  t.style.height = "auto";
  t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
  renderComposer();
}

function setMenu(open) {
  $("menu").hidden = !open;
  $("menu-btn").setAttribute("aria-expanded", String(open));
}

// ---- Wiring -------------------------------------------------------------------------------------

$("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  ask($("question").value);
});
$("question").addEventListener("input", autosize);
$("question").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    ask($("question").value);
  }
});
$("tab-ask").addEventListener("click", () => { state.view = "ask"; render(); });
$("tab-activity").addEventListener("click", () => { state.view = "activity"; render(); });
$("status-pill").addEventListener("click", () => { state.view = "activity"; render(); });
$("enabled").addEventListener("change", (e) => chrome.storage.local.set({ enabled: e.target.checked }));

$("menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  setMenu($("menu").hidden);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
document.addEventListener("click", async (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  setMenu(false);
  if (action === "open") chrome.tabs.create({ url: state.s.base });
  if (action === "new") { state.conversation = []; render(); renderThread(); }
  if (action === "pause") chrome.storage.local.set({ enabled: !state.s.enabled });
  if (action === "forget" && context()?.domain) forgetSite(context().domain);
  if (action === "disconnect") chrome.runtime.sendMessage({ type: "disconnect" });
});

$("pair-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("pair-error").textContent = "";
  const button = e.target.querySelector("button");
  button.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: "connect", code: $("code").value, server: $("server").value });
  button.disabled = false;
  if (res?.error) $("pair-error").textContent = res.error;
});

chrome.storage.onChanged.addListener(async () => {
  await loadStorage();
  render();
});
chrome.tabs.onActivated.addListener(refreshTab);
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId === state.tab?.id && (change.url || change.title || change.status === "complete")) refreshTab();
});
chrome.windows?.onFocusChanged.addListener(refreshTab);
setInterval(tickPosition, 1000);
// Expired "active" glows end on the worker's clock; re-check now and then so the panel follows.
let shownState = null;
setInterval(() => {
  if (document.hidden || !connected() || tabState() === shownState) return;
  render();
}, 1500);

await loadStorage();
$("server").value = state.s.server;
await refreshTab();
if (connected()) chrome.runtime.sendMessage({ type: "refresh" });
