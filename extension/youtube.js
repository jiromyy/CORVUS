// Corvus Capture — YouTube. A video counts as watched after 30 seconds of real playback (ads excluded).
const WATCH_THRESHOLD_S = 30;
const TICK_MS = 2000;

let currentId = null;
let playedSeconds = 0;
let sentId = null;
let lastQuery = null;

// After the extension reloads, this old copy of the script can no longer reach it; ignore that.
function message(m) {
  try {
    chrome.runtime.sendMessage(m).catch(() => undefined);
  } catch {}
}

function send(record) {
  message({ type: "capture", record: { ...record, time: new Date().toISOString() } });
}

function videoTitle() {
  const h1 = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, h1.ytd-watch-metadata");
  return (h1?.textContent || document.title.replace(/ - YouTube$/, "")).trim();
}

function channelName() {
  const a = document.querySelector("ytd-watch-metadata #owner ytd-channel-name a, #owner #channel-name a");
  return a?.textContent?.trim() || undefined;
}

function tick() {
  const url = new URL(location.href);

  if (url.pathname === "/results") {
    const q = url.searchParams.get("search_query")?.trim();
    if (q && q !== lastQuery) {
      lastQuery = q;
      send({ kind: "searched", title: q, query: q });
    }
    return;
  }
  if (url.pathname !== "/watch") return;

  const id = url.searchParams.get("v");
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  if (id !== currentId) {
    currentId = id;
    playedSeconds = 0;
  }

  const video = document.querySelector("video");
  const adShowing = document.querySelector(".ad-showing, .ad-interrupting");
  const playing = Boolean(video && !video.paused && !adShowing);
  if (playing) message({ type: "playing" }); // the toolbar bird glows while Corvus is watching along
  if (sentId === id) return;
  if (playing) playedSeconds += TICK_MS / 1000;

  if (playedSeconds >= WATCH_THRESHOLD_S) {
    const title = videoTitle();
    if (!title) return;
    sentId = id;
    send({ kind: "watched", title, videoId: id, url: `https://www.youtube.com/watch?v=${id}`, channel: channelName() });
  }
}

setInterval(tick, TICK_MS);

// The side panel asks what's playing (to use it as context) and can jump to a cited moment.
chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
  const id = new URL(location.href).searchParams.get("v");
  const video = document.querySelector("video");
  if (m.type === "context") {
    if (location.pathname !== "/watch" || !id) return sendResponse(null);
    sendResponse({
      videoId: id,
      title: videoTitle(),
      channel: channelName(),
      currentTime: video && !document.querySelector(".ad-showing") ? video.currentTime : undefined,
      paused: video ? video.paused : true,
    });
  } else if (m.type === "seek" && video && m.videoId === id) {
    video.currentTime = m.seconds;
    video.play().catch(() => undefined);
    sendResponse({ ok: true });
  }
});
