import { describe, expect, it } from "vitest";
import { draftSchema, draftValidationMessage, MAX_LINE_QTY } from "./schemas";

describe("quotation line quantity", () => {
  it("rejects a quantity above 10,000 with a UI message", () => {
    const parsed = draftSchema.safeParse({
      quoteId: 1,
      orderDiscountBps: 0,
      lines: [{ productId: 1, variantId: null, qty: MAX_LINE_QTY + 1, lineDiscountBps: 0 }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(draftValidationMessage(parsed.error)).toContain("10,000");
  });

  it("accepts a quantity of 10,000", () => {
    const parsed = draftSchema.safeParse({
      quoteId: 1,
      orderDiscountBps: 0,
      lines: [{ productId: 1, variantId: null, qty: MAX_LINE_QTY, lineDiscountBps: 0 }],
    });
    expect(parsed.success).toBe(true);
  });
});
