import { describe, expect, it } from "vitest";
import { allocateInventory } from "./allocate";

const warehouses = [
  { id: 1, name: "Main", shippingCostWeightPaise: 40_000 },
  { id: 2, name: "East", shippingCostWeightPaise: 25_000 },
];
const request = { lineId: 1, productId: 10, variantId: 20, description: "Laptop", variantLabel: "16GB", qty: 6 };
const stock = (main: number, east: number) => [
  { warehouseId: 1, productId: 10, variantId: 20, onHand: main, reserved: 0 },
  { warehouseId: 2, productId: 10, variantId: 20, onHand: east, reserved: 0 },
];

describe("allocateInventory", () => {
  it("splits 3 + 2 and backorders 1", () => {
    const plan = allocateInventory([request], stock(3, 2), warehouses);
    expect(plan.lines[0].allocations.map((row) => row.qty)).toEqual([3, 2]);
    expect(plan.lines[0].backorderQty).toBe(1);
  });
  it("prefers one shipment", () => expect(allocateInventory([{ ...request, qty: 4 }], stock(3, 4), warehouses).lines[0].allocations).toEqual([{ warehouseId: 2, warehouseName: "East", qty: 4 }]));
  it("uses lower cost when shipment counts tie", () => expect(allocateInventory([{ ...request, qty: 2 }], stock(3, 3), warehouses).lines[0].allocations[0].warehouseId).toBe(2));
  it("backorders everything with no stock", () => expect(allocateInventory([request], stock(0, 0), warehouses).lines[0].backorderQty).toBe(6));
  it("skips non-stock lines", () => expect(allocateInventory([{ ...request, requiresStock: false }], stock(3, 2), warehouses).lines[0].backorderQty).toBe(0));
  it("counts a shared warehouse once across lines", () => expect(allocateInventory([request, { ...request, lineId: 2, productId: 11, qty: 1 }], [...stock(6, 0), { warehouseId: 1, productId: 11, onHand: 1, reserved: 0 }], warehouses).totalShipments).toBe(1));
  it("minimizes shipments for the whole order, not each line", () => {
    const plan = allocateInventory(
      [
        { lineId: 1, productId: 10, variantId: 20, description: "Laptop", qty: 1 },
        { lineId: 2, productId: 11, description: "Dock", qty: 1 },
      ],
      [
        { warehouseId: 1, productId: 10, variantId: 20, onHand: 1, reserved: 0 },
        { warehouseId: 2, productId: 10, variantId: 20, onHand: 1, reserved: 0 },
        { warehouseId: 2, productId: 11, onHand: 1, reserved: 0 },
      ],
      warehouses,
    );
    expect(plan.totalShipments).toBe(1);
    expect(plan.totalEstimatedCostPaise).toBe(25_000);
    expect(plan.lines.flatMap((line) => line.allocations.map((row) => row.warehouseId))).toEqual([2, 2]);
  });
});
