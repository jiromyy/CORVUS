import { describe, expect, it } from "vitest";
import { DEFAULT_CAPTURE, allowedRecords, domainAllowed, normalizeDomain } from "@/lib/capture";
import { applySuggestionFeedback } from "@/lib/feedback";
import { computeThreads } from "@/lib/threads";

const at = "2026-10-18T09:00:00+08:00";

describe("capture settings", () => {
  it("normalises domains and rejects ones covered elsewhere", () => {
    expect(normalizeDomain("https://www.Docs.Python.org/3/")).toBe("docs.python.org");
    expect(normalizeDomain("not a domain")).toBeUndefined();
    expect(normalizeDomain("youtube.com")).toBeUndefined();
    expect(domainAllowed("https://sub.example.com/x", ["example.com"])).toBe(true);
    expect(domainAllowed("https://notexample.com/x", ["example.com"])).toBe(false);
  });

  it("drops everything when paused and filters by source switches and the allowlist", () => {
    const records = [
      { kind: "watched" as const, time: at, title: "v", videoId: "abcdefghijk" },
      { kind: "searched" as const, time: at, title: "q", query: "q" },
      { kind: "visited" as const, time: at, title: "p", url: "https://docs.python.org/3/" },
    ];
    expect(allowedRecords({ ...DEFAULT_CAPTURE, paused: true }, records)).toEqual([]);
    expect(allowedRecords({ ...DEFAULT_CAPTURE, youtube: false, search: false, domains: [] }, records)).toEqual([]);
    expect(allowedRecords({ ...DEFAULT_CAPTURE, youtube: false, search: false, domains: ["docs.python.org"] }, records).map((r) => r.kind)).toEqual(["visited"]);
  });
});

describe("suggestion feedback", () => {
  const s = (id: string, score: number, channel: string) => ({ id, type: "catalog", kind: "lesson", title: id, channel, language: "en", href: "#", external: true, reasons: ["r"], score }) as never;

  it("removes 'not right' and lifts the same channel as 'more like this'", () => {
    const items = [s("a", 1, "X"), s("b", 0.9, "Y"), s("c", 0.8, "Y"), s("d", 0.85, "Z")];
    const out = applySuggestionFeedback(items, {
      "suggestion:a": { verdict: "wrong", at },
      "suggestion:b": { verdict: "more", channel: "Y", kind: "lesson", title: "b", at },
    }, 3);
    expect(out.map((x: { id: string }) => x.id)).toEqual(["b", "c", "d"]);
  });
});

describe("interest threads", () => {
  it("groups by shared topic and pulls in searches that mention it", () => {
    const m = (id: string, memoryType: string, topics: string[], excerpt = "") => ({ id, memoryType, topics, excerpt, title: id, occurredAt: at, source: "youtube" }) as never;
    const threads = computeThreads([m("v1", "video", ["TypeError"]), m("a1", "article", ["typeerror"]), m("s1", "search", [], "python typeerror can only concatenate"), m("x", "video_moment", ["typeerror"])]);
    expect(threads[0]).toMatchObject({ id: "typeerror", count: 3, counts: { videos: 1, pages: 1, searches: 1 } });
  });
});
