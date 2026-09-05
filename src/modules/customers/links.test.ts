import { afterEach, describe, expect, it } from "vitest";
import { appBaseUrl, customerInviteUrl, passwordResetUrl } from "./links";

const original = process.env.NEXTAUTH_URL;

afterEach(() => {
  process.env.NEXTAUTH_URL = original;
});

describe("customer links", () => {
  it("builds invite and reset urls from NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://dealflow.example/";
    expect(appBaseUrl()).toBe("https://dealflow.example");
    expect(customerInviteUrl("abc+1")).toBe("https://dealflow.example/accept-invite?token=abc%2B1");
    expect(passwordResetUrl("xyz")).toBe("https://dealflow.example/reset-password?token=xyz");
  });
});
