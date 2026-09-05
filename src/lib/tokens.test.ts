import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { hashToken, newToken } from "./tokens";

describe("tokens", () => {
  it("hashes with sha256 hex", () => {
    expect(hashToken("invite-token")).toBe(createHash("sha256").update("invite-token").digest("hex"));
  });

  it("issues unique url-safe tokens", () => {
    const first = newToken();
    const second = newToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(second).not.toBe(first);
  });
});
