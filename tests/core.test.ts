import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { keywordScore, recencyScore, rerank, tokenize } from "@/lib/retrieval/search";
import { clockToSeconds, secondsToClock } from "@/lib/time";
import { sign, verify } from "@/lib/workspace";
import { parseYouTubeId, watchAtUrl } from "@/lib/youtube";
import type { MemoryView } from "@/lib/db/store";

describe("parseYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=Js05B8Z1ivE", "Js05B8Z1ivE"],
    ["https://www.youtube.com/watch?v=DD8APgTEix4&list=PLKq1TCpsv3Y4", "DD8APgTEix4"],
    ["https://youtu.be/M-iZsW281CE?t=30", "M-iZsW281CE"],
    ["https://m.youtube.com/shorts/UBZs0-gUZsU", "UBZs0-gUZsU"],
    ["Ro_MScTDfU4", "Ro_MScTDfU4"],
  ])("%s", (url, id) => expect(parseYouTubeId(url)).toBe(id));

  it("rejects non-YouTube URLs", () => {
    expect(parseYouTubeId("https://example.com/watch?v=Js05B8Z1ivE")).toBeUndefined();
    expect(parseYouTubeId("not a url")).toBeUndefined();
  });

  it("builds timestamp links", () => {
    expect(watchAtUrl("Js05B8Z1ivE", 591.8)).toBe("https://www.youtube.com/watch?v=Js05B8Z1ivE&t=591s");
  });
});

describe("time", () => {
  it("round-trips clocks", () => {
    expect(clockToSeconds("9:51")).toBe(591);
    expect(clockToSeconds("1:02:03")).toBe(3723);
    expect(secondsToClock(591)).toBe("9:51");
    expect(secondsToClock(3723)).toBe("1:02:03");
  });
});

describe("ranking", () => {
  const memory = (id: string, title: string, occurredAt: string): MemoryView =>
    ({ id, title, excerpt: "", text: title, occurredAt }) as MemoryView;

  it("tokenizes without stop words and keeps function names", () => {
    expect(tokenize("Where did I see the int() fix?")).toEqual(["see", "int", "fix"]);
  });

  it("scores keyword overlap", () => {
    expect(keywordScore("TypeError input", memory("a", "Fixing the TypeError from input()", "2026-10-10T00:00:00Z"))).toBe(1);
    expect(keywordScore("TypeError input", memory("b", "For loops", "2026-10-10T00:00:00Z"))).toBe(0);
  });

  it("decays recency to zero after 60 days", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    expect(recencyScore("2026-10-17T00:00:00Z", now)).toBe(1);
    expect(recencyScore("2026-07-01T00:00:00Z", now)).toBe(0);
  });

  it("puts vector-similar and keyword-matching memories first", () => {
    const candidates = new Map([
      ["a", { memory: memory("a", "For loops with range", "2026-10-15T00:00:00Z"), vector: 0.5 }],
      ["b", { memory: memory("b", "TypeError when adding to input", "2026-10-08T00:00:00Z"), vector: 0.8 }],
    ]);
    const ranked = rerank(candidates, "TypeError input", Date.parse("2026-10-17T00:00:00Z"));
    expect(ranked.map((r) => r.memory.id)).toEqual(["b", "a"]);
  });
});

describe("workspace cookie", () => {
  const key = "test-secret";
  const id = "ws_0123456789abcdef01234567";

  it("verifies its own signature", () => {
    expect(verify(sign(id, key), key)).toBe(id);
  });

  it("rejects tampering and other keys", () => {
    const signed = sign(id, key);
    expect(verify(signed.replace("ws_0", "ws_1"), key)).toBeUndefined();
    expect(verify(signed, "other-secret")).toBeUndefined();
    expect(verify(`${"demo-maya"}.${signed.split(".")[1]}`, key)).toBeUndefined();
    expect(verify(undefined, key)).toBeUndefined();
  });
});

describe("diversify", () => {
  it("keeps at most two results per content item", async () => {
    const { diversify } = await import("@/lib/retrieval/search");
    const r = (id: string, contentId?: string) =>
      ({ memory: { id, contentId } as MemoryView, score: 1, vector: 1, keyword: 1 });
    const out = diversify([r("a1", "a"), r("a2", "a"), r("a3", "a"), r("v1", "v"), r("s1")], 4);
    expect(out.map((x) => x.memory.id)).toEqual(["a1", "a2", "v1", "s1"]);
  });
});

describe("stripInlineIds", () => {
  it("removes bracketed memory IDs but keeps normal brackets", async () => {
    const { stripInlineIds } = await import("@/lib/agent/run");
    expect(stripInlineIds("Napanood mo ito [demo-maya__yt_UBZs0-gUZsU]. Gamitin ang list[0] [demo-maya__search__ab, demo-maya__x].")).toBe(
      "Napanood mo ito. Gamitin ang list[0].",
    );
  });
});
