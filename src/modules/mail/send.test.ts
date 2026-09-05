import { afterEach, describe, expect, it } from "vitest";
import { isMailConfigured, mailFromAddress, mailStatus, sendMail, setMailTransportForTests } from "./send";

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM;

afterEach(() => {
  setMailTransportForTests(null);
  process.env.RESEND_API_KEY = originalKey;
  process.env.RESEND_FROM = originalFrom;
});

describe("sendMail", () => {
  it("skips sending when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendMail({ to: "buyer@acme.test", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });
    expect(result).toEqual({ delivered: false, reason: "not_configured" });
    expect(isMailConfigured()).toBe(false);
    expect(mailStatus(result)).toBe("skipped");
  });

  it("uses the injected transport in tests", async () => {
    const sent: Array<{ to: string; from: string; subject: string }> = [];
    setMailTransportForTests(async (input) => {
      sent.push({ to: input.to, from: input.from, subject: input.subject });
      return { id: "msg_1" };
    });
    process.env.RESEND_FROM = "DealFlow <noreply@example.test>";
    const result = await sendMail({ to: "buyer@acme.test", subject: "Invite", html: "<p>Invite</p>", text: "Invite" });
    expect(result).toEqual({ delivered: true, id: "msg_1" });
    expect(sent).toEqual([{ to: "buyer@acme.test", from: "DealFlow <noreply@example.test>", subject: "Invite" }]);
    expect(mailStatus(result)).toBe("sent");
  });

  it("maps provider failures", async () => {
    setMailTransportForTests(async () => {
      throw new Error("Resend rejected the from address");
    });
    const result = await sendMail({ to: "buyer@acme.test", subject: "Invite", html: "<p>Invite</p>", text: "Invite" });
    expect(result).toEqual({ delivered: false, reason: "provider", message: "Resend rejected the from address" });
    expect(mailStatus(result)).toBe("failed");
  });

  it("defaults the from address", () => {
    delete process.env.RESEND_FROM;
    expect(mailFromAddress()).toBe("DealFlow <onboarding@resend.dev>");
  });
});
