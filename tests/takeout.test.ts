import { describe, expect, it } from "vitest";
import { guessLanguage, parseTakeoutFile, prepareImport } from "@/lib/takeout";

const now = Date.parse("2026-10-18T00:00:00Z");

const myActivity = [
  { header: "Search", title: "Searched for python list comprehension", titleUrl: "https://www.google.com/search?q=python+list+comprehension", time: "2026-10-16T10:00:00.000Z" },
  { header: "Search", title: "Hinanap ang paano gumawa ng list", titleUrl: "https://www.google.com/search?q=paano+gumawa+ng+list", time: "2026-10-16T11:00:00.000Z" },
  { header: "Search", title: "Visited Real Python", titleUrl: "https://www.google.com/url?q=https://realpython.com/list-comprehension/&usg=x", time: "2026-10-16T10:01:00.000Z" },
  { header: "YouTube", title: "Watched Python Tutorial for Beginners", titleUrl: "https://www.youtube.com/watch?v=Js05B8Z1ivE", subtitles: [{ name: "Tech With Tim" }], time: "2026-10-15T12:00:00.000Z" },
  { header: "YouTube", title: "Pinanood ang Python Tutorial #1", titleUrl: "https://www.youtube.com/watch?v=UBZs0-gUZsU", subtitles: [{ name: "SDPT Solutions" }], time: "2026-10-14T12:00:00.000Z" },
  { header: "YouTube", title: "Watched https://www.youtube.com/watch?v=AAAAAAAAAAA", titleUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA", time: "2026-10-14T13:00:00.000Z" },
  { header: "YouTube", title: "Watched Some Ad", titleUrl: "https://www.youtube.com/watch?v=BBBBBBBBBBB", details: [{ name: "From Google Ads" }], time: "2026-10-14T14:00:00.000Z" },
  { header: "YouTube", title: "Searched for lofi beats", titleUrl: "https://www.youtube.com/results?search_query=lofi+beats", time: "2026-10-13T09:00:00.000Z" },
  { header: "Search", title: "Searched for old thing", titleUrl: "https://www.google.com/search?q=old+thing", time: "2026-05-01T09:00:00.000Z" },
];

const watchHistory = [
  { header: "YouTube", title: "Watched Python Tutorial for Beginners", titleUrl: "https://www.youtube.com/watch?v=Js05B8Z1ivE", time: "2026-10-15T12:00:20.000Z" },
];

const browserHistory = {
  "Browser History": [
    { title: "List Comprehension in Python – Real Python", url: "https://realpython.com/list-comprehension/", time_usec: Date.parse("2026-10-16T10:02:00Z") * 1000 },
    { title: "Google Search", url: "https://www.google.com/search?q=x", time_usec: Date.parse("2026-10-16T10:00:00Z") * 1000 },
    { title: "Local", url: "http://localhost:3000/", time_usec: Date.parse("2026-10-16T10:00:00Z") * 1000 },
  ],
};

describe("parseTakeoutFile", () => {
  const parsed = parseTakeoutFile("MyActivity.json", myActivity);

  it("recognises searches by URL, in any account language", () => {
    const queries = parsed.records.filter((r) => r.kind === "searched").map((r) => r.query);
    expect(queries).toEqual(["python list comprehension", "paano gumawa ng list", "lofi beats", "old thing"]);
  });

  it("unwraps clicked Google results and strips localized prefixes", () => {
    expect(parsed.records.find((r) => r.kind === "visited")).toMatchObject({ url: "https://realpython.com/list-comprehension/", title: "Real Python" });
    const titles = parsed.records.filter((r) => r.kind === "watched").map((r) => r.title);
    expect(titles).toEqual(["Python Tutorial for Beginners", "Python Tutorial #1"]);
  });

  it("skips ads and removed videos, keeps the channel", () => {
    const ids = parsed.records.filter((r) => r.kind === "watched").map((r) => r.videoId);
    expect(ids).toEqual(["Js05B8Z1ivE", "UBZs0-gUZsU"]);
    expect(parsed.records.find((r) => r.videoId === "Js05B8Z1ivE")?.channel).toBe("Tech With Tim");
  });

  it("parses Chrome history but skips Google and local pages", () => {
    const b = parseTakeoutFile("BrowserHistory.json", browserHistory);
    expect(b.kind).toBe("browser-history");
    expect(b.records.map((r) => r.url)).toEqual(["https://realpython.com/list-comprehension/"]);
  });
});

describe("prepareImport", () => {
  const files = [
    parseTakeoutFile("MyActivity.json", myActivity),
    parseTakeoutFile("watch-history.json", watchHistory),
    parseTakeoutFile("BrowserHistory.json", browserHistory),
  ];

  it("keeps 90 days, removes duplicate watches across files, sorts oldest first", () => {
    const records = prepareImport(files, { now });
    expect(records.some((r) => r.query === "old thing")).toBe(false);
    expect(records.filter((r) => r.videoId === "Js05B8Z1ivE")).toHaveLength(1);
    expect(records.map((r) => r.time)).toEqual([...records.map((r) => r.time)].sort());
  });

  it("can leave out pages visited", () => {
    expect(prepareImport(files, { now, includeVisited: false }).some((r) => r.kind === "visited")).toBe(false);
  });
});

describe("guessLanguage", () => {
  it("flags common Filipino function words", () => {
    expect(guessLanguage("paano gumawa ng list")).toBe("fil");
    expect(guessLanguage("python list comprehension")).toBe("en");
  });
});
