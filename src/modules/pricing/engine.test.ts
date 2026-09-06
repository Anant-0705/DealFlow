import { describe, expect, it } from "vitest";
import { evaluateRevision } from "./engine";
import type { EvaluationInput, EvaluationLineInput } from "./types";

const policy = {
  tierCeilingBronzeBps: 500,
  tierCeilingSilverBps: 1000,
  tierCeilingGoldBps: 1500,
  financeLineExcessBps: 800,
  financeBlendedExcessBps: 300,
  financeExcessValuePaise: 500000,
};
const line = (overrides: Partial<EvaluationLineInput> = {}): EvaluationLineInput => ({ description: "Laptop Pro 14", categoryId: 1, categoryName: "Product", categoryCeilingBps: 1500, qty: 1, unitPricePaise: 8500000, unitCostPaise: 6800000, taxBps: 1800, lineDiscountBps: 0, ...overrides });
const run = (overrides: Partial<EvaluationInput> = {}) => evaluateRevision({ customerTier: "GOLD", policy, orderDiscountBps: 0, lines: [line()], ...overrides });

describe("evaluateRevision", () => {
  it("routes the PDF example through manager then finance", () => {
    const result = run({ lines: [line({ lineDiscountBps: 1200 }), line({ description: "Onsite Setup Service", categoryName: "Services", categoryCeilingBps: 1000, unitPricePaise: 450000, unitCostPaise: 300000, lineDiscountBps: 1800 })] });
    expect(result.requiredLevel).toBe("FINANCE");
    expect(result.reasons.join(" ")).toContain("8 pts over");
  });
  it("routes small breaches to manager and value-heavy breaches to finance", () => {
    const small = Array.from({ length: 5 }, (_, i) => line({ description: `Service ${i}`, categoryName: "Services", categoryCeilingBps: 1000, unitPricePaise: 10000, unitCostPaise: 5000, lineDiscountBps: 1200 }));
    expect(run({ lines: small }).requiredLevel).toBe("MANAGER");
    expect(run({ lines: small.map((item) => ({ ...item, unitPricePaise: 6000000 })) }).requiredLevel).toBe("FINANCE");
  });
  it("compounds line and order discounts", () => expect(run({ orderDiscountBps: 1000, lines: [line({ lineDiscountBps: 1000 })] }).lines[0].effectiveDiscountBps).toBe(1900));
  it("uses a stricter category ceiling", () => expect(run({ lines: [line({ categoryName: "Services", categoryCeilingBps: 1000, lineDiscountBps: 1200 })] }).lines[0].excessBps).toBe(200));
  it("uses a stricter customer tier ceiling", () => expect(run({ customerTier: "BRONZE", lines: [line({ lineDiscountBps: 700 })] }).lines[0].excessBps).toBe(200));
  it("does not hide a small service breach in a large hardware quote", () => expect(run({ lines: [line({ qty: 20 }), line({ description: "Setup Service", categoryName: "Services", categoryCeilingBps: 1000, unitPricePaise: 450000, lineDiscountBps: 1200 })] }).requiredLevel).toBe("MANAGER"));
  it("handles an empty revision", () => expect(run({ lines: [] }).requiredLevel).toBe("NONE"));
});
