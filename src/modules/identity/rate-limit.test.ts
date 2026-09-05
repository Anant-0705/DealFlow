import { afterEach, describe, expect, it } from "vitest";
import { consumeLoginAttempt, consumeMailAttempt, resetRateLimitsForTests } from "./rate-limit";

afterEach(() => {
  resetRateLimitsForTests();
});

describe("rate limits", () => {
  it("allows a burst of login attempts then blocks", () => {
    for (let i = 0; i < 8; i++) expect(consumeLoginAttempt("buyer@acme.test").ok).toBe(true);
    expect(consumeLoginAttempt("buyer@acme.test").ok).toBe(false);
    expect(consumeLoginAttempt("other@acme.test").ok).toBe(true);
  });

  it("limits password-reset mail separately from login", () => {
    for (let i = 0; i < 5; i++) expect(consumeMailAttempt("buyer@acme.test").ok).toBe(true);
    expect(consumeMailAttempt("buyer@acme.test").ok).toBe(false);
    expect(consumeLoginAttempt("buyer@acme.test").ok).toBe(true);
  });
});
