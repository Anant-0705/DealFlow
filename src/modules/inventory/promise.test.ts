import { describe, expect, it } from "vitest";
import { allocateInventory } from "./allocate";
import { promisedDeliveryDate } from "./promise";

const warehouses = [
  { id: 1, name: "Main", shippingCostWeightPaise: 40_000, replenishmentLeadDays: 3 },
  { id: 2, name: "East", shippingCostWeightPaise: 25_000, replenishmentLeadDays: 5 },
];
const confirmedAt = new Date("2026-09-06T00:00:00Z");

describe("promisedDeliveryDate", () => {
  it("promises today when the order ships in full", () => {
    const plan = allocateInventory(
      [{ lineId: 1, productId: 10, variantId: 20, qty: 2 }],
      [{ warehouseId: 2, productId: 10, variantId: 20, onHand: 4, reserved: 0 }],
      warehouses,
    );
    expect(promisedDeliveryDate({ confirmedAt, plan, warehouses, receipts: [] }).toISOString()).toBe(confirmedAt.toISOString());
  });

  it("uses the next expected receipt that covers the backorder", () => {
    const plan = allocateInventory(
      [{ lineId: 1, productId: 10, variantId: 20, qty: 6 }],
      [
        { warehouseId: 1, productId: 10, variantId: 20, onHand: 3, reserved: 0 },
        { warehouseId: 2, productId: 10, variantId: 20, onHand: 2, reserved: 0 },
      ],
      warehouses,
    );
    const promised = promisedDeliveryDate({
      confirmedAt,
      plan,
      warehouses,
      receipts: [{ productId: 10, variantId: 20, qty: 10, expectedAt: new Date("2026-09-10T00:00:00Z") }],
    });
    expect(promised.toISOString().slice(0, 10)).toBe("2026-09-10");
  });

  it("falls back to warehouse lead days when no receipt is scheduled", () => {
    const plan = allocateInventory(
      [{ lineId: 1, productId: 10, variantId: 20, qty: 6 }],
      [
        { warehouseId: 1, productId: 10, variantId: 20, onHand: 3, reserved: 0 },
        { warehouseId: 2, productId: 10, variantId: 20, onHand: 2, reserved: 0 },
      ],
      warehouses,
    );
    const promised = promisedDeliveryDate({ confirmedAt, plan, warehouses, receipts: [] });
    expect(promised.toISOString().slice(0, 10)).toBe("2026-09-09");
  });
});
