import { describe, expect, it } from "vitest";
import { shortTitle, suggestPrompts } from "@/lib/prompts";

const m = (memoryType: string, title: string, occurredAt: string, extra: Record<string, unknown> = {}) =>
  ({ memoryType, title, excerpt: title, occurredAt, language: "en", ...extra }) as never;

describe("suggestPrompts", () => {
  it("is empty without memories", () => {
    expect(suggestPrompts([])).toEqual([]);
  });

  it("asks about the repeated search, the latest video, Filipino content, and explores the latest article", () => {
    const prompts = suggestPrompts([
      m("search", "python typeerror", "2026-10-10T10:00:00Z"),
      m("search", "python typeerror", "2026-10-12T10:00:00Z"),
      m("search", "for loop range", "2026-10-14T10:00:00Z"),
      m("video", "Python Tutorial for Beginners - Learn the basics in 20 Min", "2026-10-13T10:00:00Z"),
      m("video", "Listahan at Loop sa Python: Gabay para sa Baguhan", "2026-10-11T10:00:00Z", { language: "fil" }),
      m("article", "Why input() Always Gives You a String", "2026-10-09T10:00:00Z"),
      m("video_moment", "ignored", "2026-10-15T10:00:00Z"),
    ], 5);
    expect(prompts.map((p) => p.kind)).toEqual(["search", "video", "filipino", "explore", "summary"]);
    expect(prompts[0].text).toContain("python typeerror");
    expect(prompts[1].text).toContain("Python Tutorial for Beginners”");
    expect(prompts[3]).toMatchObject({ explore: true });
  });

  it("shortens long titles at separators", () => {
    expect(shortTitle("Python Tutorial #2: Variables and Data Types")).toBe("Python Tutorial #2: Variables and Data Types");
    expect(shortTitle("Learn Python in Only 30 Minutes | Beginner Tutorial")).toBe("Learn Python in Only 30 Minutes");
    expect(shortTitle("Learn Python in Only 30 Minutes (Beginner Tutorial)")).toBe("Learn Python in Only 30 Minutes");
    expect(shortTitle("word ".repeat(20))).toMatch(/word…$/);
  });
});
