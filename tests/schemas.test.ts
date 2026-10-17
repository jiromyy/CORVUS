import { describe, expect, it } from "vitest";
import { ActivityEvent, AgentAnswer, validateCitations } from "@/lib/ai/schemas";

describe("ActivityEvent", () => {
  const valid = {
    id: "evt_1",
    workspaceId: "demo-maya",
    source: "google_search",
    sourceMode: "demo_seed",
    action: "searched",
    occurredAt: "2026-10-10T09:15:00+08:00",
    payload: { query: "why qubits lose information" },
  };

  it("accepts a well-formed event", () => {
    expect(ActivityEvent.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown sources and missing workspace", () => {
    expect(ActivityEvent.safeParse({ ...valid, source: "google_maps" }).success).toBe(false);
    expect(ActivityEvent.safeParse({ ...valid, workspaceId: "" }).success).toBe(false);
  });
});

describe("validateCitations", () => {
  it("drops citations that were not retrieved this turn", () => {
    const answer = AgentAnswer.parse({
      answer: "You saw it in a lecture.",
      confidence: "high",
      citations: [
        { memoryId: "mem_a", supportingClaim: "lecture moment" },
        { memoryId: "mem_invented", supportingClaim: "made up" },
      ],
      suggestedFollowUps: [],
    });
    const { answer: checked, rejected } = validateCitations(answer, new Set(["mem_a"]));
    expect(checked.citations.map((c) => c.memoryId)).toEqual(["mem_a"]);
    expect(rejected.map((c) => c.memoryId)).toEqual(["mem_invented"]);
  });
});
