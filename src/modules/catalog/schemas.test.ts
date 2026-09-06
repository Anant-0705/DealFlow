import { describe, expect, it } from "vitest";
import { MAX_OPENING_QTY, productSchema } from "./schemas";

const baseProduct = {
  name: "Task chair",
  sku: "CHAIR-1",
  categoryId: "1",
  unit: "each",
  taxPercent: "18",
  listPriceRupees: "12000",
  costRupees: "8000",
  description: "Office chair",
  warehouseId: "1",
  openingQty: "0",
};

describe("opening stock", () => {
  it("accepts zero and the maximum", () => {
    expect(productSchema.parse({ ...baseProduct, openingQty: "0" }).openingQty).toBe(0);
    expect(productSchema.parse({ ...baseProduct, openingQty: String(MAX_OPENING_QTY) }).openingQty).toBe(MAX_OPENING_QTY);
  });

  it("rejects a value above one million without throwing", () => {
    const parsed = productSchema.safeParse({ ...baseProduct, openingQty: "1000001" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.openingQty?.[0]).toMatch(/cannot exceed/);
  });

  it("rejects exponential and oversized digit strings without throwing", () => {
    for (const openingQty of ["1e21", "99999999999999999999", "-4", "12.5", "abc"]) {
      const parsed = productSchema.safeParse({ ...baseProduct, openingQty });
      expect(parsed.success, openingQty).toBe(false);
    }
  });
});
