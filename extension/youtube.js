// Corvus Capture — YouTube. A video counts as watched after 30 seconds of real playback (ads excluded).
const WATCH_THRESHOLD_S = 30;
const TICK_MS = 2000;

let currentId = null;
let playedSeconds = 0;
let sentId = null;
let lastQuery = null;

function send(record) {
  chrome.runtime.sendMessage({ type: "capture", record: { ...record, time: new Date().toISOString() } });
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
  if (sentId === id) return;

  const video = document.querySelector("video");
  const adShowing = document.querySelector(".ad-showing, .ad-interrupting");
  if (video && !video.paused && !adShowing) playedSeconds += TICK_MS / 1000;

  if (playedSeconds >= WATCH_THRESHOLD_S) {
    const title = videoTitle();
    if (!title) return;
    sentId = id;
    send({ kind: "watched", title, videoId: id, url: `https://www.youtube.com/watch?v=${id}`, channel: channelName() });
  }
}

setInterval(tick, TICK_MS);
