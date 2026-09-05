import { describe, expect, it } from "vitest";
import { replenishmentNeed } from "./replenish";

const row = {
  warehouseId: 1,
  productId: 10,
  variantId: 20,
  onHand: 3,
  reserved: 3,
  reorderPoint: 2,
  reorderQty: 10,
  maxOnHand: 20,
  warehouse: { name: "Main", replenishmentLeadDays: 3 },
  product: { name: "Laptop Pro 14" },
  variant: { attributeValue: "16GB" },
};

describe("replenishmentNeed", () => {
  it("suggests a receipt when available is at or below the reorder point", () => {
    const need = replenishmentNeed(row, new Date("2026-09-06T00:00:00Z"));
    expect(need?.qty).toBe(10);
    expect(need?.expectedAt.toISOString().slice(0, 10)).toBe("2026-09-09");
  });

  it("does not suggest when stock is healthy", () => {
    expect(replenishmentNeed({ ...row, reserved: 0 })).toBeNull();
  });

  it("caps the suggestion at max on-hand", () => {
    expect(replenishmentNeed({ ...row, maxOnHand: 4, reorderQty: 10 })?.qty).toBe(4);
  });

  it("ignores rows without replenishment rules", () => {
    expect(replenishmentNeed({ ...row, reorderPoint: 0, reorderQty: 0 })).toBeNull();
  });
});
