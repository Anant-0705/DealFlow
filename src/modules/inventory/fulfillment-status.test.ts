import { describe, expect, it } from "vitest";
import { fulfillmentStatusForLines, orderAlreadyPlanned } from "./fulfillment-status";

const hardware = { isSubscription: false, category: { name: "Hardware" } };
const service = { isSubscription: true, category: { name: "Services" } };

function line(overrides: Partial<Parameters<typeof fulfillmentStatusForLines>[0][number]> = {}) {
  return {
    qty: 4,
    product: hardware,
    allocations: [] as Array<{ qty: number; shippedAt: Date | null }>,
    backorders: [] as Array<{ qty: number; consolidatedAt: Date | null }>,
    ...overrides,
  };
}

describe("fulfillmentStatusForLines", () => {
  it("keeps a fully reserved unshipped order planned", () => {
    expect(fulfillmentStatusForLines([line({ allocations: [{ qty: 4, shippedAt: null }] })])).toBe("PLANNED");
  });

  it("marks mixed shipped and reserved stock as partial", () => {
    expect(fulfillmentStatusForLines([
      line({ allocations: [{ qty: 2, shippedAt: new Date("2026-09-01") }, { qty: 2, shippedAt: null }] }),
    ])).toBe("PARTIAL");
  });

  it("marks open backorders as partial even with no shipments", () => {
    expect(fulfillmentStatusForLines([line({ backorders: [{ qty: 4, consolidatedAt: null }] })])).toBe("PARTIAL");
  });

  it("marks fulfilled only after every stock line has shipped", () => {
    expect(fulfillmentStatusForLines([line({ allocations: [{ qty: 4, shippedAt: new Date("2026-09-01") }] })])).toBe("FULFILLED");
  });

  it("treats service-only orders as fulfilled", () => {
    expect(fulfillmentStatusForLines([line({ product: service, allocations: [], backorders: [] })])).toBe("FULFILLED");
  });
});

describe("orderAlreadyPlanned", () => {
  it("treats reserved allocations as a plan", () => {
    expect(orderAlreadyPlanned([line({ allocations: [{ qty: 1, shippedAt: null }] })])).toBe(true);
  });

  it("treats open backorders as a plan even with no allocations", () => {
    expect(orderAlreadyPlanned([line({ backorders: [{ qty: 4, consolidatedAt: null }] })])).toBe(true);
  });

  it("allows a second accept when nothing has been planned", () => {
    expect(orderAlreadyPlanned([line()])).toBe(false);
  });
});
