import { describe, expect, it } from "vitest";
import { countCoPurchases, parseDismissed, suggestOffers, withDismissed, type OfferPairing, type OfferProduct } from "./suggest";

const laptop: OfferProduct = {
  id: 1,
  name: "Laptop Pro 14",
  listPricePaise: 8_500_000,
  costPaise: 6_800_000,
  isPromoted: false,
  variants: [
    { id: 11, attributeName: "RAM", attributeValue: "16GB", extraPricePaise: 0 },
    { id: 12, attributeName: "RAM", attributeValue: "32GB", extraPricePaise: 1_500_000 },
  ],
};
const dock: OfferProduct = { id: 2, name: "Docking Station", listPricePaise: 1_200_000, costPaise: 850_000, isPromoted: true, variants: [] };
const care: OfferProduct = { id: 3, name: "Care Plan", listPricePaise: 300_000, costPaise: 120_000, isPromoted: false, variants: [] };
const mouse: OfferProduct = { id: 4, name: "Wireless Mouse", listPricePaise: 150_000, costPaise: 90_000, isPromoted: true, variants: [] };
const cheap: OfferProduct = { id: 5, name: "Low margin cable", listPricePaise: 100_000, costPaise: 95_000, isPromoted: false, variants: [] };

const pair = (productId: number, suggested: OfferProduct, kind: "UPSELL" | "CROSS_SELL", weight: number): OfferPairing => ({
  productId,
  kind,
  weight,
  suggestedProduct: suggested,
});

const run = (lines: Array<{ productId: number; variantId: number | null }>, pairings: OfferPairing[], dismissed?: unknown) =>
  suggestOffers({ lines, pairings, products: [laptop, dock, care, mouse, cheap], marginFloorBps: 2000, dismissed });

describe("suggestOffers", () => {
  it("splits laptop attachments into upsell vs cross-sell", () => {
    const result = run(
      [{ productId: 1, variantId: 11 }],
      [pair(1, dock, "CROSS_SELL", 10), pair(1, care, "UPSELL", 7), pair(1, mouse, "CROSS_SELL", 4)],
    );
    expect(result.crossSells.map((item) => item.name)).toEqual(["Docking Station", "Wireless Mouse"]);
    expect(result.upsells.some((item) => item.name === "Care Plan")).toBe(true);
    expect(result.crossSells.every((item) => item.kind === "CROSS_SELL")).toBe(true);
  });

  it("offers the next costlier variant as an upsell upgrade", () => {
    const result = run([{ productId: 1, variantId: 11 }], []);
    expect(result.upsells).toHaveLength(1);
    expect(result.upsells[0]).toMatchObject({ mode: "UPGRADE", variantId: 12, name: "Laptop Pro 14 · 32GB" });
  });

  it("does not upgrade when the line is already on the top variant", () => {
    expect(run([{ productId: 1, variantId: 12 }], []).upsells).toEqual([]);
  });

  it("hides products already on the quote", () => {
    const result = run(
      [{ productId: 1, variantId: 11 }, { productId: 2, variantId: null }],
      [pair(1, dock, "CROSS_SELL", 10)],
    );
    expect(result.crossSells).toEqual([]);
  });

  it("excludes suggestions below the margin floor", () => {
    const result = run([{ productId: 1, variantId: 11 }], [pair(1, cheap, "CROSS_SELL", 10)]);
    expect(result.crossSells).toEqual([]);
  });

  it("keeps cross-sells when an upsell is dismissed", () => {
    const result = run(
      [{ productId: 1, variantId: 12 }],
      [pair(1, dock, "CROSS_SELL", 10), pair(1, care, "UPSELL", 7)],
      { upsell: [3], crossSell: [], upgrades: [] },
    );
    expect(result.upsells.map((item) => item.productId)).not.toContain(3);
    expect(result.crossSells.map((item) => item.productId)).toContain(2);
  });

  it("returns nothing for an empty quote", () => {
    expect(run([], [pair(1, dock, "CROSS_SELL", 10)])).toEqual({ upsells: [], crossSells: [] });
  });

  it("reads a legacy dismissed array as upsell ids", () => {
    expect(parseDismissed([3, 9])).toEqual({ upsell: [3, 9], crossSell: [], upgrades: [] });
  });

  it("records dismissals per kind", () => {
    const current = { upsell: [], crossSell: [], upgrades: [] };
    expect(withDismissed(current, { kind: "CROSS_SELL", mode: "ADD", productId: 2 }).crossSell).toEqual([2]);
    expect(withDismissed(current, { kind: "UPSELL", mode: "UPGRADE", productId: 1, variantId: 12 }).upgrades).toEqual([12]);
  });

  it("counts confirmed deals that contain both products", () => {
    const counts = countCoPurchases(
      [{ productId: 1, suggestedProductId: 2 }, { productId: 1, suggestedProductId: 3 }],
      [
        { dealId: 10, productId: 1 }, { dealId: 10, productId: 2 },
        { dealId: 11, productId: 1 }, { dealId: 11, productId: 2 }, { dealId: 11, productId: 3 },
        { dealId: 12, productId: 1 },
      ],
    );
    expect(counts["1:2"]).toBe(2);
    expect(counts["1:3"]).toBe(1);
  });

  it("ranks a pairing higher when it has more co-purchases", () => {
    const result = run(
      [{ productId: 1, variantId: 12 }],
      [
        { productId: 1, kind: "CROSS_SELL", weight: 4, coPurchaseCount: 9, suggestedProduct: mouse },
        { productId: 1, kind: "CROSS_SELL", weight: 4, coPurchaseCount: 0, suggestedProduct: { ...dock, isPromoted: false } },
      ],
    );
    expect(result.crossSells[0].name).toBe("Wireless Mouse");
    expect(result.crossSells[0].reasons.join(" ")).toContain("9 confirmed deals");
  });
});
