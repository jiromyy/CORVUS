import { describe, expect, it } from "vitest";
import { computeInsights } from "@/lib/insights";

const NOW = Date.parse("2026-10-18T12:00:00+08:00");
let n = 0;
const m = (memoryType: string, at: string, extra: Record<string, unknown> = {}) => ({
  id: `m${n++}`,
  memoryType,
  source: memoryType === "search" ? "google_search" : memoryType === "article" ? "web" : "youtube",
  title: "t",
  excerpt: "python typeerror",
  occurredAt: at,
  language: "en",
  topics: ["python"],
  sourceEventIds: ["e"],
  sourceMode: "demo_seed",
  ...extra,
}) as never;

describe("computeInsights", () => {
  const memories = [
    m("video", "2026-10-17T21:00:00+08:00", { topics: ["python", "loops"], sourceEventIds: ["a", "b"] }),
    m("search", "2026-10-17T21:20:00+08:00"),
    m("search", "2026-10-17T21:50:00+08:00"),
    m("article", "2026-10-16T09:00:00+08:00", { language: "fil" }),
    m("video_moment", "2026-10-17T21:00:00+08:00"),
    m("video", "2026-09-01T10:00:00+08:00"),
  ];

  it("counts whole activities in the range, not derived moments", () => {
    const r = computeInsights(memories, "7d", NOW);
    expect(r.total).toBe(4);
    expect(r.counts).toEqual({ videos: 1, searches: 2, articles: 1 });
    expect(r.activeDays).toBe(2);
    expect(r.revisited).toBe(1);
    expect(computeInsights(memories, "all", NOW).total).toBe(5);
  });

  it("splits sessions on a 45-minute gap and finds the evening peak in Manila time", () => {
    const r = computeInsights(memories, "7d", NOW);
    expect(r.sessions).toBe(2);
    expect(r.longestSessionMinutes).toBe(50);
    expect(r.peak).toEqual({ label: "9p", count: 3, days: 1 });
  });

  it("reports topic shares, languages, and repeated searches", () => {
    const r = computeInsights(memories, "7d", NOW);
    expect(r.topics[0]).toMatchObject({ label: "python", count: 4 });
    expect(r.languages).toEqual([{ language: "en", count: 3 }, { language: "fil", count: 1 }]);
    expect(r.repeatedSearches).toEqual([{ query: "python typeerror", times: 2 }]);
  });
});
