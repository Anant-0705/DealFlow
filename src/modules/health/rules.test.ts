import { describe, expect, it } from "vitest";
import { deliverySlippage, discountAnomaly, stalled, type DiscountQuoteInput, type StalledInput } from "./rules";

const now = new Date("2026-09-10T12:00:00.000Z");
const baseStalled: StalledInput = { quoteId: 1, code: "Q-1", customer: "Acme", rep: "Ravi", ownerId: 4, approvalStatus: "NONE", customerStatus: "DRAFT", fulfillmentStatus: "NONE", lastActivityAt: now };

describe("deal health rules", () => {
  it("does not flag a deal exactly at the stale limit", () => {
    expect(stalled([{ ...baseStalled, lastActivityAt: new Date(now.getTime() - 5 * 86_400_000) }], 5, now)).toHaveLength(0);
  });

  it("flags a deal one full day over the stale limit", () => {
    expect(stalled([{ ...baseStalled, lastActivityAt: new Date(now.getTime() - 6 * 86_400_000) }], 5, now)[0]?.kind).toBe("STALLED");
  });

  it("never marks a confirmed quote as stalled", () => {
    expect(stalled([{ ...baseStalled, customerStatus: "CONFIRMED", lastActivityAt: new Date(now.getTime() - 30 * 86_400_000) }], 5, now)).toHaveLength(0);
  });

  it("uses a reliable baseline with three or more confirmed deals", () => {
    const history = [1, 2, 3].map((quoteId): DiscountQuoteInput => ({ ...baseStalled, quoteId, code: `Q-${quoteId}`, customerStatus: "CONFIRMED", subtotalPaise: 100_000, discountPaise: 10_000 }));
    const current: DiscountQuoteInput = { ...history[0], quoteId: 9, code: "Q-9", customerStatus: "DRAFT", discountPaise: 20_000 };
    expect(discountAnomaly(history, [current], 500)[0]?.insufficientHistory).toBe(false);
  });

  it("labels a baseline with fewer than three deals unreliable", () => {
    const historical: DiscountQuoteInput = { ...baseStalled, subtotalPaise: 100_000, discountPaise: 5_000, customerStatus: "CONFIRMED" };
    const current: DiscountQuoteInput = { ...historical, quoteId: 2, customerStatus: "DRAFT", discountPaise: 15_000 };
    expect(discountAnomaly([historical], [current], 500)[0]).toMatchObject({ severity: "low", insufficientHistory: true });
  });

  it("flags late and missing receipts but not an on-time receipt", () => {
    const base = { quoteId: 1, code: "Q-1", customer: "Acme", rep: "Ravi", ownerId: 4, orderCode: "SO-1", productId: 1, variantId: null, product: "Laptop", variant: null, qty: 1, promisedDeliveryDate: new Date("2026-09-10"), backorderCreatedAt: new Date("2026-09-01") };
    expect(deliverySlippage([{ ...base, receipts: [{ expectedAt: new Date("2026-09-09"), warehouse: "Main" }] }])).toHaveLength(0);
    expect(deliverySlippage([{ ...base, receipts: [{ expectedAt: new Date("2026-09-12"), warehouse: "East" }] }])[0]?.severity).toBe("medium");
    expect(deliverySlippage([{ ...base, receipts: [] }])[0]?.severity).toBe("high");
  });
});
