import { describe, expect, it } from "vitest";
import { sameOrigin } from "@/lib/auth";

const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/auth/session", { method: "POST", headers });

describe("sameOrigin", () => {
  it("allows same-site and origin-less requests", () => {
    expect(sameOrigin(req({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
    expect(sameOrigin(req({ host: "localhost:3000" }))).toBe(true);
  });

  it("rejects cross-site and malformed origins", () => {
    expect(sameOrigin(req({ host: "localhost:3000", origin: "https://evil.example" }))).toBe(false);
    expect(sameOrigin(req({ host: "localhost:3000", origin: "not a url" }))).toBe(false);
  });
});
