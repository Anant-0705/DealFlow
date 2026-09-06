import { describe, expect, it } from "vitest";
import {
  canReportUnauthorizedConfirm,
  disputePortalMessage,
  disputeTaskMessage,
  onBehalfAuditReason,
  onBehalfPortalMessage,
  parseOnBehalfMeta,
} from "./on-behalf";
import { confirmOnBehalfSchema, unauthorizedConfirmSchema } from "./schemas";

describe("confirm on behalf evidence", () => {
  it("rejects a confirm with no channel, note, or authorization", () => {
    const parsed = confirmOnBehalfSchema.safeParse({ quoteCode: "Q-1040", revisionId: "12" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a short note and an unchecked authorization", () => {
    const parsed = confirmOnBehalfSchema.safeParse({
      quoteCode: "Q-1040",
      revisionId: 12,
      channel: "PHONE",
      note: "ok",
      authorized: "yes",
    });
    expect(parsed.success).toBe(false);
    const unchecked = confirmOnBehalfSchema.safeParse({
      quoteCode: "Q-1040",
      revisionId: 12,
      channel: "PHONE",
      note: "Spoke with Anika, PO 4412",
    });
    expect(unchecked.success).toBe(false);
  });

  it("accepts a complete authorization record", () => {
    const parsed = confirmOnBehalfSchema.parse({
      quoteCode: "Q-1040",
      revisionId: "12",
      channel: "PURCHASE_ORDER",
      note: "Spoke with Anika, PO 4412",
      authorized: "yes",
    });
    expect(parsed).toMatchObject({ quoteCode: "Q-1040", revisionId: 12, channel: "PURCHASE_ORDER" });
  });

  it("stores a reason that names the channel and the note", () => {
    expect(onBehalfAuditReason("PHONE", "Spoke with Anika")).toBe("Confirmed on behalf of the customer via phone. Spoke with Anika");
    expect(onBehalfPortalMessage({ actorName: "Ravi Rao", version: 2, channel: "EMAIL", note: "Buyer mailed yes" })).toContain("Ravi Rao confirmed quotation v2");
    expect(onBehalfPortalMessage({ actorName: "Ravi Rao", version: 2, channel: "EMAIL", note: "Buyer mailed yes" })).toContain("email");
  });

  it("reads on-behalf evidence from audit meta and ignores a customer click", () => {
    expect(parseOnBehalfMeta({ onBehalf: true, channel: "PHONE", note: "Anika agreed" })).toEqual({ onBehalf: true, channel: "PHONE", note: "Anika agreed" });
    expect(parseOnBehalfMeta({ revisionId: 3, onBehalf: false })).toEqual({ onBehalf: false, channel: null, note: null });
    expect(parseOnBehalfMeta(null).onBehalf).toBe(false);
  });

  it("lets the customer report once, only after an on-behalf confirm", () => {
    expect(canReportUnauthorizedConfirm({ customerStatus: "CONFIRMED", onBehalf: true, alreadyReported: false })).toBe(true);
    expect(canReportUnauthorizedConfirm({ customerStatus: "CONFIRMED", onBehalf: false, alreadyReported: false })).toBe(false);
    expect(canReportUnauthorizedConfirm({ customerStatus: "CONFIRMED", onBehalf: true, alreadyReported: true })).toBe(false);
    expect(canReportUnauthorizedConfirm({ customerStatus: "SENT", onBehalf: true, alreadyReported: false })).toBe(false);
  });

  it("requires a dispute note", () => {
    expect(unauthorizedConfirmSchema.safeParse({ quoteCode: "Q-1040", note: "no" }).success).toBe(false);
    expect(unauthorizedConfirmSchema.parse({ quoteCode: "Q-1040", note: "I never agreed to this version." }).note).toContain("never agreed");
    expect(disputePortalMessage("I never agreed")).toContain("I did not authorize this confirmation");
    expect(disputeTaskMessage({ customerName: "Acme Corp", quoteCode: "Q-1040", note: "I never agreed" })).toContain("Do not reserve or ship");
  });
});
