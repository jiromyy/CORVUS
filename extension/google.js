// Corvus Capture — Google Search. Remembers the query and the results you click.
function send(record) {
  chrome.runtime.sendMessage({ type: "capture", record: { ...record, time: new Date().toISOString() } });
}

const q = new URLSearchParams(location.search).get("q")?.trim();
if (q) send({ kind: "searched", title: q, query: q });

function target(href) {
  try {
    const url = new URL(href, location.href);
    if (url.hostname.endsWith("google.com") && url.pathname === "/url") return url.searchParams.get("q") || undefined;
    if (/(^|\.)google\./.test(url.hostname) || !/^https?:$/.test(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

document.addEventListener(
  "click",
  (e) => {
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    const h3 = a?.querySelector("h3");
    if (!a || !h3 || !document.getElementById("search")?.contains(a)) return;
    const url = target(a.getAttribute("href"));
    if (url) send({ kind: "visited", title: h3.textContent.trim(), url });
  },
  true,
);
