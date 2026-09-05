import { describe, expect, it } from "vitest";
import { cashfreePhone, verifyCashfreeWebhook } from "./cashfree";
import { createHmac } from "node:crypto";

describe("cashfreePhone", () => {
  it("accepts a 10-digit mobile number", () => {
    expect(cashfreePhone("9898989898")).toBe("9898989898");
  });

  it("strips +91 and spaces", () => {
    expect(cashfreePhone("+91 80 2222 1001")).toBe("8022221001");
  });

  it("rejects a number that is too short", () => {
    expect(() => cashfreePhone("12345")).toThrow(/10-digit/);
  });
});

describe("verifyCashfreeWebhook", () => {
  it("accepts a matching HMAC signature", () => {
    process.env.CASHFREE_SECRET_KEY = "test-secret";
    const raw = `{"type":"PAYMENT_SUCCESS"}`;
    const timestamp = "1617695238078";
    const signature = createHmac("sha256", "test-secret").update(timestamp + raw).digest("base64");
    expect(verifyCashfreeWebhook(raw, signature, timestamp)).toBe(true);
    expect(verifyCashfreeWebhook(raw, "nope", timestamp)).toBe(false);
  });
});
