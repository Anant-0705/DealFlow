import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session-token";

const original = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-auth-secret-must-be-at-least-32-chars";
});

afterEach(() => {
  process.env.AUTH_SECRET = original;
});

const claims = { userId: 7, role: "REP" as const, name: "Ravi Rao", customerId: null };

describe("session tokens", () => {
  it("round-trips a valid session", () => {
    const token = createSessionToken(claims);
    expect(verifySessionToken(token)).toMatchObject(claims);
  });
  it("rejects a tampered payload", () => {
    const token = createSessionToken(claims);
    const [version, , signature] = token.split(".");
    const mutated = Buffer.from(JSON.stringify({ ...claims, role: "ADMIN", exp: Date.now() + 60_000 })).toString("base64url");
    expect(verifySessionToken(`${version}.${mutated}.${signature}`)).toBeNull();
  });
  it("rejects an expired session", () => {
    const token = createSessionToken(claims, -1000);
    expect(verifySessionToken(token)).toBeNull();
  });
  it("rejects a customer token without a customer id", () => {
    const token = createSessionToken({ userId: 3, role: "CUSTOMER", name: "Buyer", customerId: null });
    expect(verifySessionToken(token)).toBeNull();
  });
  it("rejects garbage", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken()).toBeNull();
  });
});
